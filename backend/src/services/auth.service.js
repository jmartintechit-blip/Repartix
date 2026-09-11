import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { db } from '../db/connection.js';

const SALT_ROUNDS = 10;
const TOKEN_EXPIRATION = '7d';

export function obtenerUsuarioPorEmail(email) {
  return db.prepare('SELECT * FROM usuarios WHERE email = ?').get(email);
}

export function obtenerUsuarioPublicoPorId(id) {
  return db.prepare('SELECT id, nombre, email, fecha_creacion FROM usuarios WHERE id = ?').get(id);
}

export function crearUsuario({ nombre, email, password }) {
  const passwordHash = bcrypt.hashSync(password, SALT_ROUNDS);
  const { lastInsertRowid } = db
    .prepare('INSERT INTO usuarios (nombre, email, password_hash) VALUES (?, ?, ?)')
    .run(nombre, email, passwordHash);
  return obtenerUsuarioPublicoPorId(lastInsertRowid);
}

export function verificarPassword(password, passwordHash) {
  return bcrypt.compareSync(password, passwordHash);
}

export function generarToken(usuario) {
  return jwt.sign({ id: usuario.id, email: usuario.email }, process.env.JWT_SECRET, {
    expiresIn: TOKEN_EXPIRATION,
  });
}
