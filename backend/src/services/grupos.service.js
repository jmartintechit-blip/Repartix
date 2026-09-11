import { db } from '../db/connection.js';

// Sin 0/O/1/I/L para evitar confusiones al transcribir el codigo a mano
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 6;
const MAX_INTENTOS = 5;

function generarCodigo() {
  let codigo = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    codigo += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return codigo;
}

export function obtenerGrupoPorId(id) {
  return db.prepare('SELECT * FROM grupos WHERE id = ?').get(id);
}

export function obtenerGrupoPorCodigo(codigo) {
  return db.prepare('SELECT * FROM grupos WHERE codigo_invitacion = ?').get(codigo);
}

export function esMiembro(grupoId, usuarioId) {
  return !!db
    .prepare('SELECT 1 FROM usuario_grupo WHERE grupo_id = ? AND usuario_id = ?')
    .get(grupoId, usuarioId);
}

export function crearGrupo({ nombre, creadorId }) {
  for (let intento = 0; intento < MAX_INTENTOS; intento++) {
    const codigo = generarCodigo();
    try {
      const { lastInsertRowid } = db
        .prepare('INSERT INTO grupos (nombre, codigo_invitacion) VALUES (?, ?)')
        .run(nombre, codigo);
      db.prepare('INSERT INTO usuario_grupo (usuario_id, grupo_id) VALUES (?, ?)').run(creadorId, lastInsertRowid);
      return obtenerGrupoPorId(lastInsertRowid);
    } catch (err) {
      if (err.message.includes('UNIQUE constraint failed: grupos.codigo_invitacion')) continue;
      throw err;
    }
  }
  throw new Error('No se pudo generar un codigo de invitacion unico, intentalo de nuevo');
}

export function unirseAGrupo({ codigo, usuarioId }) {
  const grupo = obtenerGrupoPorCodigo(codigo);
  if (!grupo) return { error: 'no_encontrado' };
  if (esMiembro(grupo.id, usuarioId)) return { yaEraMiembro: true, grupo };
  db.prepare('INSERT INTO usuario_grupo (usuario_id, grupo_id) VALUES (?, ?)').run(usuarioId, grupo.id);
  return { grupo };
}

export function obtenerGruposDeUsuario(usuarioId) {
  return db
    .prepare(
      `SELECT g.* FROM grupos g
       JOIN usuario_grupo ug ON ug.grupo_id = g.id
       WHERE ug.usuario_id = ?
       ORDER BY g.fecha_creacion DESC`
    )
    .all(usuarioId);
}

export function obtenerMiembros(grupoId) {
  return db
    .prepare(
      `SELECT u.id, u.nombre, u.email, ug.fecha_union
       FROM usuarios u
       JOIN usuario_grupo ug ON ug.usuario_id = u.id
       WHERE ug.grupo_id = ?
       ORDER BY ug.fecha_union ASC`
    )
    .all(grupoId);
}
