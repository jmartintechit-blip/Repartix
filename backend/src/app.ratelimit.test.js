import { vi, describe, it, expect, beforeAll, afterAll } from 'vitest';

vi.mock('./db/connection.js', async () => {
  const { default: knexFactory } = await import('knex');
  const db = knexFactory({ client: 'better-sqlite3', connection: { filename: ':memory:' }, useNullAsDefault: true });
  return { db, esPostgres: false };
});

process.env.JWT_SECRET = 'secreto-solo-para-tests';

const { default: app } = await import('./app.js');
const { migrate } = await import('./db/migrate.js');

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

describe('limite de intentos en login y registro', () => {
  it('responde 429 tras 20 intentos desde el mismo cliente, y solo en las rutas de auth', async () => {
    const intento = () =>
      fetch(`${base}/api/auth/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: 'x@test.com', password: 'password123' }),
      });

    for (let i = 0; i < 20; i += 1) {
      expect((await intento()).status).toBe(401);
    }
    expect((await intento()).status).toBe(429);
    expect((await fetch(`${base}/api/health`)).status).toBe(200);
  });
});
