import * as liquidacionesService from '../services/liquidaciones.service.js';

function hayItemsSinAsignar(req, res) {
  const pendientes = liquidacionesService.obtenerItemsSinAsignar(req.grupoId);
  if (pendientes.length > 0) {
    res.status(400).json({
      error: 'Hay items sin asignar a ningun usuario, no se puede calcular el reparto',
      items_sin_asignar: pendientes,
    });
    return true;
  }
  return false;
}

export function balances(req, res) {
  if (hayItemsSinAsignar(req, res)) return;
  res.json({ balances: liquidacionesService.calcularBalances(req.grupoId) });
}

export function calcular(req, res) {
  if (hayItemsSinAsignar(req, res)) return;
  const balancesActuales = liquidacionesService.calcularBalances(req.grupoId);
  const transacciones = liquidacionesService.simplificarDeudas(balancesActuales);
  const liquidaciones = liquidacionesService.guardarLiquidacionesCalculadas(req.grupoId, transacciones);
  res.status(201).json({ liquidaciones });
}

export function listar(req, res) {
  res.json({ liquidaciones: liquidacionesService.obtenerLiquidacionesDeGrupo(req.grupoId) });
}

export function marcarPagada(req, res) {
  const liquidacionId = Number(req.params.liquidacionId);
  if (!Number.isInteger(liquidacionId)) {
    return res.status(400).json({ error: 'Id de liquidacion invalido' });
  }

  const liquidacion = liquidacionesService.obtenerLiquidacionPorId(liquidacionId);
  if (!liquidacion || liquidacion.grupo_id !== req.grupoId) {
    return res.status(404).json({ error: 'Liquidacion no encontrada' });
  }
  if (liquidacion.de_usuario_id !== req.usuario.id && liquidacion.a_usuario_id !== req.usuario.id) {
    return res.status(403).json({ error: 'Solo las partes implicadas pueden marcar esta liquidacion como pagada' });
  }
  if (liquidacion.estado === 'pagado') {
    return res.status(409).json({ error: 'Esta liquidacion ya estaba marcada como pagada' });
  }

  res.json({ liquidacion: liquidacionesService.marcarComoPagada(liquidacionId) });
}
