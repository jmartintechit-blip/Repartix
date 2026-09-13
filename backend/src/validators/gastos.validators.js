import { z } from 'zod';

const itemSchema = z.object({
  nombre_item: z.string().trim().min(1, 'El nombre del item es obligatorio').max(200, 'El nombre del item es demasiado largo'),
  precio: z.number().positive('El precio del item debe ser mayor que 0'),
  cantidad: z.number().int().positive('La cantidad debe ser un entero positivo').max(999).optional(),
});

export const crearGastoSchema = z.object({
  descripcion: z.string().trim().min(1, 'La descripcion es obligatoria').max(200, 'La descripcion es demasiado larga'),
  monto_total: z.number().positive('El monto total debe ser mayor que 0'),
  pagado_por: z.number().int().positive().optional(),
  fecha: z.string().trim().min(1).optional(),
  imagen_url: z.string().trim().url('URL de imagen invalida').optional(),
  items: z.array(itemSchema).max(200, 'Demasiados items en un solo gasto').optional(),
});

export const asignarItemSchema = z.object({
  usuario_ids: z.array(z.number().int().positive()).max(100),
});

export const dividirPartesIgualesSchema = z.object({
  usuario_ids: z.array(z.number().int().positive()).min(1, 'Debes indicar al menos un participante').max(100).optional(),
});
