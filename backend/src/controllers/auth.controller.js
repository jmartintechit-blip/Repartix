import { registroSchema, loginSchema } from '../validators/auth.validators.js';
import * as authService from '../services/auth.service.js';

export async function registro(req, res) {
  const parsed = registroSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos invalidos', detalles: parsed.error.flatten().fieldErrors });
  }
  const { nombre, email, password } = parsed.data;

  if (await authService.obtenerUsuarioPorEmail(email)) {
    return res.status(409).json({ error: 'Ya existe una cuenta con ese email' });
  }

  const usuario = await authService.crearUsuario({ nombre, email, password });
  const token = authService.generarToken(usuario);
  res.status(201).json({ usuario, token });
}

export async function login(req, res) {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos invalidos', detalles: parsed.error.flatten().fieldErrors });
  }
  const { email, password } = parsed.data;

  const usuarioConHash = await authService.obtenerUsuarioPorEmail(email);
  if (!usuarioConHash || !authService.verificarPassword(password, usuarioConHash.password_hash)) {
    return res.status(401).json({ error: 'Credenciales invalidas' });
  }

  const usuario = await authService.obtenerUsuarioPublicoPorId(usuarioConHash.id);
  const token = authService.generarToken(usuario);
  res.json({ usuario, token });
}

export async function me(req, res) {
  const usuario = await authService.obtenerUsuarioPublicoPorId(req.usuario.id);
  if (!usuario) {
    return res.status(404).json({ error: 'Usuario no encontrado' });
  }
  res.json({ usuario });
}
