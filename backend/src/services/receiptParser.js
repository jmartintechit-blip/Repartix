import { GoogleGenAI, Type, createUserContent, createPartFromBase64 } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const MODELO = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

const ESQUEMA_TICKET = {
  type: Type.OBJECT,
  properties: {
    monto_total: { type: Type.NUMBER, description: 'Importe final del ticket, incluyendo impuestos y propina' },
    items: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          nombre_item: { type: Type.STRING },
          precio: { type: Type.NUMBER, description: 'Precio total de esa linea (no el precio unitario)' },
          cantidad: { type: Type.INTEGER },
        },
        required: ['nombre_item', 'precio'],
      },
    },
  },
  required: ['monto_total', 'items'],
};

const PROMPT = `Eres un asistente que extrae informacion de fotos de tickets de compra o restaurante.
Analiza la imagen y devuelve:
- "items": cada articulo comprado, con su nombre y el precio TOTAL de esa linea (si hay cantidad
  mayor que 1, el precio es el total de esa linea, no el precio unitario).
- "monto_total": el importe final del ticket, incluyendo impuestos, propina o descuentos si aparecen.
No incluyas lineas que no sean articulos (cabeceras, direcciones, numero de mesa, etc). Si algun
precio no se lee con claridad, haz tu mejor estimacion a partir del resto de importes del ticket.`;

export async function analizarTicket(imagenBuffer, mimeType) {
  const respuesta = await ai.models.generateContent({
    model: MODELO,
    contents: createUserContent([PROMPT, createPartFromBase64(imagenBuffer.toString('base64'), mimeType)]),
    config: {
      responseMimeType: 'application/json',
      responseSchema: ESQUEMA_TICKET,
    },
  });

  const datos = JSON.parse(respuesta.text);

  return {
    monto_total: datos.monto_total,
    items: (datos.items ?? []).map((item) => ({
      nombre_item: item.nombre_item,
      precio: item.precio,
      cantidad: item.cantidad ?? 1,
    })),
  };
}
