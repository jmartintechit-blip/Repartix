const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api';

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data ?? {};
    this.detalles = this.data.detalles;
  }
}

export async function apiFetch(path, { method = 'GET', body, token } = {}) {
  const esFormData = body instanceof FormData;
  const headers = {};
  if (!esFormData) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : esFormData ? body : JSON.stringify(body),
    });
  } catch {
    throw new ApiError('No se pudo conectar con el servidor', 0);
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    // respuestas sin cuerpo (204, etc.)
  }

  if (!res.ok) {
    throw new ApiError(data?.error ?? 'Error inesperado', res.status, data);
  }

  return data;
}
