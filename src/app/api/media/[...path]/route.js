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
    const { Readable } = require('stream');
    const stream = fs.createReadStream(filePath);
    const webStream = Readable.toWeb(stream);

    let contentType = 'application/octet-stream';
    if (ext === '.webp') contentType = 'image/webp';
    else if (ext === '.png') contentType = 'image/png';
    else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
    else if (ext === '.mp4') contentType = 'video/mp4';

    const res = new NextResponse(webStream, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': stat.size.toString(),
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });

    return res;
  } catch (error) {
    console.error('[MEDIA API ERROR]:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
