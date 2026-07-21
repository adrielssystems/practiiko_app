import { NextResponse } from 'next/server';
import { processImage, processVideo } from '@/lib/media';

export async function POST(req) {
  try {
    const { searchParams } = new URL(req.url);
    const queryType = searchParams.get('type');
    const queryFilename = searchParams.get('filename') || 'video.mp4';

    let result;

    if (queryType) {
      // Carga directa de binario (Raw Binary Stream) para saltar límites de memoria de FormData en archivos grandes
      if (!req.body) {
        return NextResponse.json({ error: 'No se recibió ningún cuerpo de archivo' }, { status: 400 });
      }

      if (queryType === 'video') {
        result = await processVideo(req.body, queryFilename);
      } else {
        const arrayBuffer = await req.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        result = await processImage(buffer);
      }
    } else {
      // Fallback tradicional con FormData (para imágenes ligeras o flujos antiguos)
      const formData = await req.formData();
      const file = formData.get('file');
      const type = formData.get('type'); // 'image' or 'video'

      if (!file) {
        return NextResponse.json({ error: 'No se subió ningún archivo' }, { status: 400 });
      }

      if (type === 'video') {
        result = await processVideo(file.stream(), file.name);
      } else {
        const buffer = Buffer.from(await file.arrayBuffer());
        result = await processImage(buffer);
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('[UPLOAD ERROR]:', error?.stack || error);
    return NextResponse.json(
      { error: error?.message || 'Error al procesar el archivo' },
      { status: 500 }
    );
  }
}
