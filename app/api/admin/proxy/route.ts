import { NextResponse } from 'next/server';
import { requireSession, AuthError } from '@/lib/session-helper';

export async function GET(req: Request) {
  try {
    await requireSession();

    const { searchParams } = new URL(req.url);
    const url = searchParams.get('url');
    const name = searchParams.get('name') ?? 'foto.jpg';

    if (!url) {
      return NextResponse.json({ error: 'Falta el parámetro url' }, { status: 400 });
    }

    // Only allow Tally storage and Cloudinary URLs to prevent open redirect abuse
    const allowedHosts = ['storage.tally.so', 'tally.so', 'cdn.tally.so', 'res.cloudinary.com'];
    try {
      const parsed = new URL(url);
      if (!allowedHosts.some((h) => parsed.hostname.endsWith(h))) {
        return NextResponse.json({ error: 'URL no permitida' }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ error: 'URL inválida' }, { status: 400 });
    }

    const fileRes = await fetch(url);
    if (!fileRes.ok) {
      return NextResponse.json({ error: 'No se pudo obtener el archivo' }, { status: 502 });
    }

    const contentType = fileRes.headers.get('content-type') ?? 'application/octet-stream';
    const buffer = await fileRes.arrayBuffer();

    return new Response(buffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(name)}"`,
        'Content-Length': String(buffer.byteLength),
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (e: unknown) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    const msg = e instanceof Error ? e.message : 'Error de red';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

