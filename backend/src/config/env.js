const requeridas = ['JWT_SECRET'];

for (const clave of requeridas) {
  if (!process.env[clave]) {
    throw new Error(`Falta la variable de entorno ${clave} (revisa backend/.env, usa .env.example como plantilla)`);
  }
}
