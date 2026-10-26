import { z } from 'zod';

export const registroSchema = z.object({
  nombre: z.string().trim().min(1, 'El nombre es obligatorio').max(100, 'El nombre es demasiado largo'),
  email: z.string().trim().toLowerCase().email('El email no es valido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres').max(72, 'La contraseña es demasiado larga'),
});

const passwordNueva = registroSchema.shape.password;

export const editarPerfilSchema = registroSchema.pick({ nombre: true });

export const cambiarPasswordSchema = z.object({
  password_actual: z.string().min(1, 'La contraseña actual es obligatoria'),
  password_nueva: passwordNueva,
});

export const eliminarCuentaSchema = z.object({
  password: z.string().min(1, 'La contraseña es obligatoria'),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('El email no es valido'),
  password: z.string().min(1, 'La contraseña es obligatoria'),
});
