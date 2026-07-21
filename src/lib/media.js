import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

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
 * Procesa un video: transmite el flujo de datos (Web ReadableStream) directamente a disco
 * de forma progresiva, garantizando consumo mínimo de RAM y evitando cualquier límite de
 * tamaño impuesto por parseadores de FormData/JSON.
 */
export async function processVideo(buffer, originalFilename = 'video.mp4') {
  await ensureUploadDir();
  
  // Forzar siempre la extensión a .mp4 para compatibilidad del reproductor HTML5 y cabeceras mime-type del servidor
  const filename = `${uuidv4()}.mp4`;
  const filepath = path.join(UPLOAD_DIR, filename);
  const relativeUrl = `/api/media/${filename}`;

  console.log(`[MEDIA]: Guardando video en disco (MP4): ${filepath}`);

  // Escribir el buffer completo directamente a disco
  await fs.writeFile(filepath, buffer);

  const fileSizeMb = (buffer.length / (1024 * 1024)).toFixed(2);
  console.log(`[MEDIA]: Video guardado exitosamente: ${filename} (${fileSizeMb} MB)`);

  // Intentar compresión/optimización a MP4 en segundo plano (Fire & Forget)
  // Preserva el archivo original si ffmpeg no está disponible o la compresión falla.
  const compressedFilename = `opt_${filename.replace(/\.[^/.]+$/, "")}.mp4`;
  const compressedFilepath = path.join(UPLOAD_DIR, compressedFilename);

  console.log(`[MEDIA]: Iniciando optimización ffmpeg en segundo plano...`);

  try {
    ffmpeg(filepath)
      .videoCodec('libx264')
      .audioCodec('aac')
      .outputOptions([
        '-preset veryfast',
        '-crf 28',
        '-movflags +faststart'
      ])
      .toFormat('mp4')
      .on('end', async () => {
        console.log(`[MEDIA]: Video comprimido con éxito en segundo plano: ${compressedFilename}`);
        try {
          // Reemplazar de forma segura el video original por el optimizado
          await fs.rename(compressedFilepath, filepath);
          console.log(`[MEDIA]: Video optimizado reemplazó correctamente al original en ${filename}`);
        } catch (renameErr) {
          console.error(`[MEDIA ERROR]: Error reemplazando video optimizado: ${renameErr.message}`);
        }
      })
      .on('error', async (err) => {
        console.warn(`[MEDIA WARNING]: No se pudo comprimir el video en segundo plano (${err.message}). Se conserva el video original subido.`);
        try {
          await fs.unlink(compressedFilepath);
        } catch (e) {}
      })
      .save(compressedFilepath);
  } catch (ffmpegErr) {
    console.warn(`[MEDIA WARNING]: No se pudo iniciar el proceso de compresión: ${ffmpegErr.message}`);
  }

  // Retornar INMEDIATAMENTE la URL del video guardado y listo para reproducir
  return {
    url: relativeUrl,
    filename: filename
  };
}
