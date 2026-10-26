import { apiFetch } from './client.js';

export function registrar({ nombre, email, password }) {
  return apiFetch('/auth/registro', { method: 'POST', body: { nombre, email, password } });
}

export function iniciarSesion({ email, password }) {
  return apiFetch('/auth/login', { method: 'POST', body: { email, password } });
}

export function obtenerPerfil(token) {
  return apiFetch('/auth/me', { token });
}

export function editarPerfil(token, { nombre }) {
  return apiFetch('/auth/me', { method: 'PATCH', token, body: { nombre } });
}

export function cambiarPassword(token, { password_actual, password_nueva }) {
  return apiFetch('/auth/me/password', { method: 'PUT', token, body: { password_actual, password_nueva } });
}

export function eliminarCuenta(token, { password }) {
  return apiFetch('/auth/me', { method: 'DELETE', token, body: { password } });
}
