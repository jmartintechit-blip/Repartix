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
