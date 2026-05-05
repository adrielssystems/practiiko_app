import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'products');

// Asegurar que el directorio de subidas exista
const ensureUploadDir = async () => {
  try {
    await fs.access(UPLOAD_DIR);
  } catch {
    console.log(`[MEDIA]: Creando directorio de subidas en ${UPLOAD_DIR}`);
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
  }
};

/**
 * Procesa una imagen: redimensiona, convierte a WebP y optimiza.
 */
export async function processImage(buffer) {
  try {
    await ensureUploadDir();
    
    const filename = `${uuidv4()}.webp`;
    const filepath = path.join(UPLOAD_DIR, filename);
    const relativeUrl = `/api/media/${filename}`;

    console.log(`[MEDIA]: Procesando imagen... Destino: ${filepath}`);

    await sharp(buffer)
      .resize(1200, 1200, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .webp({ quality: 80, effort: 6 })
      .toFile(filepath);

    console.log(`[MEDIA]: Imagen procesada con éxito: ${relativeUrl}`);
    return { url: relativeUrl, filename };
  } catch (error) {
    console.error(`[MEDIA ERROR]: Falló el procesamiento de imagen: ${error.message}`);
    throw error;
  }
}

/**
 * Procesa un video (Placeholder para implementación con ffmpeg).
 */
export async function processVideo(buffer, originalFilename) {
  await ensureUploadDir();
  
  const ext = path.extname(originalFilename);
  const filename = `${uuidv4()}${ext}`;
  const filepath = path.join(UPLOAD_DIR, filename);
  const relativeUrl = `/api/media/${filename}`;

  // Por ahora, guardamos el archivo original optimizado para streaming.
  await fs.writeFile(filepath, buffer);

  return {
    url: relativeUrl,
    filename: filename
  };
}
