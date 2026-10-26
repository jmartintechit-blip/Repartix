const formateadorMoneda = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });
const formateadorFecha = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });

export function formatearMoneda(valor) {
  return formateadorMoneda.format(valor);
}

export function formatearFecha(fechaSql) {
  // El backend guarda fechas SQLite en UTC ("YYYY-MM-DD HH:MM:SS"); se marca
  // explicitamente como UTC para que se muestre convertida a la hora local.
  // Una fecha sin hora (AAAA-MM-DD) se toma a mediodia UTC para que no cambie de dia al convertirla.
  const conHora = fechaSql.length === 10 ? `${fechaSql} 12:00:00` : fechaSql;
  return formateadorFecha.format(new Date(`${conHora.replace(' ', 'T')}Z`));
}
