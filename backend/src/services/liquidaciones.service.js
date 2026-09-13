import { db } from '../db/connection.js';
import { aCentimos, aEuros, repartirEntero, repartirProporcional } from '../utils/dinero.js';
import * as gruposService from './grupos.service.js';

export function obtenerItemsSinAsignar(grupoId) {
  return db
    .prepare(
      `SELECT g.id AS gasto_id, g.descripcion, ig.id AS item_id, ig.nombre_item
       FROM gastos g
       JOIN items_gasto ig ON ig.gasto_id = g.id
       WHERE g.grupo_id = ?
         AND NOT EXISTS (SELECT 1 FROM item_asignacion ia WHERE ia.item_id = ig.id)
       ORDER BY g.id ASC, ig.id ASC`
    )
    .all(grupoId);
}

// Balance en centimos por gasto: quien pago se anota +monto_total, y ese mismo
// monto_total (ya prorrateado con impuestos/propina incluidos) se reparte entre
// los asignados de cada item. Repartir siempre en centimos enteros exactos
// evita que la suma de "lo cobrado" y "lo repartido" diverjan por redondeo.
function calcularBalancesDesdeGastos(grupoId) {
  const balances = new Map();
  const sumar = (usuarioId, centimos) => balances.set(usuarioId, (balances.get(usuarioId) ?? 0) + centimos);

  const gastos = db.prepare('SELECT * FROM gastos WHERE grupo_id = ?').all(grupoId);

  for (const gasto of gastos) {
    const items = db.prepare('SELECT id, precio FROM items_gasto WHERE gasto_id = ?').all(gasto.id);
    const montoTotalCentimos = aCentimos(gasto.monto_total);

    sumar(gasto.pagado_por, montoTotalCentimos);

    const pesos = items.map((item) => item.precio);
    const costosItemCentimos = repartirProporcional(montoTotalCentimos, pesos);

    items.forEach((item, idx) => {
      const asignados = db
        .prepare('SELECT usuario_id FROM item_asignacion WHERE item_id = ?')
        .all(item.id)
        .map((row) => row.usuario_id);
      if (asignados.length === 0) return; // se valida antes de llegar aqui (obtenerItemsSinAsignar)

      const partes = repartirEntero(costosItemCentimos[idx], asignados.length);
      asignados.forEach((usuarioId, i) => sumar(usuarioId, -partes[i]));
    });
  }

  return balances;
}

// Una liquidacion marcada "pagado" es un pago que ya ocurrio en la vida real:
// reduce lo que el deudor debe (+) y lo que el acreedor todavia tiene pendiente de cobrar (-).
function aplicarLiquidacionesPagadas(grupoId, balances) {
  const pagadas = db
    .prepare("SELECT de_usuario_id, a_usuario_id, monto FROM liquidaciones WHERE grupo_id = ? AND estado = 'pagado'")
    .all(grupoId);

  for (const pago of pagadas) {
    const centimos = aCentimos(pago.monto);
    balances.set(pago.de_usuario_id, (balances.get(pago.de_usuario_id) ?? 0) + centimos);
    balances.set(pago.a_usuario_id, (balances.get(pago.a_usuario_id) ?? 0) - centimos);
  }
}

export function calcularBalances(grupoId) {
  const balances = calcularBalancesDesdeGastos(grupoId);
  aplicarLiquidacionesPagadas(grupoId, balances);

  return gruposService.obtenerMiembros(grupoId).map((miembro) => ({
    usuario_id: miembro.id,
    nombre: miembro.nombre,
    balance: aEuros(balances.get(miembro.id) ?? 0),
  }));
}

// Algoritmo greedy: empareja al mayor deudor con el mayor acreedor en cada paso.
// Minimiza el numero de transacciones necesarias para saldar todas las deudas
// (si A debe a B y B debe a C, se simplifica a A debe directamente a C).
export function simplificarDeudas(balancesPorUsuario) {
  const acreedores = [];
  const deudores = [];

  for (const { usuario_id, balance } of balancesPorUsuario) {
    const centimos = aCentimos(balance);
    if (centimos > 0) acreedores.push({ usuario_id, centimos });
    else if (centimos < 0) deudores.push({ usuario_id, centimos: -centimos });
  }

  acreedores.sort((a, b) => b.centimos - a.centimos);
  deudores.sort((a, b) => b.centimos - a.centimos);

  const transacciones = [];
  let i = 0;
  let j = 0;

  while (i < deudores.length && j < acreedores.length) {
    const deudor = deudores[i];
    const acreedor = acreedores[j];
    const monto = Math.min(deudor.centimos, acreedor.centimos);

    if (monto > 0) {
      transacciones.push({ de_usuario_id: deudor.usuario_id, a_usuario_id: acreedor.usuario_id, monto: aEuros(monto) });
    }

    deudor.centimos -= monto;
    acreedor.centimos -= monto;

    if (deudor.centimos === 0) i++;
    if (acreedor.centimos === 0) j++;
  }

  return transacciones;
}

export function guardarLiquidacionesCalculadas(grupoId, transacciones) {
  const transaccionDb = db.transaction(() => {
    db.prepare("DELETE FROM liquidaciones WHERE grupo_id = ? AND estado = 'pendiente'").run(grupoId);
    const insertar = db.prepare(
      "INSERT INTO liquidaciones (grupo_id, de_usuario_id, a_usuario_id, monto, estado) VALUES (?, ?, ?, ?, 'pendiente')"
    );
    for (const t of transacciones) {
      insertar.run(grupoId, t.de_usuario_id, t.a_usuario_id, t.monto);
    }
  });
  transaccionDb();
  return obtenerLiquidacionesDeGrupo(grupoId);
}

export function obtenerLiquidacionesDeGrupo(grupoId) {
  return db
    .prepare(
      `SELECT l.*, du.nombre AS de_nombre, au.nombre AS a_nombre
       FROM liquidaciones l
       JOIN usuarios du ON du.id = l.de_usuario_id
       JOIN usuarios au ON au.id = l.a_usuario_id
       WHERE l.grupo_id = ?
       ORDER BY (l.estado = 'pendiente') DESC, l.fecha DESC`
    )
    .all(grupoId);
}

export function obtenerLiquidacionPorId(id) {
  return db.prepare('SELECT * FROM liquidaciones WHERE id = ?').get(id);
}

export function marcarComoPagada(id) {
  db.prepare("UPDATE liquidaciones SET estado = 'pagado', fecha_pago = datetime('now') WHERE id = ?").run(id);
  return obtenerLiquidacionPorId(id);
}
