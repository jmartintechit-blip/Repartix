import { vi, describe, it, expect, beforeAll, afterAll } from 'vitest';

// Misma estrategia que en los tests de servicios: Knex sobre SQLite en memoria
// en lugar del fichero o de Postgres. Aqui se prueba la API completa por HTTP.
vi.mock('./db/connection.js', async () => {
  const { default: knexFactory } = await import('knex');
  const db = knexFactory({
    client: 'better-sqlite3',
    connection: { filename: ':memory:' },
    useNullAsDefault: true,
    pool: {
      afterCreate: (conn, done) => {
        conn.pragma('foreign_keys = ON');
        done(null, conn);
      },
    },
  });
  return { db, esPostgres: false };
});

process.env.JWT_SECRET = 'secreto-solo-para-tests';

const { default: app } = await import('./app.js');
const { migrate } = await import('./db/migrate.js');
const authService = await import('./services/auth.service.js');

let servidor;
let base;

beforeAll(async () => {
  await migrate();
  await new Promise((resolve) => {
    servidor = app.listen(0, resolve);
  });
  base = `http://127.0.0.1:${servidor.address().port}`;
});

afterAll(() => new Promise((resolve) => servidor.close(resolve)));

async function llamar(metodo, ruta, { token, cuerpo, crudo } = {}) {
  const res = await fetch(base + ruta, {
    method: metodo,
    headers: {
      ...(cuerpo !== undefined || crudo !== undefined ? { 'content-type': 'application/json' } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: crudo ?? (cuerpo === undefined ? undefined : JSON.stringify(cuerpo)),
  });
  return { status: res.status, json: await res.json() };
}

let contador = 0;
// Se crea por servicio y no por HTTP para no gastar el cupo del limitador de auth.
async function nuevoUsuario(nombre) {
  contador += 1;
  const email = `${nombre.toLowerCase()}${contador}@test.com`;
  const usuario = await authService.crearUsuario({ nombre, email, password: 'password123' });
  return { id: usuario.id, email, token: authService.generarToken(usuario) };
}

describe('autenticacion', () => {
  it('el registro devuelve usuario y token, sin exponer el hash de la contrasena', async () => {
    const { status, json } = await llamar('POST', '/api/auth/registro', {
      cuerpo: { nombre: 'Ana', email: 'ana-registro@test.com', password: 'password123' },
    });
    expect(status).toBe(201);
    expect(json.token).toEqual(expect.any(String));
    expect(json.usuario).toMatchObject({ nombre: 'Ana', email: 'ana-registro@test.com' });
    expect(JSON.stringify(json)).not.toContain('password');
  });

  it('rechaza un email repetido con 409 y datos invalidos con 400', async () => {
    await llamar('POST', '/api/auth/registro', {
      cuerpo: { nombre: 'Rep', email: 'repetido@test.com', password: 'password123' },
    });
    const repetido = await llamar('POST', '/api/auth/registro', {
      cuerpo: { nombre: 'Rep', email: 'repetido@test.com', password: 'password123' },
    });
    expect(repetido.status).toBe(409);

    const invalido = await llamar('POST', '/api/auth/registro', {
      cuerpo: { nombre: '', email: 'no-es-un-email', password: '1' },
    });
    expect(invalido.status).toBe(400);
  });

  it('login correcto, y el mismo error 401 para contrasena o email equivocados', async () => {
    const u = await nuevoUsuario('Login');
    const ok = await llamar('POST', '/api/auth/login', { cuerpo: { email: u.email, password: 'password123' } });
    expect(ok.status).toBe(200);
    expect(ok.json.token).toEqual(expect.any(String));

    const mala = await llamar('POST', '/api/auth/login', { cuerpo: { email: u.email, password: 'otra-cosa-1' } });
    const inexistente = await llamar('POST', '/api/auth/login', {
      cuerpo: { email: 'nadie@test.com', password: 'password123' },
    });
    expect(mala.status).toBe(401);
    expect(inexistente.status).toBe(401);
    expect(inexistente.json).toEqual(mala.json);
  });

  it('/me exige un token valido', async () => {
    const u = await nuevoUsuario('Yo');
    expect((await llamar('GET', '/api/auth/me', { token: u.token })).json.usuario.email).toBe(u.email);
    expect((await llamar('GET', '/api/auth/me')).status).toBe(401);
    expect((await llamar('GET', '/api/auth/me', { token: 'no.es.un.jwt' })).status).toBe(401);
  });
});

describe('errores generales', () => {
  it('ruta desconocida: 404 JSON; cuerpo JSON roto: 400', async () => {
    expect((await llamar('GET', '/api/no-existe')).status).toBe(404);
    const roto = await llamar('POST', '/api/auth/login', { crudo: '{ esto no es json' });
    expect(roto.status).toBe(400);
  });

  it('las rutas de grupos exigen autenticacion', async () => {
    expect((await llamar('GET', '/api/grupos')).status).toBe(401);
    expect((await llamar('POST', '/api/grupos', { cuerpo: { nombre: 'X' } })).status).toBe(401);
  });
});

describe('grupos y control de acceso', () => {
  it('quien no es miembro recibe 404 en todas las rutas del grupo; un miembro accede', async () => {
    const ana = await nuevoUsuario('Ana');
    const intruso = await nuevoUsuario('Intruso');
    const { json } = await llamar('POST', '/api/grupos', { token: ana.token, cuerpo: { nombre: 'Viaje' } });
    const id = json.grupo.id;

    for (const ruta of [`/api/grupos/${id}`, `/api/grupos/${id}/gastos`, `/api/grupos/${id}/balances`, `/api/grupos/${id}/liquidaciones`]) {
      expect((await llamar('GET', ruta, { token: ana.token })).status, `miembro ${ruta}`).toBe(200);
      expect((await llamar('GET', ruta, { token: intruso.token })).status, `intruso ${ruta}`).toBe(404);
    }
    const crear = await llamar('POST', `/api/grupos/${id}/gastos`, {
      token: intruso.token,
      cuerpo: { descripcion: 'Colado', monto_total: 10 },
    });
    expect(crear.status).toBe(404);
  });

  it('unirse con un codigo inexistente da 404; con el correcto, 200', async () => {
    const ana = await nuevoUsuario('Ana');
    const bruno = await nuevoUsuario('Bruno');
    const { json } = await llamar('POST', '/api/grupos', { token: ana.token, cuerpo: { nombre: 'Cena' } });

    const mal = await llamar('POST', '/api/grupos/unirse', { token: bruno.token, cuerpo: { codigo_invitacion: 'ZZZZZZ' } });
    expect(mal.status).toBe(404);
    const bien = await llamar('POST', '/api/grupos/unirse', {
      token: bruno.token,
      cuerpo: { codigo_invitacion: json.grupo.codigo_invitacion },
    });
    expect(bien.status).toBe(200);
  });
});

describe('gastos y liquidaciones', () => {
  it('flujo completo: gasto, reparto, balances, liquidacion y permisos de pago', async () => {
    const ana = await nuevoUsuario('Ana');
    const bruno = await nuevoUsuario('Bruno');
    const eva = await nuevoUsuario('Eva');
    const { json: g } = await llamar('POST', '/api/grupos', { token: ana.token, cuerpo: { nombre: 'Finde' } });
    const id = g.grupo.id;
    for (const u of [bruno, eva]) {
      await llamar('POST', '/api/grupos/unirse', { token: u.token, cuerpo: { codigo_invitacion: g.grupo.codigo_invitacion } });
    }

    const gasto = await llamar('POST', `/api/grupos/${id}/gastos`, {
      token: ana.token,
      cuerpo: { descripcion: 'Cena', monto_total: 30, items: [{ nombre_item: 'Menu', precio: 30 }] },
    });
    expect(gasto.status).toBe(201);
    const gastoId = gasto.json.gasto.id;

    const reparto = await llamar('POST', `/api/grupos/${id}/gastos/${gastoId}/dividir-partes-iguales`, {
      token: ana.token,
      cuerpo: { usuario_ids: [ana.id, bruno.id] },
    });
    expect(reparto.status).toBe(200);

    const balances = await llamar('GET', `/api/grupos/${id}/balances`, { token: ana.token });
    const porNombre = Object.fromEntries(balances.json.balances.map((b) => [b.nombre, b.balance]));
    expect(porNombre.Ana).toBe(15);
    expect(porNombre.Bruno).toBe(-15);

    const calculo = await llamar('POST', `/api/grupos/${id}/liquidaciones/calcular`, { token: ana.token });
    expect(calculo.status).toBe(201);
    const liquidacionId = calculo.json.liquidaciones[0].id;
    const ruta = `/api/grupos/${id}/liquidaciones/${liquidacionId}/pagar`;

    expect((await llamar('PATCH', ruta, { token: eva.token })).status).toBe(403);
    expect((await llamar('PATCH', ruta, { token: bruno.token })).status).toBe(200);
    expect((await llamar('PATCH', ruta, { token: bruno.token })).status).toBe(409);
  });

  it('valida el cuerpo del gasto', async () => {
    const ana = await nuevoUsuario('Ana');
    const { json: g } = await llamar('POST', '/api/grupos', { token: ana.token, cuerpo: { nombre: 'Val' } });
    const res = await llamar('POST', `/api/grupos/${g.grupo.id}/gastos`, {
      token: ana.token,
      cuerpo: { descripcion: 'Negativo', monto_total: -5 },
    });
    expect(res.status).toBe(400);
  });
});

describe('cabeceras de seguridad', () => {
  it('la API envia cabeceras de helmet', async () => {
    const res = await fetch(`${base}/api/health`);
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(res.headers.get('x-powered-by')).toBeNull();
  });
});

describe('subida de la foto del ticket', () => {
  async function subir(token, grupoId, bytes, tipoDeclarado) {
    const formulario = new FormData();
    formulario.append('imagen', new Blob([bytes], { type: tipoDeclarado }), 'ticket');
    const res = await fetch(`${base}/api/grupos/${grupoId}/gastos/analizar-ticket`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}` },
      body: formulario,
    });
    return { status: res.status, json: await res.json() };
  }

  it('rechaza con 400 un fichero que declara ser PNG pero no lo es', async () => {
    const ana = await nuevoUsuario('Ana');
    const { json: g } = await llamar('POST', '/api/grupos', { token: ana.token, cuerpo: { nombre: 'Foto' } });
    const falso = await subir(ana.token, g.grupo.id, '<script>alert(1)</script>', 'image/png');
    expect(falso.status).toBe(400);
    expect(falso.json.error).toMatch(/no es una imagen/);
  });

  it('una imagen real pasa la validacion y, sin claves de IA, responde 200 con avisos', async () => {
    const ana = await nuevoUsuario('Ana');
    const { json: g } = await llamar('POST', '/api/grupos', { token: ana.token, cuerpo: { nombre: 'Foto2' } });
    const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(32)]);
    const ok = await subir(ana.token, g.grupo.id, png, 'image/png');
    expect(ok.status).toBe(200);
    expect(ok.json.avisos.length).toBeGreaterThan(0);
  });
});
