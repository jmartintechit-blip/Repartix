import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import knexFactory from 'knex';

function crearConexion() {
  const urlPostgres = process.env.DATABASE_URL;

  if (urlPostgres) {
    return knexFactory({
      client: 'pg',
      connection: urlPostgres,
      pool: { min: 0, max: 10 },
    });
  }

  // Solo en SQLite: import.meta.url no existe en el bundle CommonJS de la Function de Netlify.
  const dataDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../data');
  fs.mkdirSync(dataDir, { recursive: true });

  return knexFactory({
    client: 'better-sqlite3',
    connection: { filename: path.join(dataDir, 'repartix.sqlite') },
    useNullAsDefault: true,
    pool: {
      afterCreate: (conn, done) => {
        conn.pragma('foreign_keys = ON');
        conn.pragma('journal_mode = WAL');
        done(null, conn);
      },
    },
  });
}

// DATABASE_URL presente -> Postgres (produccion). Ausente -> SQLite local (desarrollo).
export const esPostgres = Boolean(process.env.DATABASE_URL);
export const db = crearConexion();
