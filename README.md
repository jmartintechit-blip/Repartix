# Repartix

Aplicación web para dividir gastos de grupo (viajes, salidas, pisos compartidos) a partir de fotos de tickets. Una IA de visión extrae los ítems y precios del ticket, cada persona marca qué consumió, y la app calcula automáticamente quién le debe a quién — con simplificación de deudas.

Proyecto de portfolio técnico: full-stack real (auth, base de datos, validaciones, casos borde), no una demo.

## Stack

- **Backend**: Node.js + Express + SQLite (dev) / PostgreSQL (producción), auth con JWT + bcrypt
- **Frontend**: React + Vite
- **IA de visión**: Google Gemini (extracción de ítems y precios desde la foto del ticket)
- **Imágenes**: Cloudinary

## Estructura

```
backend/    API REST, base de datos, lógica de negocio
frontend/   Aplicación React (Vite)
```

## Desarrollo

Instrucciones de arranque se irán añadiendo a medida que cada pieza esté lista.
