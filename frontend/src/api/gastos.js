import { apiFetch } from './client.js';

export function listarGastos(token, grupoId) {
  return apiFetch(`/grupos/${grupoId}/gastos`, { token });
}

export function crearGasto(token, grupoId, datos) {
  return apiFetch(`/grupos/${grupoId}/gastos`, { method: 'POST', token, body: datos });
}

export function obtenerGasto(token, grupoId, gastoId) {
  return apiFetch(`/grupos/${grupoId}/gastos/${gastoId}`, { token });
}

export function eliminarGasto(token, grupoId, gastoId) {
  return apiFetch(`/grupos/${grupoId}/gastos/${gastoId}`, { method: 'DELETE', token });
}

export function asignarItem(token, grupoId, gastoId, itemId, usuarioIds) {
  return apiFetch(`/grupos/${grupoId}/gastos/${gastoId}/items/${itemId}/asignaciones`, {
    method: 'PUT',
    token,
    body: { usuario_ids: usuarioIds },
  });
}

export function dividirPartesIguales(token, grupoId, gastoId, usuarioIds) {
  return apiFetch(`/grupos/${grupoId}/gastos/${gastoId}/dividir-partes-iguales`, {
    method: 'POST',
    token,
    body: usuarioIds ? { usuario_ids: usuarioIds } : {},
  });
}
