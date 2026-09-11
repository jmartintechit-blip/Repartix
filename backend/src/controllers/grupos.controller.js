import { crearGrupoSchema, unirseGrupoSchema } from '../validators/grupos.validators.js';
import * as gruposService from '../services/grupos.service.js';

export function crear(req, res) {
  const parsed = crearGrupoSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos invalidos', detalles: parsed.error.flatten().fieldErrors });
  }
  const grupo = gruposService.crearGrupo({ nombre: parsed.data.nombre, creadorId: req.usuario.id });
  res.status(201).json({ grupo });
}

export function unirse(req, res) {
  const parsed = unirseGrupoSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos invalidos', detalles: parsed.error.flatten().fieldErrors });
  }

  const resultado = gruposService.unirseAGrupo({
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

export function listarMisGrupos(req, res) {
  const grupos = gruposService.obtenerGruposDeUsuario(req.usuario.id);
  res.json({ grupos });
}

export function detalle(req, res) {
  const grupoId = Number(req.params.id);
  if (!Number.isInteger(grupoId)) {
    return res.status(400).json({ error: 'Id de grupo invalido' });
  }

  const grupo = gruposService.obtenerGrupoPorId(grupoId);
  if (!grupo || !gruposService.esMiembro(grupoId, req.usuario.id)) {
    return res.status(404).json({ error: 'Grupo no encontrado' });
  }

  const miembros = gruposService.obtenerMiembros(grupoId);
  res.json({ grupo, miembros });
}
