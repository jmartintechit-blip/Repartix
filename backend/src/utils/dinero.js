const CENTIMOS_POR_UNIDAD = 100;

export function aCentimos(valorEnEuros) {
  return Math.round(valorEnEuros * CENTIMOS_POR_UNIDAD);
}

export function aEuros(valorEnCentimos) {
  return valorEnCentimos / CENTIMOS_POR_UNIDAD;
}

// Reparte totalCentimos en n partes enteras que suman EXACTAMENTE totalCentimos
// (las primeras partes se llevan 1 centimo extra hasta agotar el resto de la division).
export function repartirEntero(totalCentimos, n) {
  const base = Math.floor(totalCentimos / n);
  const resto = totalCentimos - base * n;
  return Array.from({ length: n }, (_, i) => base + (i < resto ? 1 : 0));
}

// Reparte totalCentimos proporcionalmente a "pesos" (p.ej. precios de items),
// en centimos enteros que suman EXACTAMENTE totalCentimos (metodo del resto mayor,
// evita que el redondeo independiente de cada parte "pierda" o "sobre" centimos).
export function repartirProporcional(totalCentimos, pesos) {
  const sumaPesos = pesos.reduce((a, b) => a + b, 0);
  if (sumaPesos <= 0) return repartirEntero(totalCentimos, pesos.length);

  const exactos = pesos.map((p) => (totalCentimos * p) / sumaPesos);
  const bases = exactos.map(Math.floor);
  const asignado = bases.reduce((a, b) => a + b, 0);
  const restante = totalCentimos - asignado;

  const ordenPorResto = exactos.map((v, i) => ({ i, frac: v - bases[i] })).sort((a, b) => b.frac - a.frac);

  const resultado = [...bases];
  for (let k = 0; k < restante; k++) {
    resultado[ordenPorResto[k % ordenPorResto.length].i] += 1;
  }
  return resultado;
}
