import { vi, describe, it, expect, beforeAll, beforeEach } from 'vitest';

// Los servicios importan `db` desde connection.js, que en produccion abre
// siempre el archivo SQLite real. Para probar la logica real sin tocarla y
// sin depender del archivo de desarrollo, sustituimos ese modulo por una
// base de datos SQLite en memoria solo dentro de este archivo de test.
vi.mock('../db/connection.js', async () => {
  const { default: Database } = await import('better-sqlite3');
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  return { db };
});

import { db } from '../db/connection.js';
import { migrate } from '../db/migrate.js';
import * as authService from './auth.service.js';
import * as gruposService from './grupos.service.js';
import * as gastosService from './gastos.service.js';
import * as liquidacionesService from './liquidaciones.service.js';

migrate();

function limpiarGastosYLiquidaciones() {
  db.exec(`
    DELETE FROM liquidaciones;
    DELETE FROM item_asignacion;
    DELETE FROM items_gasto;
    DELETE FROM gastos;
  `);
}

describe('calcularBalances: balance neto por persona', () => {
  let ana, bruno, carla, grupoId;

  beforeAll(() => {
    ana = authService.crearUsuario({ nombre: 'Ana', email: 'ana@test.com', password: 'password123' });
    bruno = authService.crearUsuario({ nombre: 'Bruno', email: 'bruno@test.com', password: 'password123' });
    carla = authService.crearUsuario({ nombre: 'Carla', email: 'carla@test.com', password: 'password123' });

    const grupo = gruposService.crearGrupo({ nombre: 'Finde en la playa', creadorId: ana.id });
    grupoId = grupo.id;
    gruposService.unirseAGrupo({ codigo: grupo.codigo_invitacion, usuarioId: bruno.id });
    gruposService.unirseAGrupo({ codigo: grupo.codigo_invitacion, usuarioId: carla.id });
  });

  beforeEach(limpiarGastosYLiquidaciones);

  it('reparte un gasto con propina prorrateada y el saldo de los 3 cuadra en cero', () => {
    // Ana paga 30: Pizza(12) para Ana+Bruno, Pasta(18) para los 3
    const gasto1 = gastosService.crearGasto({
      grupoId,
      pagadoPor: ana.id,
      descripcion: 'Cena',
      montoTotal: 30,
      items: [
        { nombre_item: 'Pizza', precio: 12 },
        { nombre_item: 'Pasta', precio: 18 },
      ],
    });
    gastosService.asignarUsuariosAItem(gasto1.items[0].id, [ana.id, bruno.id]);
    gastosService.asignarUsuariosAItem(gasto1.items[1].id, [ana.id, bruno.id, carla.id]);

    // Bruno paga 45 (incluye propina; el item suma 40, factor 45/40 = 1.125),
    // partes iguales entre los 3 -> cada uno asume 15 de este gasto
    const gasto2 = gastosService.crearGasto({
      grupoId,
      pagadoPor: bruno.id,
      descripcion: 'Bar',
      montoTotal: 45,
      items: [{ nombre_item: 'Rondas', precio: 40 }],
    });
    gastosService.dividirPartesIguales(gasto2.id, [ana.id, bruno.id, carla.id]);

    const balances = liquidacionesService.calcularBalances(grupoId);
    const porNombre = Object.fromEntries(balances.map((b) => [b.nombre, b.balance]));

    expect(porNombre.Ana).toBe(3);
    expect(porNombre.Bruno).toBe(18);
    expect(porNombre.Carla).toBe(-21);
    expect(balances.reduce((acc, b) => acc + b.balance, 0)).toBe(0);
  });

  it('10 euros repartidos entre 3 (no divide exacto): el saldo sigue cuadrando en cero', () => {
    const gasto = gastosService.crearGasto({
      grupoId,
      pagadoPor: ana.id,
      descripcion: 'Taxi',
      montoTotal: 10,
    });
    gastosService.dividirPartesIguales(gasto.id, [ana.id, bruno.id, carla.id]);

    const balances = liquidacionesService.calcularBalances(grupoId);
    const porNombre = Object.fromEntries(balances.map((b) => [b.nombre, b.balance]));

    expect(porNombre.Ana).toBe(6.66);
    expect(porNombre.Bruno).toBe(-3.33);
    expect(porNombre.Carla).toBe(-3.33);
    expect(balances.reduce((acc, b) => acc + b.balance, 0)).toBe(0);
  });

  it('un item sin nadie asignado se reporta explicitamente en vez de calcular un balance a medias', () => {
    gastosService.crearGasto({
      grupoId,
      pagadoPor: ana.id,
      descripcion: 'Compra',
      montoTotal: 20,
      items: [{ nombre_item: 'Varios', precio: 20 }],
    });

    const pendientes = liquidacionesService.obtenerItemsSinAsignar(grupoId);
    expect(pendientes).toHaveLength(1);
    expect(pendientes[0].nombre_item).toBe('Varios');
  });
});

describe('simplificarDeudas: el numero de transferencias es el minimo posible', () => {
  it('A debe a B y B debe a C se simplifica a A paga directamente a C', () => {
    // Balance neto ya refleja que B recibio 10 y los debia 10: su saldo neto es 0
    const balances = [
      { usuario_id: 1, nombre: 'A', balance: -10 },
      { usuario_id: 2, nombre: 'B', balance: 0 },
      { usuario_id: 3, nombre: 'C', balance: 10 },
    ];

    const transacciones = liquidacionesService.simplificarDeudas(balances);

    expect(transacciones).toHaveLength(1);
    expect(transacciones[0]).toEqual({ de_usuario_id: 1, a_usuario_id: 3, monto: 10 });
    // B no deberia aparecer en ninguna transaccion: su deuda ya estaba saldada
    expect(transacciones.some((t) => t.de_usuario_id === 2 || t.a_usuario_id === 2)).toBe(false);
  });

  it('con 4 personas y deudas cruzadas, usa como mucho (personas con saldo - 1) transferencias', () => {
    const balances = [
      { usuario_id: 1, nombre: 'A', balance: -30 },
      { usuario_id: 2, nombre: 'B', balance: -20 },
      { usuario_id: 3, nombre: 'C', balance: 10 },
      { usuario_id: 4, nombre: 'D', balance: 40 },
    ];

    const transacciones = liquidacionesService.simplificarDeudas(balances);

    // Cota superior conocida del algoritmo greedy: nunca hacen falta mas
    // transferencias que (numero de personas con saldo distinto de cero) - 1
    expect(transacciones.length).toBeLessThanOrEqual(balances.length - 1);

    // Aplicar las transferencias debe saldar exactamente todos los saldos
    const saldoFinal = Object.fromEntries(balances.map((b) => [b.usuario_id, b.balance]));
    for (const t of transacciones) {
      saldoFinal[t.de_usuario_id] += t.monto;
      saldoFinal[t.a_usuario_id] -= t.monto;
    }
    for (const usuarioId of Object.keys(saldoFinal)) {
      expect(saldoFinal[usuarioId]).toBe(0);
    }
  });
});
