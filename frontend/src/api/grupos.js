import { apiFetch } from './client.js';

export function listarGrupos(token) {
  return apiFetch('/grupos', { token });
}

export function crearGrupo(token, { nombre }) {
  return apiFetch('/grupos', { method: 'POST', token, body: { nombre } });
}

export function unirseAGrupo(token, { codigo_invitacion }) {
  return apiFetch('/grupos/unirse', { method: 'POST', token, body: { codigo_invitacion } });
}

export function obtenerGrupo(token, id) {
  return apiFetch(`/grupos/${id}`, { token });
}

export function renombrarGrupo(token, id, { nombre }) {
  return apiFetch(`/grupos/${id}`, { method: 'PATCH', token, body: { nombre } });
}

export function regenerarCodigo(token, id) {
  return apiFetch(`/grupos/${id}/codigo`, { method: 'POST', token });
}

export function eliminarGrupo(token, id) {
  return apiFetch(`/grupos/${id}`, { method: 'DELETE', token });
}

// Sirve para salir (el propio usuario) y para expulsar (el creador)
export function quitarMiembro(token, grupoId, usuarioId) {
  return apiFetch(`/grupos/${grupoId}/miembros/${usuarioId}`, { method: 'DELETE', token });
}
