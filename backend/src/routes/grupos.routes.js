import { Router } from 'express';
import { autenticar } from '../middleware/auth.js';
import { crear, unirse, listarMisGrupos, detalle } from '../controllers/grupos.controller.js';

const router = Router();
router.use(autenticar);

router.post('/', crear);
router.post('/unirse', unirse);
router.get('/', listarMisGrupos);
router.get('/:id', detalle);

export default router;
