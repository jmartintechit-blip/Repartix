import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { migrate } from './db/migrate.js';

migrate();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Repartix backend escuchando en http://localhost:${PORT}`);
});
