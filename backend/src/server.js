import 'dotenv/config';
import './config/env.js';
import express from 'express';
import 'express-async-errors';
import cors from 'cors';
import multer from 'multer';
import { migrate } from './db/migrate.js';
import authRoutes from './routes/auth.routes.js';
import gruposRoutes from './routes/grupos.routes.js';
import gastosRoutes from './routes/gastos.routes.js';
import liquidacionesRoutes from './routes/liquidaciones.routes.js';

await migrate();

const app = express();
const PORT = process.env.PORT || 3001;

// Sin FRONTEND_URL (desarrollo local) se admite cualquier origen, igual que
// antes. En produccion se define FRONTEND_URL y solo ese origen puede llamar
// a la API.
const origenesPermitidos = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map((url) => url.trim())
  : true;
app.use(cors({ origin: origenesPermitidos }));

app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/grupos', gruposRoutes);
app.use('/api/grupos/:grupoId/gastos', gastosRoutes);
app.use('/api/grupos/:grupoId', liquidacionesRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'JSON invalido en el cuerpo de la peticion' });
  }
  if (err instanceof multer.MulterError || err.message?.startsWith('Formato de imagen no soportado')) {
    return res.status(400).json({ error: err.message });
  }
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

app.listen(PORT, () => {
  console.log(`Repartix backend escuchando en http://localhost:${PORT}`);
});
