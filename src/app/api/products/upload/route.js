import { NextResponse } from 'next/server';
import { processImage, processVideo } from '@/lib/media';

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');
    const type = formData.get('type'); // 'image' or 'video'

    if (!file) {
      return NextResponse.json({ error: 'No se subió ningún archivo' }, { status: 400 });
    }

    let result;

    if (type === 'video') {
      // Para videos, pasamos el objeto File directamente para procesarlo mediante streams
      result = await processVideo(file);
    } else {
      // Para imágenes (ligeras), el buffer en memoria es seguro
      const buffer = Buffer.from(await file.arrayBuffer());
      result = await processImage(buffer);
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
