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
