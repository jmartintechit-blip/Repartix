import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export function subirImagen(buffer) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'repartix/tickets', resource_type: 'image' },
      (error, resultado) => {
        if (error) return reject(error);
        resolve(resultado);
      }
    );
    stream.end(buffer);
  });
}
