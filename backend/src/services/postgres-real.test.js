import { describe, it } from 'vitest';

// Solo corre si TEST_DATABASE_URL apunta a un Postgres real (en CI, un
// contenedor de servicio). En local se omite: `npm test` no necesita Docker.
const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)('Postgres real (TEST_DATABASE_URL)', () => {
  it('crea el schema y reproduce el escenario de balances', async () => {
    // El test borra el schema publico: solo se permite sobre una base de pruebas.
    if (!/test/i.test(new URL(url).pathname)) {
      throw new Error('TEST_DATABASE_URL debe apuntar a una base cuyo nombre contenga "test"');
    }
    process.env.DATABASE_URL = url;
    const { db } = await import('../db/connection.js');
    try {
      await db.raw('drop schema public cascade');
      await db.raw('create schema public');
      const { migrate } = await import('../db/migrate.js');
      await migrate();
      const { ejecutarEscenarioBalances } = await import('./escenario-balances.js');
      await ejecutarEscenarioBalances();
    } finally {
      await db.destroy();
    }
  }, 60000);
});
