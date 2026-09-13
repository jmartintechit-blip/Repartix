# Repartix

Aplicación web para dividir gastos de grupo (viajes, salidas, pisos compartidos) a partir de fotos de tickets. Una IA de visión extrae los ítems y precios del ticket, cada persona marca qué consumió, y la app calcula automáticamente quién le debe a quién — con simplificación de deudas (si A debe a B y B debe a C, se simplifica a A debe directamente a C).

Proyecto de portfolio técnico: full-stack real (auth con JWT + bcrypt, base de datos relacional, validaciones de entrada, control de acceso, casos borde cubiertos), no una demo de un solo camino feliz.

## Funcionalidades

- Registro / login
- Crear grupo o unirse a uno con un código de invitación
- Subir foto de un ticket → una IA extrae los ítems y precios automáticamente, corregibles a mano
- Cada miembro marca qué ítems consumió, o reparte un gasto a partes iguales con un clic
- Cálculo automático de quién debe a quién, con simplificación de deudas
- Historial de gastos del grupo
- Marcar una liquidación como pagada

## Stack

- **Backend**: Node.js + Express + SQLite (better-sqlite3), auth con JWT + bcrypt, validación con Zod
- **Frontend**: React + Vite, sin frameworks de estilos — sistema de diseño propio con CSS Modules
- **IA de visión**: Google Gemini (extracción estructurada de ítems y precios desde la foto)
- **Imágenes**: Cloudinary

## Puesta en marcha

Requiere Node.js 20 o superior.

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
```

Edita `backend/.env` y pon un valor aleatorio largo en `JWT_SECRET` (por ejemplo, con `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`).

```bash
npm run migrate   # crea la base de datos SQLite y sus tablas
npm run dev        # http://localhost:3001
```

### 2. Frontend

En otra terminal:

```bash
cd frontend
npm install
cp .env.example .env
npm run dev         # http://localhost:5173
```

Con esto la aplicación ya funciona por completo: registro, login, grupos, gastos y liquidaciones. La única pieza que requiere configuración adicional es el escaneo de tickets con IA (ver abajo) — sin ella, todo lo demás funciona igual y los gastos se pueden introducir a mano.

### 3. Activar el escaneo de tickets con IA (opcional)

Sin estas credenciales, el botón "Escanear ticket con IA" muestra un aviso y el formulario se rellena a mano con normalidad — el resto de la app no se ve afectado.

Para activarlo, añade en `backend/.env`:

| Variable | Dónde conseguirla |
|---|---|
| `GEMINI_API_KEY` | [Google AI Studio](https://aistudio.google.com/apikey) — gratis, sin tarjeta |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | [Cloudinary](https://cloudinary.com/users/register/free) — plan gratuito, están en el Dashboard tras registrarte |

## Estructura

```
backend/    API REST (Express), migraciones SQLite, servicios de negocio
frontend/   Aplicación React (Vite), sistema de diseño y componentes propios
```

Cada uno tiene su propio `package.json` y se ejecuta de forma independiente.

## Licencia

Distribuido bajo la [PolyForm Noncommercial License 1.0.0](LICENSE): puedes ver, ejecutar y modificar el código con fines personales, educativos o de evaluación, pero no se permite el uso comercial.
