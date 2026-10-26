import multer from 'multer';

const TIPOS_PERMITIDOS = ['image/jpeg', 'image/png', 'image/heic', 'image/heif', 'image/webp'];
const TAMANO_MAXIMO = 8 * 1024 * 1024; // 8 MB

export const subidaImagen = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: TAMANO_MAXIMO },
  fileFilter: (req, file, cb) => {
    if (!TIPOS_PERMITIDOS.includes(file.mimetype)) {
      return cb(new Error('Formato de imagen no soportado. Usa JPG, PNG, HEIC o WEBP.'));
    }
    cb(null, true);
  },
});

const HEIF_MARCAS = ['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'mif1', 'msf1', 'heif'];

// El tipo MIME lo declara el cliente, asi que se confirma mirando los primeros
// bytes del fichero. Devuelve el tipo real, o null si no es una imagen admitida.
export function detectarTipoImagen(buffer) {
  const texto = (inicio, fin) => buffer.subarray(inicio, fin).toString('latin1');
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return 'image/png';
  }
  if (buffer.length >= 12 && texto(0, 4) === 'RIFF' && texto(8, 12) === 'WEBP') return 'image/webp';
  if (buffer.length >= 12 && texto(4, 8) === 'ftyp' && HEIF_MARCAS.includes(texto(8, 12))) return 'image/heic';
  return null;
}

export function validarContenidoImagen(req, res, next) {
  if (req.file) {
    const tipo = detectarTipoImagen(req.file.buffer);
    if (!tipo) return res.status(400).json({ error: 'El archivo no es una imagen valida' });
    req.file.mimetype = tipo;
  }
  next();
}
