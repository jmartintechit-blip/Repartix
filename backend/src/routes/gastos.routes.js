import { Router } from 'express';
import { autenticar } from '../middleware/auth.js';
import { verificarMiembroDeGrupo } from '../middleware/grupoMiembro.js';
import * as gastosController from '../controllers/gastos.controller.js';

const router = Router({ mergeParams: true });
router.use(autenticar, verificarMiembroDeGrupo);

router.post('/', gastosController.crear);
router.get('/', gastosController.listar);
router.get('/:gastoId', gastosController.detalle);
router.delete('/:gastoId', gastosController.eliminar);
router.put('/:gastoId/items/:itemId/asignaciones', gastosController.asignarItem);
router.post('/:gastoId/dividir-partes-iguales', gastosController.dividirPartesIguales);

export default router;
