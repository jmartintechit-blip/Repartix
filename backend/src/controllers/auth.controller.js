import {
  registroSchema,
  loginSchema,
  editarPerfilSchema,
  cambiarPasswordSchema,
  eliminarCuentaSchema,
} from '../validators/auth.validators.js';
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

function datosInvalidos(res, parsed) {
  return res.status(400).json({ error: 'Datos invalidos', detalles: parsed.error.flatten().fieldErrors });
}

export async function editarPerfil(req, res) {
  const parsed = editarPerfilSchema.safeParse(req.body);
  if (!parsed.success) return datosInvalidos(res, parsed);
  res.json({ usuario: await authService.actualizarNombre(req.usuario.id, parsed.data.nombre) });
}

// Cambiar la contraseña y borrar la cuenta piden la contraseña actual: un token robado no basta.
async function contrasenaCorrecta(req, password) {
  const usuario = await authService.obtenerUsuarioPorId(req.usuario.id);
  return authService.verificarPassword(password, usuario.password_hash);
}

export async function cambiarPassword(req, res) {
  const parsed = cambiarPasswordSchema.safeParse(req.body);
  if (!parsed.success) return datosInvalidos(res, parsed);
  if (!(await contrasenaCorrecta(req, parsed.data.password_actual))) {
    return res.status(401).json({ error: 'La contraseña actual no es correcta' });
  }
  await authService.cambiarPassword(req.usuario.id, parsed.data.password_nueva);
  res.status(204).end();
}

export async function eliminarCuenta(req, res) {
  const parsed = eliminarCuentaSchema.safeParse(req.body);
  if (!parsed.success) return datosInvalidos(res, parsed);
  if (!(await contrasenaCorrecta(req, parsed.data.password))) {
    return res.status(401).json({ error: 'La contraseña no es correcta' });
  }
  await authService.eliminarCuenta(req.usuario.id);
  res.status(204).end();
}
