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
 * Procesa un video: comprime a libx264, optimiza bitrate y formato web.
 */
export async function processVideo(file) {
  await ensureUploadDir();
  
  const originalFilename = file.name || 'video.mp4';
  const ext = path.extname(originalFilename) || '.mp4';
  const tempFilename = `temp_${uuidv4()}${ext}`;
  const tempFilepath = path.join(UPLOAD_DIR, tempFilename);
  
  const filename = `${uuidv4()}.mp4`;
  const filepath = path.join(UPLOAD_DIR, filename);
  const relativeUrl = `/api/media/${filename}`;

  // Guardar archivo temporal usando Streams (Previene colapso de RAM en videos pesados)
  console.log(`[MEDIA]: Guardando temporal de video en disco (Stream)...`);
  const nodeStream = Readable.fromWeb(file.stream());
  await pipeline(nodeStream, createWriteStream(tempFilepath));

  console.log(`[MEDIA]: Comprimiendo video en segundo plano... Destino: ${filepath}`);

  // Iniciar la compresión en segundo plano sin bloquear el retorno
  ffmpeg(tempFilepath)
    .videoCodec('libx264')
    .audioCodec('aac')
    .outputOptions([
      '-preset veryfast',
      '-crf 28',
      '-movflags +faststart'
    ])
    .toFormat('mp4')
    .on('end', async () => {
      console.log(`[MEDIA]: Video comprimido con éxito en segundo plano: ${relativeUrl}`);
      try {
        await fs.unlink(tempFilepath);
      } catch (e) {
        console.error('[MEDIA]: Error eliminando temporal', e);
      }
    })
    .on('error', async (err) => {
      console.error(`[MEDIA ERROR]: Falló la compresión del video: ${err.message}`);
      try {
        await fs.unlink(tempFilepath);
      } catch (e) {}
    })
    .save(filepath);

  // Retornar INMEDIATAMENTE para evitar el timeout de la petición HTTP (ej: 60s en Traefik/Nginx)
  return {
    url: relativeUrl,
    filename: filename
  };
}
