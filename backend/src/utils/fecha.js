// Genera el mismo formato que devolvia `datetime('now')` de SQLite
// ("YYYY-MM-DD HH:MM:SS", UTC, sin zona horaria) para que el frontend
// (que ya asume ese formato) no note el cambio de motor de base de datos.
export function ahoraSql() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}
