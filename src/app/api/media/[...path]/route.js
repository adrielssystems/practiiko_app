import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

export async function GET(req, { params }) {
  try {
    const { path: pathArray } = await params;
    const filePath = path.join(process.cwd(), 'public', 'uploads', 'products', ...pathArray);
    const ext = path.extname(filePath).toLowerCase();

    // Si se pide una imagen JPEG/JPG pero el archivo físico no existe (y sí existe en WebP)
    if ((ext === '.jpeg' || ext === '.jpg') && !fs.existsSync(filePath)) {
      const webpFilePath = filePath.replace(/\.(jpeg|jpg)$/i, '.webp');
      
      if (fs.existsSync(webpFilePath)) {
        const webpBuffer = await fs.promises.readFile(webpFilePath);
        const jpegBuffer = await sharp(webpBuffer)
          .jpeg({ quality: 85 })
          .toBuffer();

        return new NextResponse(jpegBuffer, {
          status: 200,
          headers: {
            'Content-Type': 'image/jpeg',
            'Content-Length': jpegBuffer.length.toString(),
            'Cache-Control': 'public, max-age=31536000, immutable',
          },
        });
      }
    }

    if (!fs.existsSync(filePath)) {
      return new NextResponse('File not found', { status: 404 });
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;

    let contentType = 'application/octet-stream';
    if (ext === '.webp') contentType = 'image/webp';
    else if (ext === '.png') contentType = 'image/png';
    else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
    else if (ext === '.mp4') contentType = 'video/mp4';
    else if (ext === '.webm') contentType = 'video/webm';

    const range = req.headers.get('range');
    const { Readable } = require('stream');

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      
      // Límite de chunk a 2MB para evitar saturación del buffer de red en móviles
      const MAX_CHUNK_SIZE = 2 * 1024 * 1024;
      let end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      
      const chunksize = (end - start) + 1;
      
      // Leer el archivo a memoria y servir la porción solicitada (evita bugs de Readable.toWeb en Next.js)
      const fileBuffer = await fs.promises.readFile(filePath);
      const chunk = fileBuffer.subarray(start, end + 1);

      return new NextResponse(chunk, {
        status: 206,
        headers: {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize.toString(),
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    }

    // Leer completo a memoria si no hay Range
    const fileBuffer = await fs.promises.readFile(filePath);

    const res = new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Accept-Ranges': 'bytes',
        'Content-Type': contentType,
        'Content-Length': fileSize.toString(),
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });

    return res;
  } catch (error) {
    console.error('[MEDIA API ERROR]:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
