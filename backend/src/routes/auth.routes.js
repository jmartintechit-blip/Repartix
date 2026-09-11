import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { registro, login, me } from '../controllers/auth.controller.js';
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

export default router;
