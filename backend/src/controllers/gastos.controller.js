import {
  crearGastoSchema,
  asignarItemSchema,
  dividirPartesIgualesSchema,
} from '../validators/gastos.validators.js';
import * as gastosService from '../services/gastos.service.js';
import * as gruposService from '../services/grupos.service.js';
import * as imageStorage from '../services/imageStorage.js';
import * as receiptParser from '../services/receiptParser.js';

function sumaItems(items) {
  return items.reduce((acc, item) => acc + item.precio, 0);
}

// esMiembro ahora es async: `.every(cb)` con un callback async siempre daria
// true (una Promise es un valor truthy), asi que hay que esperar todas las
// comprobaciones antes de reducir a un unico booleano.
async function todosSonMiembros(grupoId, usuarioIds) {
  const resultados = await Promise.all(usuarioIds.map((id) => gruposService.esMiembro(grupoId, id)));
  return resultados.every(Boolean);
}

export async function crear(req, res) {
  const parsed = crearGastoSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos invalidos', detalles: parsed.error.flatten().fieldErrors });
  }
  const { descripcion, monto_total, pagado_por, fecha, items, imagen_url } = parsed.data;

  if (items && items.length > 0 && sumaItems(items) > monto_total + 0.01) {
    return res.status(400).json({ error: 'La suma de los items no puede superar el monto total del gasto' });
  }

  const pagadoPorId = pagado_por ?? req.usuario.id;
  if (!(await gruposService.esMiembro(req.grupoId, pagadoPorId))) {
    return res.status(400).json({ error: 'El usuario que paga debe ser miembro del grupo' });
  }

  const gasto = await gastosService.crearGasto({
    grupoId: req.grupoId,
    pagadoPor: pagadoPorId,
    descripcion,
    montoTotal: monto_total,
    fecha,
    items,
    imagenUrl: imagen_url,
  });

  res.status(201).json({ gasto });
}

export async function analizarTicket(req, res) {
  if (!req.file) {
    return res.status(400).json({ error: 'No se ha subido ninguna imagen' });
  }

  const [resultadoImagen, resultadoIA] = await Promise.allSettled([
    imageStorage.subirImagen(req.file.buffer),
    receiptParser.analizarTicket(req.file.buffer, req.file.mimetype),
  ]);

  const avisos = [];

  let imagenUrl = null;
  if (resultadoImagen.status === 'fulfilled') {
    imagenUrl = resultadoImagen.value.secure_url;
  } else {
    console.error('Error subiendo imagen del ticket:', resultadoImagen.reason);
    avisos.push('No se pudo guardar la foto del ticket.');
  }

  let montoTotal = null;
  let items = [];
  if (resultadoIA.status === 'fulfilled') {
    montoTotal = resultadoIA.value.monto_total;
    items = resultadoIA.value.items;
  } else {
    console.error('Error analizando ticket con IA:', resultadoIA.reason);
    avisos.push('No se pudo leer el ticket automaticamente, rellena los datos a mano.');
  }

  res.json({ imagen_url: imagenUrl, monto_total: montoTotal, items, avisos });
}

export async function listar(req, res) {
  res.json({ gastos: await gastosService.obtenerGastosDeGrupo(req.grupoId) });
}

async function obtenerGastoDelGrupoValidado(req, res) {
  const gastoId = Number(req.params.gastoId);
  if (!Number.isInteger(gastoId)) {
    res.status(400).json({ error: 'Id de gasto invalido' });
    return null;
  }
  const gasto = await gastosService.obtenerGastoPorId(gastoId);
  if (!gasto || gasto.grupo_id !== req.grupoId) {
    res.status(404).json({ error: 'Gasto no encontrado' });
    return null;
  }
  return gasto;
}

export async function detalle(req, res) {
  const gasto = await obtenerGastoDelGrupoValidado(req, res);
  if (!gasto) return;
  res.json({ gasto: await gastosService.obtenerGastoCompleto(gasto.id) });
}

export async function eliminar(req, res) {
  const gasto = await obtenerGastoDelGrupoValidado(req, res);
  if (!gasto) return;
  if (gasto.pagado_por !== req.usuario.id) {
    return res.status(403).json({ error: 'Solo quien pago el gasto puede eliminarlo' });
  }
  await gastosService.eliminarGasto(gasto.id);
  res.status(204).send();
}

export async function asignarItem(req, res) {
  const gasto = await obtenerGastoDelGrupoValidado(req, res);
  if (!gasto) return;

  const itemId = Number(req.params.itemId);
  const item = Number.isInteger(itemId) ? await gastosService.obtenerItemPorId(itemId) : null;
  if (!item || item.gasto_id !== gasto.id) {
    return res.status(404).json({ error: 'Item no encontrado' });
  }

  const parsed = asignarItemSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos invalidos', detalles: parsed.error.flatten().fieldErrors });
  }

  const usuarioIds = [...new Set(parsed.data.usuario_ids)];
  if (!(await todosSonMiembros(req.grupoId, usuarioIds))) {
    return res.status(400).json({ error: 'Todos los usuarios asignados deben ser miembros del grupo' });
  }

  await gastosService.asignarUsuariosAItem(item.id, usuarioIds);
  res.json({ item: await gastosService.obtenerItemConAsignados(item.id) });
}

export async function dividirPartesIguales(req, res) {
  const gasto = await obtenerGastoDelGrupoValidado(req, res);
  if (!gasto) return;

  const parsed = dividirPartesIgualesSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos invalidos', detalles: parsed.error.flatten().fieldErrors });
  }

  const usuarioIds = [
    ...new Set(parsed.data.usuario_ids ?? (await gruposService.obtenerMiembros(req.grupoId)).map((m) => m.id)),
  ];
  if (!(await todosSonMiembros(req.grupoId, usuarioIds))) {
    return res.status(400).json({ error: 'Todos los participantes deben ser miembros del grupo' });
  }

  await gastosService.dividirPartesIguales(gasto.id, usuarioIds);
  res.json({ gasto: await gastosService.obtenerGastoCompleto(gasto.id) });
}
