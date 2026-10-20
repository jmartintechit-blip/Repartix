import 'dotenv/config';
import app from './app.js';
import { migrate } from './db/migrate.js';

await migrate();

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Repartix backend escuchando en http://localhost:${PORT}`);
});
