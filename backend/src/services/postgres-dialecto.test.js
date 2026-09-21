// Sin Postgres real a mano en CI/local, se usa pg-mem (motor compatible con
// Postgres en memoria) para confirmar que el SQL que genera Knex para
// nuestro schema y nuestras queries es valido en el dialecto 'pg', no solo
// en SQLite. No sustituye probar contra un Postgres real antes de desplegar,
// pero atrapa cualquier regresion de dialecto en cada `npm test`.
import { vi, describe, it, expect, beforeAll } from 'vitest';

vi.mock('../db/connection.js', async () => {
  const { newDb, DataType } = await import('pg-mem');
  const memoria = newDb();
  // Knex ejecuta `select version()` al conectar para detectar el servidor;
  // pg-mem no la implementa de fabrica.
  memoria.public.registerFunction({
    name: 'version',
    returns: DataType.text,
    implementation: () => 'PostgreSQL 14.0',
  });
  const { Pool, Client } = memoria.adapters.createPg();
  const { default: knexFactory } = await import('knex');
  const db = knexFactory({ client: 'pg', connection: {}, pool: {} });
  // pg-mem sustituye el driver real 'pg' que usa Knex internamente
  db.client.driver = { Pool, Client };
  return { db, esPostgres: true };
});

import { db } from '../db/connection.js';
import { migrate } from '../db/migrate.js';
import * as authService from './auth.service.js';
import * as gruposService from './grupos.service.js';
import * as gastosService from './gastos.service.js';
import * as liquidacionesService from './liquidaciones.service.js';

describe('[verificacion temporal] dialecto Postgres via pg-mem', () => {
  beforeAll(async () => {
    await migrate();
  });

  it('crea el schema y reproduce el mismo escenario de balances que en SQLite', async () => {
    const ana = await authService.crearUsuario({ nombre: 'Ana', email: 'ana@pg.com', password: 'password123' });
    const bruno = await authService.crearUsuario({ nombre: 'Bruno', email: 'bruno@pg.com', password: 'password123' });
    const carla = await authService.crearUsuario({ nombre: 'Carla', email: 'carla@pg.com', password: 'password123' });

    const grupo = await gruposService.crearGrupo({ nombre: 'Test PG', creadorId: ana.id });
    await gruposService.unirseAGrupo({ codigo: grupo.codigo_invitacion, usuarioId: bruno.id });
    await gruposService.unirseAGrupo({ codigo: grupo.codigo_invitacion, usuarioId: carla.id });

    const gasto1 = await gastosService.crearGasto({
      grupoId: grupo.id,
      pagadoPor: ana.id,
      descripcion: 'Cena',
      montoTotal: 30,
      items: [
        { nombre_item: 'Pizza', precio: 12 },
        { nombre_item: 'Pasta', precio: 18 },
      ],
    });
    await gastosService.asignarUsuariosAItem(gasto1.items[0].id, [ana.id, bruno.id]);
    await gastosService.asignarUsuariosAItem(gasto1.items[1].id, [ana.id, bruno.id, carla.id]);

    const gasto2 = await gastosService.crearGasto({
      grupoId: grupo.id,
      pagadoPor: bruno.id,
      descripcion: 'Bar',
      montoTotal: 45,
      items: [{ nombre_item: 'Rondas', precio: 40 }],
    });
    await gastosService.dividirPartesIguales(gasto2.id, [ana.id, bruno.id, carla.id]);

    const balances = await liquidacionesService.calcularBalances(grupo.id);
    const porNombre = Object.fromEntries(balances.map((b) => [b.nombre, b.balance]));

    expect(porNombre.Ana).toBe(3);
    expect(porNombre.Bruno).toBe(18);
    expect(porNombre.Carla).toBe(-21);

    const transacciones = liquidacionesService.simplificarDeudas(balances);
    const liquidaciones = await liquidacionesService.guardarLiquidacionesCalculadas(grupo.id, transacciones);
    expect(liquidaciones).toHaveLength(2);

    // Email duplicado: confirma que el codigo de error 23505 de Postgres
    // (distinto del mensaje de texto de SQLite) se reconoce correctamente
    await expect(
      authService.crearUsuario({ nombre: 'Otra', email: 'ana@pg.com', password: 'password123' })
    ).rejects.toMatchObject({ code: '23505' });
  });
});
