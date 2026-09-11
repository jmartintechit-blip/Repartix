import { z } from 'zod';

export const registroSchema = z.object({
  nombre: z.string().trim().min(1, 'El nombre es obligatorio').max(100, 'El nombre es demasiado largo'),
  email: z.string().trim().toLowerCase().email('El email no es valido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres').max(72, 'La contraseña es demasiado larga'),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('El email no es valido'),
  password: z.string().min(1, 'La contraseña es obligatoria'),
});
