import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(req, { params }) {
  try {
    const { path: pathArray } = await params;
    // El pathArray contendrá el nombre del archivo. Las imágenes están en 'products'
    const filePath = path.join(process.cwd(), 'public', 'uploads', 'products', ...pathArray);

    if (!fs.existsSync(filePath)) {
      return new NextResponse('File not found', { status: 404 });
    }

    const stat = fs.statSync(filePath);
    const { Readable } = require('stream');
    const stream = fs.createReadStream(filePath);
    const webStream = Readable.toWeb(stream);

    // Determine content type based on extension
    const ext = path.extname(filePath).toLowerCase();
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
