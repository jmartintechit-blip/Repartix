import { db } from '../db/connection.js';
import { ahoraSql } from '../utils/fecha.js';

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

// SQLite (better-sqlite3) y Postgres (pg) reportan una violacion de UNIQUE
// de forma distinta: SQLite con un mensaje de texto, Postgres con el codigo
// de error estandar 23505. Hay que reconocer ambas para que el reintento de
// codigo de invitacion funcione sea cual sea el motor.
function esErrorDeDuplicado(err) {
  return err.code === '23505' || err.message.includes('UNIQUE constraint failed');
}

export function obtenerGrupoPorId(id) {
  return db('grupos').where({ id }).first();
}

export function obtenerGrupoPorCodigo(codigo) {
  return db('grupos').where({ codigo_invitacion: codigo }).first();
}

export async function esMiembro(grupoId, usuarioId) {
  const fila = await db('usuario_grupo').where({ grupo_id: grupoId, usuario_id: usuarioId }).first();
  return Boolean(fila);
}

export async function crearGrupo({ nombre, creadorId }) {
  for (let intento = 0; intento < MAX_INTENTOS; intento++) {
    const codigo = generarCodigo();
    try {
      const [{ id: grupoId }] = await db('grupos')
        .insert({ nombre, codigo_invitacion: codigo, fecha_creacion: ahoraSql() })
        .returning('id');
      await db('usuario_grupo').insert({ usuario_id: creadorId, grupo_id: grupoId, fecha_union: ahoraSql() });
      return obtenerGrupoPorId(grupoId);
    } catch (err) {
      if (esErrorDeDuplicado(err)) continue;
      throw err;
    }
  }
  throw new Error('No se pudo generar un codigo de invitacion unico, intentalo de nuevo');
}

export async function unirseAGrupo({ codigo, usuarioId }) {
  const grupo = await obtenerGrupoPorCodigo(codigo);
  if (!grupo) return { error: 'no_encontrado' };
  if (await esMiembro(grupo.id, usuarioId)) return { yaEraMiembro: true, grupo };
  await db('usuario_grupo').insert({ usuario_id: usuarioId, grupo_id: grupo.id, fecha_union: ahoraSql() });
  return { grupo };
}

export function obtenerGruposDeUsuario(usuarioId) {
  return db('grupos as g')
    .join('usuario_grupo as ug', 'ug.grupo_id', 'g.id')
    .where('ug.usuario_id', usuarioId)
    .orderBy('g.fecha_creacion', 'desc')
    .select('g.*');
}

export function obtenerMiembros(grupoId) {
  return db('usuarios as u')
    .join('usuario_grupo as ug', 'ug.usuario_id', 'u.id')
    .where('ug.grupo_id', grupoId)
    .orderBy('ug.fecha_union', 'asc')
    .select('u.id', 'u.nombre', 'u.email', 'ug.fecha_union');
}
