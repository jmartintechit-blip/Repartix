import { describe, it, expect } from 'vitest';
import { aCentimos, aEuros, repartirEntero, repartirProporcional } from './dinero.js';

describe('repartirEntero: reparto en centimos sin fugas de redondeo', () => {
  it('la suma de las partes es exactamente igual al total cuando divide exacto', () => {
    const partes = repartirEntero(1000, 4); // 10.00 euros entre 4
    expect(partes.reduce((a, b) => a + b, 0)).toBe(1000);
    expect(partes).toEqual([250, 250, 250, 250]);
  });

  it('10 euros entre 3 personas (no divide exacto): la suma sigue cuadrando exacta', () => {
    const partes = repartirEntero(1000, 3);
    expect(partes.reduce((a, b) => a + b, 0)).toBe(1000);
    // 1000 / 3 = 333.33..., el metodo del resto mayor reparte el centimo
    // sobrante a las primeras partes en vez de perderlo o duplicarlo
    expect(partes).toEqual([334, 333, 333]);
  });

  it('un centimo entre 3 personas: dos partes se quedan a 0, no se inventa dinero', () => {
    const partes = repartirEntero(1, 3);
    expect(partes.reduce((a, b) => a + b, 0)).toBe(1);
    expect(partes).toEqual([1, 0, 0]);
  });
});

describe('repartirProporcional: prorrateo de impuestos/propina entre items', () => {
  it('reparte proporcionalmente a los pesos y la suma cuadra exacta', () => {
    // Gasto de 33.33 con propina incluida; los items "pesan" 10 y 20
    // (factor real monto_total/subtotal = 33.33/30 = 1.111...)
    const partes = repartirProporcional(3333, [10, 20]);
    expect(partes.reduce((a, b) => a + b, 0)).toBe(3333);
    expect(partes).toEqual([1111, 2222]);
  });

  it('con pesos que no reparten exacto, el metodo del resto mayor sigue cuadrando', () => {
    // 9.99 euros repartidos entre 7 items de igual precio: 999/7 no es entero
    const pesosIguales = Array(7).fill(1);
    const partes = repartirProporcional(999, pesosIguales);
    expect(partes.reduce((a, b) => a + b, 0)).toBe(999);
    // el resto (999 - 7*142 = 5) se reparte 1 centimo a las 5 primeras partes
    expect(partes).toEqual([143, 143, 143, 143, 143, 142, 142]);
  });

  it('si todos los pesos son 0 (caso raro), cae de vuelta a un reparto igual sin romperse', () => {
    const partes = repartirProporcional(100, [0, 0]);
    expect(partes.reduce((a, b) => a + b, 0)).toBe(100);
  });
});

describe('aCentimos / aEuros: conversion sin perder precision', () => {
  it('convierte euros a centimos redondeando al entero mas cercano', () => {
    expect(aCentimos(12.5)).toBe(1250);
    expect(aCentimos(0.1)).toBe(10);
  });

  it('el viaje de ida y vuelta euros -> centimos -> euros no cambia el valor', () => {
    expect(aEuros(aCentimos(45))).toBe(45);
    expect(aEuros(aCentimos(6.66))).toBe(6.66);
  });
});
