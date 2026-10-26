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

describe('gestion de grupos', () => {
  async function grupoConDos() {
    const ana = await nuevoUsuario('Ana');
    const bruno = await nuevoUsuario('Bruno');
    const { json } = await llamar('POST', '/api/grupos', { token: ana.token, cuerpo: { nombre: 'Piso' } });
    const grupo = json.grupo;
    await llamar('POST', '/api/grupos/unirse', { token: bruno.token, cuerpo: { codigo_invitacion: grupo.codigo_invitacion } });
    return { ana, bruno, grupo };
  }

  it('solo el creador renombra, regenera el codigo y elimina; el codigo viejo deja de valer', async () => {
    const { ana, bruno, grupo } = await grupoConDos();
    const ruta = `/api/grupos/${grupo.id}`;

    expect((await llamar('PATCH', ruta, { token: bruno.token, cuerpo: { nombre: 'Mio' } })).status).toBe(403);
    expect((await llamar('POST', `${ruta}/codigo`, { token: bruno.token })).status).toBe(403);
    expect((await llamar('DELETE', ruta, { token: bruno.token })).status).toBe(403);
    expect((await llamar('PATCH', ruta, { token: ana.token, cuerpo: { nombre: '  ' } })).status).toBe(400);

    const renombrado = await llamar('PATCH', ruta, { token: ana.token, cuerpo: { nombre: 'Piso nuevo' } });
    expect(renombrado.json.grupo.nombre).toBe('Piso nuevo');

    const nuevoCodigo = await llamar('POST', `${ruta}/codigo`, { token: ana.token });
    expect(nuevoCodigo.json.grupo.codigo_invitacion).not.toBe(grupo.codigo_invitacion);
    const viejo = await llamar('POST', '/api/grupos/unirse', {
      token: (await nuevoUsuario('Carla')).token,
      cuerpo: { codigo_invitacion: grupo.codigo_invitacion },
    });
    expect(viejo.status).toBe(404);

    const borrado = await fetch(base + ruta, { method: 'DELETE', headers: { authorization: `Bearer ${ana.token}` } });
    expect(borrado.status).toBe(204);
    expect((await llamar('GET', ruta, { token: ana.token })).status).toBe(404);
  });

  it('un miembro sin actividad sale o es expulsado; el creador no puede salir', async () => {
    const { ana, bruno, grupo } = await grupoConDos();
    const miembro = (usuario) => `/api/grupos/${grupo.id}/miembros/${usuario.id}`;
    const quitar = (ruta, token) => fetch(base + ruta, { method: 'DELETE', headers: { authorization: `Bearer ${token}` } });

    expect((await llamar('DELETE', miembro(ana), { token: bruno.token })).status).toBe(403);
    expect((await llamar('DELETE', miembro(ana), { token: ana.token })).status).toBe(409);
    expect((await quitar(miembro(bruno), bruno.token)).status).toBe(204);
    expect((await llamar('GET', `/api/grupos/${grupo.id}`, { token: bruno.token })).status).toBe(404);
    expect((await llamar('DELETE', miembro(bruno), { token: ana.token })).status).toBe(404);
  });

  it('no se puede quitar a un miembro con gastos o partes asignadas', async () => {
    const { ana, bruno, grupo } = await grupoConDos();
    const gasto = await llamar('POST', `/api/grupos/${grupo.id}/gastos`, {
      token: ana.token,
      cuerpo: { descripcion: 'Cena', monto_total: 20, items: [{ nombre_item: 'Pizza', precio: 20 }] },
    });
    await llamar('POST', `/api/grupos/${grupo.id}/gastos/${gasto.json.gasto.id}/dividir-partes-iguales`, {
      token: ana.token,
      cuerpo: { usuario_ids: [bruno.id] },
    });
    const res = await llamar('DELETE', `/api/grupos/${grupo.id}/miembros/${bruno.id}`, { token: ana.token });
    expect(res.status).toBe(409);
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

describe('editar un gasto', () => {
  it('solo quien lo pago; conserva las asignaciones de los items con id y valida los datos', async () => {
    const ana = await nuevoUsuario('Ana');
    const bruno = await nuevoUsuario('Bruno');
    const { json } = await llamar('POST', '/api/grupos', { token: ana.token, cuerpo: { nombre: 'Edicion' } });
    const id = json.grupo.id;
    await llamar('POST', '/api/grupos/unirse', { token: bruno.token, cuerpo: { codigo_invitacion: json.grupo.codigo_invitacion } });

    const creado = await llamar('POST', `/api/grupos/${id}/gastos`, {
      token: ana.token,
      cuerpo: { descripcion: 'Cena', monto_total: 30, items: [{ nombre_item: 'Pizza', precio: 20 }, { nombre_item: 'Agua', precio: 10 }] },
    });
    const gasto = creado.json.gasto;
    const [pizza, agua] = gasto.items;
    await llamar('PUT', `/api/grupos/${id}/gastos/${gasto.id}/items/${pizza.id}/asignaciones`, {
      token: ana.token,
      cuerpo: { usuario_ids: [bruno.id] },
    });
    const ruta = `/api/grupos/${id}/gastos/${gasto.id}`;
    const cambio = { descripcion: 'Cena corregida', monto_total: 35, items: [{ id: pizza.id, nombre_item: 'Pizza', precio: 25 }, { nombre_item: 'Postre', precio: 10 }] };

    expect((await llamar('PUT', ruta, { token: bruno.token, cuerpo: cambio })).status).toBe(403);
    expect((await llamar('PUT', ruta, { token: ana.token, cuerpo: { ...cambio, monto_total: 5 } })).status).toBe(400);
    expect((await llamar('PUT', ruta, { token: ana.token, cuerpo: { ...cambio, items: [{ id: 99999, nombre_item: 'X', precio: 1 }] } })).status).toBe(400);

    const ok = await llamar('PUT', ruta, { token: ana.token, cuerpo: cambio });
    expect(ok.status).toBe(200);
    expect(ok.json.gasto).toMatchObject({ descripcion: 'Cena corregida', monto_total: 35 });
    const items = ok.json.gasto.items;
    expect(items.map((i) => i.nombre_item)).toEqual(['Pizza', 'Postre']);
    expect(items.find((i) => i.id === agua.id)).toBeUndefined();
    expect(items[0].precio).toBe(25);
    expect(items[0].asignados.map((a) => a.id)).toEqual([bruno.id]);
    expect(items[1].asignados).toEqual([]);
  });
});

describe('cuenta', () => {
  it('cambia el nombre, y la contraseña solo con la actual correcta', async () => {
    const ana = await nuevoUsuario('Ana');
    const nombre = await llamar('PATCH', '/api/auth/me', { token: ana.token, cuerpo: { nombre: 'Ana Maria' } });
    expect(nombre.json.usuario.nombre).toBe('Ana Maria');
    expect((await llamar('PATCH', '/api/auth/me', { token: ana.token, cuerpo: { nombre: ' ' } })).status).toBe(400);

    const cuerpo = { password_actual: 'password123', password_nueva: 'otra-clave-123' };
    const mal = await llamar('PUT', '/api/auth/me/password', { token: ana.token, cuerpo: { ...cuerpo, password_actual: 'no-es-esta' } });
    expect(mal.status).toBe(401);
    expect((await llamar('PUT', '/api/auth/me/password', { token: ana.token, cuerpo: { ...cuerpo, password_nueva: 'corta' } })).status).toBe(400);
    const res = await fetch(base + '/api/auth/me/password', {
      method: 'PUT',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${ana.token}` },
      body: JSON.stringify(cuerpo),
    });
    expect(res.status).toBe(204);
    const login = await llamar('POST', '/api/auth/login', { cuerpo: { email: ana.email, password: 'otra-clave-123' } });
    expect(login.status).toBe(200);
  });

  async function eliminar(usuario, password) {
    const res = await fetch(base + '/api/auth/me', {
      method: 'DELETE',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${usuario.token}` },
      body: JSON.stringify({ password }),
    });
    return res.status;
  }

  it('eliminar la cuenta pide la contraseña, borra grupos propios y anonimiza si hay gastos', async () => {
    const ana = await nuevoUsuario('Ana');
    const bruno = await nuevoUsuario('Bruno');
    const solo = await llamar('POST', '/api/grupos', { token: ana.token, cuerpo: { nombre: 'Solo Ana' } });
    const compartido = await llamar('POST', '/api/grupos', { token: ana.token, cuerpo: { nombre: 'Compartido' } });
    const idC = compartido.json.grupo.id;
    await llamar('POST', '/api/grupos/unirse', { token: bruno.token, cuerpo: { codigo_invitacion: compartido.json.grupo.codigo_invitacion } });
    await llamar('POST', `/api/grupos/${idC}/gastos`, { token: ana.token, cuerpo: { descripcion: 'Cena', monto_total: 20 } });

    expect(await eliminar(ana, 'no-es-esta')).toBe(401);
    expect(await eliminar(ana, 'password123')).toBe(204);

    // el token deja de valer y el email ya no sirve para entrar
    expect((await llamar('GET', '/api/auth/me', { token: ana.token })).status).toBe(401);
    expect((await llamar('POST', '/api/auth/login', { cuerpo: { email: ana.email, password: 'password123' } })).status).toBe(401);

    // grupo solo de Ana: borrado. Compartido: sigue, con Bruno de creador y Ana anonimizada
    expect((await authService.obtenerUsuarioPorId(ana.id)).nombre).toBe('Usuario eliminado');
    const detalle = await llamar('GET', `/api/grupos/${idC}`, { token: bruno.token });
    expect(detalle.json.grupo.creado_por).toBe(bruno.id);
    expect(JSON.stringify(detalle.json.miembros)).not.toContain(ana.email);
    const gastos = await llamar('GET', `/api/grupos/${idC}/gastos`, { token: bruno.token });
    expect(gastos.json.gastos).toHaveLength(1);
    expect(solo.json.grupo.id).not.toBe(idC);
    expect(await (await import('./db/connection.js')).db('grupos').where({ id: solo.json.grupo.id }).first()).toBeUndefined();
  });

  it('una cuenta sin actividad se borra del todo', async () => {
    const carla = await nuevoUsuario('Carla');
    const luis = await nuevoUsuario('Luis');
    const g = await llamar('POST', '/api/grupos', { token: luis.token, cuerpo: { nombre: 'Luis y Carla' } });
    await llamar('POST', '/api/grupos/unirse', { token: carla.token, cuerpo: { codigo_invitacion: g.json.grupo.codigo_invitacion } });
    expect(await eliminar(carla, 'password123')).toBe(204);
    expect(await authService.obtenerUsuarioPorId(carla.id)).toBeUndefined();
    const miembros = await llamar('GET', `/api/grupos/${g.json.grupo.id}`, { token: luis.token });
    expect(miembros.json.miembros).toHaveLength(1);
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
