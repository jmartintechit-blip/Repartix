import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db } from './connection.js';

function createBaseSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      fecha_creacion TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS grupos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      codigo_invitacion TEXT NOT NULL UNIQUE,
      fecha_creacion TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS usuario_grupo (
      usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      grupo_id INTEGER NOT NULL REFERENCES grupos(id) ON DELETE CASCADE,
      fecha_union TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (usuario_id, grupo_id)
    );

    CREATE TABLE IF NOT EXISTS gastos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      grupo_id INTEGER NOT NULL REFERENCES grupos(id) ON DELETE CASCADE,
      pagado_por INTEGER NOT NULL REFERENCES usuarios(id),
      descripcion TEXT NOT NULL,
      monto_total REAL NOT NULL,
      fecha TEXT NOT NULL DEFAULT (datetime('now')),
      imagen_url TEXT
    );

    CREATE TABLE IF NOT EXISTS items_gasto (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      gasto_id INTEGER NOT NULL REFERENCES gastos(id) ON DELETE CASCADE,
      nombre_item TEXT NOT NULL,
      precio REAL NOT NULL,
      cantidad INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS item_asignacion (
      item_id INTEGER NOT NULL REFERENCES items_gasto(id) ON DELETE CASCADE,
      usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      PRIMARY KEY (item_id, usuario_id)
    );

    CREATE TABLE IF NOT EXISTS liquidaciones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      grupo_id INTEGER NOT NULL REFERENCES grupos(id) ON DELETE CASCADE,
      de_usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
      a_usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
      monto REAL NOT NULL,
      estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'pagado')),
      fecha TEXT NOT NULL DEFAULT (datetime('now')),
      fecha_pago TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_usuario_grupo_grupo ON usuario_grupo(grupo_id);
    CREATE INDEX IF NOT EXISTS idx_gastos_grupo ON gastos(grupo_id);
    CREATE INDEX IF NOT EXISTS idx_items_gasto_gasto ON items_gasto(gasto_id);
    CREATE INDEX IF NOT EXISTS idx_item_asignacion_usuario ON item_asignacion(usuario_id);
    CREATE INDEX IF NOT EXISTS idx_liquidaciones_grupo ON liquidaciones(grupo_id);
  `);
}

// Cambios de esquema futuros sobre tablas que ya tengan datos se añaden aquí
// como ALTER TABLE envuelto en try/catch, ignorando solo el error de
// "la columna ya existe" — así el script se puede re-ejecutar siempre
// sin perder datos ni fallar en instalaciones ya migradas.
export function migrate() {
  createBaseSchema();
}

const isMainModule = path.resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url);

if (isMainModule) {
  migrate();
  console.log('Migraciones aplicadas correctamente.');
}
