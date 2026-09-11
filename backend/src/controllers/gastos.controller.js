import {
  crearGastoSchema,
  asignarItemSchema,
  dividirPartesIgualesSchema,
} from '../validators/gastos.validators.js';
import * as gastosService from '../services/gastos.service.js';
import * as gruposService from '../services/grupos.service.js';

function sumaItems(items) {
  return items.reduce((acc, item) => acc + item.precio, 0);
}

export function crear(req, res) {
  const parsed = crearGastoSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos invalidos', detalles: parsed.error.flatten().fieldErrors });
  }
  const { descripcion, monto_total, pagado_por, fecha, items } = parsed.data;

  if (items && items.length > 0 && sumaItems(items) > monto_total + 0.01) {
    return res.status(400).json({ error: 'La suma de los items no puede superar el monto total del gasto' });
  }

  const pagadoPorId = pagado_por ?? req.usuario.id;
  if (!gruposService.esMiembro(req.grupoId, pagadoPorId)) {
    return res.status(400).json({ error: 'El usuario que paga debe ser miembro del grupo' });
  }

  const gasto = gastosService.crearGasto({
    grupoId: req.grupoId,
    pagadoPor: pagadoPorId,
    descripcion,
    montoTotal: monto_total,
    fecha,
    items,
  });

  res.status(201).json({ gasto });
}

export function listar(req, res) {
  res.json({ gastos: gastosService.obtenerGastosDeGrupo(req.grupoId) });
}

function obtenerGastoDelGrupoValidado(req, res) {
  const gastoId = Number(req.params.gastoId);
  if (!Number.isInteger(gastoId)) {
    res.status(400).json({ error: 'Id de gasto invalido' });
    return null;
  }
  const gasto = gastosService.obtenerGastoPorId(gastoId);
  if (!gasto || gasto.grupo_id !== req.grupoId) {
    res.status(404).json({ error: 'Gasto no encontrado' });
    return null;
  }
  return gasto;
}

export function detalle(req, res) {
  const gasto = obtenerGastoDelGrupoValidado(req, res);
  if (!gasto) return;
  res.json({ gasto: gastosService.obtenerGastoCompleto(gasto.id) });
}

export function eliminar(req, res) {
  const gasto = obtenerGastoDelGrupoValidado(req, res);
  if (!gasto) return;
  if (gasto.pagado_por !== req.usuario.id) {
    return res.status(403).json({ error: 'Solo quien pago el gasto puede eliminarlo' });
  }
  gastosService.eliminarGasto(gasto.id);
  res.status(204).send();
}

export function asignarItem(req, res) {
  const gasto = obtenerGastoDelGrupoValidado(req, res);
  if (!gasto) return;

  const itemId = Number(req.params.itemId);
  const item = Number.isInteger(itemId) ? gastosService.obtenerItemPorId(itemId) : null;
  if (!item || item.gasto_id !== gasto.id) {
    return res.status(404).json({ error: 'Item no encontrado' });
  }

  const parsed = asignarItemSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos invalidos', detalles: parsed.error.flatten().fieldErrors });
  }

  const usuarioIds = [...new Set(parsed.data.usuario_ids)];
  if (!usuarioIds.every((id) => gruposService.esMiembro(req.grupoId, id))) {
    return res.status(400).json({ error: 'Todos los usuarios asignados deben ser miembros del grupo' });
  }

  gastosService.asignarUsuariosAItem(item.id, usuarioIds);
  res.json({ item: gastosService.obtenerItemConAsignados(item.id) });
}

export function dividirPartesIguales(req, res) {
  const gasto = obtenerGastoDelGrupoValidado(req, res);
  if (!gasto) return;

  const parsed = dividirPartesIgualesSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos invalidos', detalles: parsed.error.flatten().fieldErrors });
  }

  const usuarioIds = [...new Set(parsed.data.usuario_ids ?? gruposService.obtenerMiembros(req.grupoId).map((m) => m.id))];
  if (!usuarioIds.every((id) => gruposService.esMiembro(req.grupoId, id))) {
    return res.status(400).json({ error: 'Todos los participantes deben ser miembros del grupo' });
  }

  gastosService.dividirPartesIguales(gasto.id, usuarioIds);
  res.json({ gasto: gastosService.obtenerGastoCompleto(gasto.id) });
}
