// Sin Postgres real a mano en local, se usa pg-mem (motor compatible con
// Postgres en memoria) para confirmar que el SQL que genera Knex para
// nuestro schema y nuestras queries es valido en el dialecto 'pg', no solo
// en SQLite. En CI, postgres-real.test.js repite el escenario contra un Postgres de verdad;
// este atrapa regresiones de dialecto en cualquier `npm test` local.
import { vi, describe, it, beforeAll } from 'vitest';

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

import { migrate } from '../db/migrate.js';
import { ejecutarEscenarioBalances } from './escenario-balances.js';

describe('dialecto Postgres via pg-mem', () => {
  beforeAll(async () => {
    await migrate();
  });

  it('crea el schema y reproduce el mismo escenario de balances que en SQLite', async () => {
    await ejecutarEscenarioBalances();
  });
});
