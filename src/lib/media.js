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
 * Procesa un video: lo guarda directamente al disco en su formato original
 * con extensión .mp4 asumiendo que el usuario ya lo sube optimizado.
 */
export async function processVideo(buffer, originalFilename = 'video.mp4') {
  await ensureUploadDir();
  
  if (!buffer || buffer.length === 0) {
    throw new Error('El buffer del video está vacío (0 bytes)');
  }

  // Forzar siempre la extensión a .mp4 para cabeceras mime-type
  const filename = `${uuidv4()}.mp4`;
  const filepath = path.join(UPLOAD_DIR, filename);
  const relativeUrl = `/api/media/${filename}`;

  console.log(`[MEDIA]: Guardando video en disco (MP4): ${filepath}`);

  // Escribir el buffer completo directamente a disco
  await fs.writeFile(filepath, buffer);

  const fileSizeMb = (buffer.length / (1024 * 1024)).toFixed(2);
  console.log(`[MEDIA]: Video guardado exitosamente: ${filename} (${fileSizeMb} MB)`);

  // Retornar INMEDIATAMENTE la URL del video guardado y listo para reproducir
  return {
    url: relativeUrl,
    filename: filename
  };
}
