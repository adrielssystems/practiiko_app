import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Redirige al logo canónico en la web pública de Practiiko.
// Esto garantiza que el crawler de Meta/YCloud siempre pueda obtener la imagen
// sin depender de volúmenes de Easypanel ni rutas internas de Docker.
export async function GET() {
  return NextResponse.redirect('https://www.practiiko.com/logo-p.jpeg', { status: 301 });
}

