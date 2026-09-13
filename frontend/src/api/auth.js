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
