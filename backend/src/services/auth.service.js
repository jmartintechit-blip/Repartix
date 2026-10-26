import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { db } from '../db/connection.js';
import { ahoraSql } from '../utils/fecha.js';
import { tieneActividad } from './grupos.service.js';

const SALT_ROUNDS = 10;
const TOKEN_EXPIRATION = '7d';

export function obtenerUsuarioPorEmail(email) {
  return db('usuarios').where({ email }).first();
}

export function obtenerUsuarioPorId(id) {
  return db('usuarios').where({ id }).first();
}

export function obtenerUsuarioPublicoPorId(id) {
  return db('usuarios').select('id', 'nombre', 'email', 'fecha_creacion').where({ id }).first();
}

export async function crearUsuario({ nombre, email, password }) {
  const passwordHash = bcrypt.hashSync(password, SALT_ROUNDS);
  const [{ id }] = await db('usuarios')
    .insert({ nombre, email, password_hash: passwordHash, fecha_creacion: ahoraSql() })
    .returning('id');
  return obtenerUsuarioPublicoPorId(id);
}

export function verificarPassword(password, passwordHash) {
  return bcrypt.compareSync(password, passwordHash);
}

export function generarToken(usuario) {
  return jwt.sign({ id: usuario.id, email: usuario.email }, process.env.JWT_SECRET, {
    expiresIn: TOKEN_EXPIRATION,
  });
}

export async function actualizarNombre(id, nombre) {
  await db('usuarios').where({ id }).update({ nombre });
  return obtenerUsuarioPublicoPorId(id);
}

export function cambiarPassword(id, passwordNueva) {
  return db('usuarios').where({ id }).update({ password_hash: bcrypt.hashSync(passwordNueva, SALT_ROUNDS) });
}

// Borra los datos personales sin romper los balances de los demas:
// - grupos donde queda solo: se borran; donde era creador: pasa al miembro mas antiguo.
// - grupos donde no tiene actividad: sale. Donde la tiene (gastos, partes, liquidaciones):
//   sigue como miembro y su cuenta se anonimiza en vez de borrarse.
export async function eliminarCuenta(id) {
  await db.transaction(async (trx) => {
    const membresias = await trx('usuario_grupo').where({ usuario_id: id }).select('grupo_id');
    for (const { grupo_id: grupoId } of membresias) {
      const otros = await trx('usuario_grupo')
        .where({ grupo_id: grupoId })
        .whereNot({ usuario_id: id })
        .orderBy('fecha_union', 'asc');
      if (otros.length === 0) {
        await trx('grupos').where({ id: grupoId }).del();
        continue;
      }
      await trx('grupos').where({ id: grupoId, creado_por: id }).update({ creado_por: otros[0].usuario_id });
      if (!(await tieneActividad(grupoId, id, trx))) {
        await trx('usuario_grupo').where({ grupo_id: grupoId, usuario_id: id }).del();
      }
    }

    const siguePresente = await trx('usuario_grupo').where({ usuario_id: id }).first();
    if (!siguePresente) {
      await trx('usuarios').where({ id }).del();
    } else {
      await trx('usuarios')
        .where({ id })
        .update({ nombre: 'Usuario eliminado', email: `eliminado-${id}@deleted.invalid`, password_hash: '!' });
    }
  });
}
