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
        .insert({ nombre, codigo_invitacion: codigo, fecha_creacion: ahoraSql(), creado_por: creadorId })
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

export async function renombrarGrupo(grupoId, nombre) {
  await db('grupos').where({ id: grupoId }).update({ nombre });
  return obtenerGrupoPorId(grupoId);
}

export async function regenerarCodigo(grupoId) {
  for (let intento = 0; intento < MAX_INTENTOS; intento++) {
    try {
      await db('grupos').where({ id: grupoId }).update({ codigo_invitacion: generarCodigo() });
      return obtenerGrupoPorId(grupoId);
    } catch (err) {
      if (esErrorDeDuplicado(err)) continue;
      throw err;
    }
  }
  throw new Error('No se pudo generar un codigo de invitacion unico, intentalo de nuevo');
}

// Un miembro con gastos pagados, partes asignadas o liquidaciones en el grupo
// no puede salir: sus datos quedarian apuntando a alguien que ya no es miembro
// y los balances dejarian de cuadrar.
export async function tieneActividad(grupoId, usuarioId) {
  const pagado = await db('gastos').where({ grupo_id: grupoId, pagado_por: usuarioId }).first();
  if (pagado) return true;
  const asignado = await db('item_asignacion as ia')
    .join('items_gasto as i', 'i.id', 'ia.item_id')
    .join('gastos as g', 'g.id', 'i.gasto_id')
    .where({ 'g.grupo_id': grupoId, 'ia.usuario_id': usuarioId })
    .first();
  if (asignado) return true;
  const liquidado = await db('liquidaciones')
    .where({ grupo_id: grupoId })
    .andWhere((q) => q.where({ de_usuario_id: usuarioId }).orWhere({ a_usuario_id: usuarioId }))
    .first();
  return Boolean(liquidado);
}

export function quitarMiembro(grupoId, usuarioId) {
  return db('usuario_grupo').where({ grupo_id: grupoId, usuario_id: usuarioId }).delete();
}

// Gastos, articulos, asignaciones y liquidaciones se borran en cascada (FK).
// shortcut: las fotos de tickets ya subidas a Cloudinary no se borran, limpiarlas si el uso real lo pide.
export function eliminarGrupo(grupoId) {
  return db('grupos').where({ id: grupoId }).delete();
}
