import { db } from '../db/connection.js';

export function obtenerGastoPorId(id) {
  return db.prepare('SELECT * FROM gastos WHERE id = ?').get(id);
}

export function obtenerGastosDeGrupo(grupoId) {
  return db.prepare('SELECT * FROM gastos WHERE grupo_id = ? ORDER BY fecha DESC, id DESC').all(grupoId);
}

export function obtenerItemPorId(id) {
  return db.prepare('SELECT * FROM items_gasto WHERE id = ?').get(id);
}

export function obtenerItemsDeGasto(gastoId) {
  return db.prepare('SELECT * FROM items_gasto WHERE gasto_id = ? ORDER BY id ASC').all(gastoId);
}

export function obtenerAsignacionesDeItem(itemId) {
  return db
    .prepare(
      `SELECT u.id, u.nombre, u.email
       FROM usuarios u
       JOIN item_asignacion ia ON ia.usuario_id = u.id
       WHERE ia.item_id = ?
       ORDER BY u.nombre ASC`
    )
    .all(itemId);
}

export function obtenerItemConAsignados(itemId) {
  const item = obtenerItemPorId(itemId);
  if (!item) return null;
  return { ...item, asignados: obtenerAsignacionesDeItem(itemId) };
}

export function obtenerGastoCompleto(gastoId) {
  const gasto = obtenerGastoPorId(gastoId);
  if (!gasto) return null;
  const items = obtenerItemsDeGasto(gastoId).map((item) => ({
    ...item,
    asignados: obtenerAsignacionesDeItem(item.id),
  }));
  return { ...gasto, items };
}

export function crearGasto({ grupoId, pagadoPor, descripcion, montoTotal, fecha, items, imagenUrl }) {
  const transaccion = db.transaction(() => {
    const { lastInsertRowid: gastoId } = db
      .prepare(
        `INSERT INTO gastos (grupo_id, pagado_por, descripcion, monto_total, imagen_url, fecha)
         VALUES (@grupo_id, @pagado_por, @descripcion, @monto_total, @imagen_url, COALESCE(@fecha, datetime('now')))`
      )
      .run({
        grupo_id: grupoId,
        pagado_por: pagadoPor,
        descripcion,
        monto_total: montoTotal,
        imagen_url: imagenUrl ?? null,
        fecha: fecha ?? null,
      });

    const itemsAInsertar = items && items.length > 0 ? items : [{ nombre_item: 'Total', precio: montoTotal, cantidad: 1 }];
    const insertarItem = db.prepare('INSERT INTO items_gasto (gasto_id, nombre_item, precio, cantidad) VALUES (?, ?, ?, ?)');

    for (const item of itemsAInsertar) {
      insertarItem.run(gastoId, item.nombre_item, item.precio, item.cantidad ?? 1);
    }

    return gastoId;
  });

  return obtenerGastoCompleto(transaccion());
}

export function eliminarGasto(gastoId) {
  // ON DELETE CASCADE se encarga de items_gasto e item_asignacion
  db.prepare('DELETE FROM gastos WHERE id = ?').run(gastoId);
}

export function asignarUsuariosAItem(itemId, usuarioIds) {
  const transaccion = db.transaction(() => {
    db.prepare('DELETE FROM item_asignacion WHERE item_id = ?').run(itemId);
    const insertar = db.prepare('INSERT INTO item_asignacion (item_id, usuario_id) VALUES (?, ?)');
    for (const usuarioId of usuarioIds) {
      insertar.run(itemId, usuarioId);
    }
  });
  transaccion();
}

export function dividirPartesIguales(gastoId, usuarioIds) {
  const items = obtenerItemsDeGasto(gastoId);
  const transaccion = db.transaction(() => {
    const borrar = db.prepare('DELETE FROM item_asignacion WHERE item_id = ?');
    const insertar = db.prepare('INSERT INTO item_asignacion (item_id, usuario_id) VALUES (?, ?)');
    for (const item of items) {
      borrar.run(item.id);
      for (const usuarioId of usuarioIds) {
        insertar.run(item.id, usuarioId);
      }
    }
  });
  transaccion();
}
