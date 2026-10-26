import jwt from 'jsonwebtoken';
import { obtenerUsuarioPorId } from '../services/auth.service.js';

export async function autenticar(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token no proporcionado' });
  }

  const token = header.slice('Bearer '.length);
  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Token invalido o expirado' });
  }

  // El token es sin estado: se comprueba que la cuenta siga existiendo con ese email,
  // para que una cuenta eliminada (o anonimizada) no pueda seguir usando su token.
  const usuario = await obtenerUsuarioPorId(payload.id);
  if (!usuario || usuario.email !== payload.email) {
    return res.status(401).json({ error: 'Token invalido o expirado' });
  }
  req.usuario = payload;
  next();
}
