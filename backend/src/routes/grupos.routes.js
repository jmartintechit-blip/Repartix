import { Router } from 'express';
import { autenticar } from '../middleware/auth.js';
import { verificarMiembroDeGrupo } from '../middleware/grupoMiembro.js';
import {
  crear,
  unirse,
  listarMisGrupos,
  detalle,
  renombrar,
  regenerarCodigo,
  eliminar,
  quitarMiembro,
} from '../controllers/grupos.controller.js';

const router = Router();
router.use(autenticar);

router.post('/', crear);
router.post('/unirse', unirse);
router.get('/', listarMisGrupos);
router.get('/:id', detalle);
router.patch('/:grupoId', verificarMiembroDeGrupo, renombrar);
router.delete('/:grupoId', verificarMiembroDeGrupo, eliminar);
router.post('/:grupoId/codigo', verificarMiembroDeGrupo, regenerarCodigo);
router.delete('/:grupoId/miembros/:usuarioId', verificarMiembroDeGrupo, quitarMiembro);

export default router;
