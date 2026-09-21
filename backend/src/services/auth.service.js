import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { db } from '../db/connection.js';
import { ahoraSql } from '../utils/fecha.js';

const SALT_ROUNDS = 10;
const TOKEN_EXPIRATION = '7d';

export function obtenerUsuarioPorEmail(email) {
  return db('usuarios').where({ email }).first();
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
