import { Router } from 'express';
import { autenticar } from '../middleware/auth.js';
import { verificarMiembroDeGrupo } from '../middleware/grupoMiembro.js';
import * as liquidacionesController from '../controllers/liquidaciones.controller.js';

const router = Router({ mergeParams: true });
router.use(autenticar, verificarMiembroDeGrupo);

router.get('/balances', liquidacionesController.balances);
router.post('/liquidaciones/calcular', liquidacionesController.calcular);
router.get('/liquidaciones', liquidacionesController.listar);
router.patch('/liquidaciones/:liquidacionId/pagar', liquidacionesController.marcarPagada);

export default router;
