import { z } from 'zod';

export const crearGrupoSchema = z.object({
  nombre: z.string().trim().min(1, 'El nombre del grupo es obligatorio').max(100, 'El nombre es demasiado largo'),
});

export const unirseGrupoSchema = z.object({
  codigo_invitacion: z.string().trim().toUpperCase().min(1, 'El codigo de invitacion es obligatorio'),
});
