import 'dotenv/config';
import './config/env.js';
import express from 'express';
import cors from 'cors';
import { migrate } from './db/migrate.js';
import authRoutes from './routes/auth.routes.js';
import gruposRoutes from './routes/grupos.routes.js';
import gastosRoutes from './routes/gastos.routes.js';
import liquidacionesRoutes from './routes/liquidaciones.routes.js';

migrate();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
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
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

app.listen(PORT, () => {
  console.log(`Repartix backend escuchando en http://localhost:${PORT}`);
});
