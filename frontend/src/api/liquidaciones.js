import { apiFetch } from './client.js';

export function obtenerBalances(token, grupoId) {
  return apiFetch(`/grupos/${grupoId}/balances`, { token });
}

export function calcularLiquidaciones(token, grupoId) {
  return apiFetch(`/grupos/${grupoId}/liquidaciones/calcular`, { method: 'POST', token });
}

export function listarLiquidaciones(token, grupoId) {
  return apiFetch(`/grupos/${grupoId}/liquidaciones`, { token });
}

export function marcarLiquidacionPagada(token, grupoId, liquidacionId) {
  return apiFetch(`/grupos/${grupoId}/liquidaciones/${liquidacionId}/pagar`, { method: 'PATCH', token });
}
