import { db } from '../db/connection.js';
import { ahoraSql } from '../utils/fecha.js';
import { aCentimos, aEuros, repartirEntero, repartirProporcional } from '../utils/dinero.js';
import * as gruposService from './grupos.service.js';

export function obtenerItemsSinAsignar(grupoId) {
  return db('gastos as g')
    .join('items_gasto as ig', 'ig.gasto_id', 'g.id')
    .where('g.grupo_id', grupoId)
    .whereNotExists(function () {
      this.select(1).from('item_asignacion as ia').whereRaw('ia.item_id = ig.id');
    })
    .orderBy([{ column: 'g.id' }, { column: 'ig.id' }])
    .select('g.id as gasto_id', 'g.descripcion', 'ig.id as item_id', 'ig.nombre_item');
}

// Balance en centimos por gasto: quien pago se anota +monto_total, y ese mismo
// monto_total (ya prorrateado con impuestos/propina incluidos) se reparte entre
// los asignados de cada item. Repartir siempre en centimos enteros exactos
// evita que la suma de "lo cobrado" y "lo repartido" diverjan por redondeo.
//
// Nota: se recorre gasto a gasto e item a item con await secuencial en vez de
// paralelizar con Promise.all — mismo orden y misma logica que la version
// sincrona original, solo cambia el mecanismo de E/S (async en vez de sync).
async function calcularBalancesDesdeGastos(grupoId) {
  const balances = new Map();
  const sumar = (usuarioId, centimos) => balances.set(usuarioId, (balances.get(usuarioId) ?? 0) + centimos);

  const gastos = await db('gastos').where({ grupo_id: grupoId });

  for (const gasto of gastos) {
    const items = await db('items_gasto').select('id', 'precio').where({ gasto_id: gasto.id });
    const montoTotalCentimos = aCentimos(gasto.monto_total);

    sumar(gasto.pagado_por, montoTotalCentimos);

    const pesos = items.map((item) => item.precio);
    const costosItemCentimos = repartirProporcional(montoTotalCentimos, pesos);

    for (let idx = 0; idx < items.length; idx++) {
      const item = items[idx];
      const asignados = (await db('item_asignacion').select('usuario_id').where({ item_id: item.id })).map(
        (row) => row.usuario_id
      );
      if (asignados.length === 0) continue; // se valida antes de llegar aqui (obtenerItemsSinAsignar)

      const partes = repartirEntero(costosItemCentimos[idx], asignados.length);
      asignados.forEach((usuarioId, i) => sumar(usuarioId, -partes[i]));
    }
  }

  return balances;
}

// Una liquidacion marcada "pagado" es un pago que ya ocurrio en la vida real:
// reduce lo que el deudor debe (+) y lo que el acreedor todavia tiene pendiente de cobrar (-).
async function aplicarLiquidacionesPagadas(grupoId, balances) {
  const pagadas = await db('liquidaciones')
    .select('de_usuario_id', 'a_usuario_id', 'monto')
    .where({ grupo_id: grupoId, estado: 'pagado' });

  for (const pago of pagadas) {
    const centimos = aCentimos(pago.monto);
    balances.set(pago.de_usuario_id, (balances.get(pago.de_usuario_id) ?? 0) + centimos);
    balances.set(pago.a_usuario_id, (balances.get(pago.a_usuario_id) ?? 0) - centimos);
  }
}

export async function calcularBalances(grupoId) {
  const balances = await calcularBalancesDesdeGastos(grupoId);
  await aplicarLiquidacionesPagadas(grupoId, balances);

  const miembros = await gruposService.obtenerMiembros(grupoId);
  return miembros.map((miembro) => ({
    usuario_id: miembro.id,
    nombre: miembro.nombre,
    balance: aEuros(balances.get(miembro.id) ?? 0),
  }));
}

// Algoritmo greedy: empareja al mayor deudor con el mayor acreedor en cada paso.
// Minimiza el numero de transacciones necesarias para saldar todas las deudas
// (si A debe a B y B debe a C, se simplifica a A debe directamente a C).
// Funcion pura: no toca la base de datos, no cambia con la migracion a Knex.
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

export async function guardarLiquidacionesCalculadas(grupoId, transacciones) {
  await db.transaction(async (trx) => {
    await trx('liquidaciones').where({ grupo_id: grupoId, estado: 'pendiente' }).del();
    for (const t of transacciones) {
      await trx('liquidaciones').insert({
        grupo_id: grupoId,
        de_usuario_id: t.de_usuario_id,
        a_usuario_id: t.a_usuario_id,
        monto: t.monto,
        estado: 'pendiente',
        fecha: ahoraSql(),
      });
    }
  });
  return obtenerLiquidacionesDeGrupo(grupoId);
}

export function obtenerLiquidacionesDeGrupo(grupoId) {
  return db('liquidaciones as l')
    .join('usuarios as du', 'du.id', 'l.de_usuario_id')
    .join('usuarios as au', 'au.id', 'l.a_usuario_id')
    .where('l.grupo_id', grupoId)
    .orderByRaw("(l.estado = 'pendiente') desc")
    .orderBy('l.fecha', 'desc')
    .select('l.*', 'du.nombre as de_nombre', 'au.nombre as a_nombre');
}

export function obtenerLiquidacionPorId(id) {
  return db('liquidaciones').where({ id }).first();
}

export async function marcarComoPagada(id) {
  await db('liquidaciones').where({ id }).update({ estado: 'pagado', fecha_pago: ahoraSql() });
  return obtenerLiquidacionPorId(id);
}
