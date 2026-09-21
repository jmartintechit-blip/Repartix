import * as gruposService from '../services/grupos.service.js';

export async function verificarMiembroDeGrupo(req, res, next) {
  const grupoId = Number(req.params.grupoId);
  if (!Number.isInteger(grupoId)) {
    return res.status(400).json({ error: 'Id de grupo invalido' });
  }

  const grupo = await gruposService.obtenerGrupoPorId(grupoId);
  if (!grupo || !(await gruposService.esMiembro(grupoId, req.usuario.id))) {
    return res.status(404).json({ error: 'Grupo no encontrado' });
  }

  req.grupoId = grupoId;
  req.grupo = grupo;
  next();
}
