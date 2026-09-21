import * as liquidacionesService from '../services/liquidaciones.service.js';

async function hayItemsSinAsignar(req, res) {
  const pendientes = await liquidacionesService.obtenerItemsSinAsignar(req.grupoId);
  if (pendientes.length > 0) {
    res.status(400).json({
      error: 'Hay items sin asignar a ningun usuario, no se puede calcular el reparto',
      items_sin_asignar: pendientes,
    });
    return true;
  }
  return false;
}

export async function balances(req, res) {
  if (await hayItemsSinAsignar(req, res)) return;
  res.json({ balances: await liquidacionesService.calcularBalances(req.grupoId) });
}

export async function calcular(req, res) {
  if (await hayItemsSinAsignar(req, res)) return;
  const balancesActuales = await liquidacionesService.calcularBalances(req.grupoId);
  const transacciones = liquidacionesService.simplificarDeudas(balancesActuales);
  const liquidaciones = await liquidacionesService.guardarLiquidacionesCalculadas(req.grupoId, transacciones);
  res.status(201).json({ liquidaciones });
}

export async function listar(req, res) {
  res.json({ liquidaciones: await liquidacionesService.obtenerLiquidacionesDeGrupo(req.grupoId) });
}

export async function marcarPagada(req, res) {
  const liquidacionId = Number(req.params.liquidacionId);
  if (!Number.isInteger(liquidacionId)) {
    return res.status(400).json({ error: 'Id de liquidacion invalido' });
  }

  const liquidacion = await liquidacionesService.obtenerLiquidacionPorId(liquidacionId);
  if (!liquidacion || liquidacion.grupo_id !== req.grupoId) {
    return res.status(404).json({ error: 'Liquidacion no encontrada' });
  }
  if (liquidacion.de_usuario_id !== req.usuario.id && liquidacion.a_usuario_id !== req.usuario.id) {
    return res.status(403).json({ error: 'Solo las partes implicadas pueden marcar esta liquidacion como pagada' });
  }
  if (liquidacion.estado === 'pagado') {
    return res.status(409).json({ error: 'Esta liquidacion ya estaba marcada como pagada' });
  }

  res.json({ liquidacion: await liquidacionesService.marcarComoPagada(liquidacionId) });
}
