import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { registro, login, me, editarPerfil, cambiarPassword, eliminarCuenta } from '../controllers/auth.controller.js';
import { autenticar } from '../middleware/auth.js';

const router = Router();

const limiteAuth = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos, prueba de nuevo en unos minutos' },
});

router.post('/registro', limiteAuth, registro);
router.post('/login', limiteAuth, login);
router.get('/me', autenticar, me);
router.patch('/me', autenticar, editarPerfil);
router.put('/me/password', autenticar, limiteAuth, cambiarPassword);
router.delete('/me', autenticar, limiteAuth, eliminarCuenta);

export default router;
