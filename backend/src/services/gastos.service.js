import { db } from '../db/connection.js';
import { ahoraSql } from '../utils/fecha.js';

export function obtenerGastoPorId(id) {
  return db('gastos').where({ id }).first();
}

export function obtenerGastosDeGrupo(grupoId) {
  return db('gastos').where({ grupo_id: grupoId }).orderBy([{ column: 'fecha', order: 'desc' }, { column: 'id', order: 'desc' }]);
}

export function obtenerItemPorId(id) {
  return db('items_gasto').where({ id }).first();
}

export function obtenerItemsDeGasto(gastoId) {
  return db('items_gasto').where({ gasto_id: gastoId }).orderBy('id', 'asc');
}

export function obtenerAsignacionesDeItem(itemId) {
  return db('usuarios as u')
    .join('item_asignacion as ia', 'ia.usuario_id', 'u.id')
    .where('ia.item_id', itemId)
    .orderBy('u.nombre', 'asc')
    .select('u.id', 'u.nombre', 'u.email');
}

export async function obtenerItemConAsignados(itemId) {
  const item = await obtenerItemPorId(itemId);
  if (!item) return null;
  return { ...item, asignados: await obtenerAsignacionesDeItem(itemId) };
}

export async function obtenerGastoCompleto(gastoId) {
  const gasto = await obtenerGastoPorId(gastoId);
  if (!gasto) return null;
  const itemsBase = await obtenerItemsDeGasto(gastoId);
  const items = await Promise.all(
    itemsBase.map(async (item) => ({ ...item, asignados: await obtenerAsignacionesDeItem(item.id) }))
  );
  return { ...gasto, items };
}

export async function crearGasto({ grupoId, pagadoPor, descripcion, montoTotal, fecha, items, imagenUrl }) {
  const gastoId = await db.transaction(async (trx) => {
    const [{ id }] = await trx('gastos')
      .insert({
        grupo_id: grupoId,
        pagado_por: pagadoPor,
        descripcion,
        monto_total: montoTotal,
        imagen_url: imagenUrl ?? null,
        fecha: fecha ?? ahoraSql(),
      })
      .returning('id');

    const itemsAInsertar = items && items.length > 0 ? items : [{ nombre_item: 'Total', precio: montoTotal, cantidad: 1 }];

    for (const item of itemsAInsertar) {
      await trx('items_gasto').insert({
        gasto_id: id,
        nombre_item: item.nombre_item,
        precio: item.precio,
        cantidad: item.cantidad ?? 1,
      });
    }

    return id;
  });

  return obtenerGastoCompleto(gastoId);
}

export function eliminarGasto(gastoId) {
  // ON DELETE CASCADE se encarga de items_gasto e item_asignacion
  return db('gastos').where({ id: gastoId }).del();
}

export async function asignarUsuariosAItem(itemId, usuarioIds) {
  await db.transaction(async (trx) => {
    await trx('item_asignacion').where({ item_id: itemId }).del();
    for (const usuarioId of usuarioIds) {
      await trx('item_asignacion').insert({ item_id: itemId, usuario_id: usuarioId });
    }
  });
}

export async function dividirPartesIguales(gastoId, usuarioIds) {
  const items = await obtenerItemsDeGasto(gastoId);
  await db.transaction(async (trx) => {
    for (const item of items) {
      await trx('item_asignacion').where({ item_id: item.id }).del();
      for (const usuarioId of usuarioIds) {
        await trx('item_asignacion').insert({ item_id: item.id, usuario_id: usuarioId });
      }
    }
  });
}
