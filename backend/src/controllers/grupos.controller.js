import { crearGrupoSchema, unirseGrupoSchema } from '../validators/grupos.validators.js';
import * as gruposService from '../services/grupos.service.js';

export async function crear(req, res) {
  const parsed = crearGrupoSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos invalidos', detalles: parsed.error.flatten().fieldErrors });
  }
  const grupo = await gruposService.crearGrupo({ nombre: parsed.data.nombre, creadorId: req.usuario.id });
  res.status(201).json({ grupo });
}

export async function unirse(req, res) {
  const parsed = unirseGrupoSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos invalidos', detalles: parsed.error.flatten().fieldErrors });
  }

  const resultado = await gruposService.unirseAGrupo({
    codigo: parsed.data.codigo_invitacion,
    usuarioId: req.usuario.id,
  });

  if (resultado.error === 'no_encontrado') {
    return res.status(404).json({ error: 'No existe ningun grupo con ese codigo de invitacion' });
  }
  if (resultado.yaEraMiembro) {
    return res.status(200).json({ grupo: resultado.grupo, mensaje: 'Ya eras miembro de este grupo' });
  }
  res.status(200).json({ grupo: resultado.grupo });
}

export async function listarMisGrupos(req, res) {
  const grupos = await gruposService.obtenerGruposDeUsuario(req.usuario.id);
  res.json({ grupos });
}

export async function detalle(req, res) {
  const grupoId = Number(req.params.id);
  if (!Number.isInteger(grupoId)) {
    return res.status(400).json({ error: 'Id de grupo invalido' });
  }

  const grupo = await gruposService.obtenerGrupoPorId(grupoId);
  if (!grupo || !(await gruposService.esMiembro(grupoId, req.usuario.id))) {
    return res.status(404).json({ error: 'Grupo no encontrado' });
  }

  const miembros = await gruposService.obtenerMiembros(grupoId);
  res.json({ grupo, miembros });
}

// verificarMiembroDeGrupo ya dejo el grupo en req.grupo; aqui solo se exige ser su creador.
function exigirCreador(req, res) {
  if (req.grupo.creado_por === req.usuario.id) return true;
  res.status(403).json({ error: 'Solo quien creo el grupo puede hacer esto' });
  return false;
}

export async function renombrar(req, res) {
  if (!exigirCreador(req, res)) return;
  const parsed = crearGrupoSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos invalidos', detalles: parsed.error.flatten().fieldErrors });
  }
  res.json({ grupo: await gruposService.renombrarGrupo(req.grupoId, parsed.data.nombre) });
}

export async function regenerarCodigo(req, res) {
  if (!exigirCreador(req, res)) return;
  res.json({ grupo: await gruposService.regenerarCodigo(req.grupoId) });
}

export async function eliminar(req, res) {
  if (!exigirCreador(req, res)) return;
  await gruposService.eliminarGrupo(req.grupoId);
  res.status(204).end();
}

// Salir (el propio usuario) y expulsar (el creador a otro) son la misma operacion.
export async function quitarMiembro(req, res) {
  const objetivoId = Number(req.params.usuarioId);
  if (!Number.isInteger(objetivoId)) {
    return res.status(400).json({ error: 'Id de usuario invalido' });
  }
  const esUnoMismo = objetivoId === req.usuario.id;
  if (!esUnoMismo && !exigirCreador(req, res)) return;

  if (!(await gruposService.esMiembro(req.grupoId, objetivoId))) {
    return res.status(404).json({ error: 'Ese usuario no es miembro del grupo' });
  }
  if (objetivoId === req.grupo.creado_por) {
    return res.status(409).json({ error: 'El creador no puede salir del grupo: eliminalo si ya no se usa' });
  }
  if (await gruposService.tieneActividad(req.grupoId, objetivoId)) {
    return res.status(409).json({
      error: 'No se puede quitar a un miembro con gastos, partes asignadas o liquidaciones en el grupo',
    });
  }
  await gruposService.quitarMiembro(req.grupoId, objetivoId);
  res.status(204).end();
}
