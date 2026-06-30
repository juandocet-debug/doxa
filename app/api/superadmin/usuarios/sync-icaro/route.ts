import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireSuperAdmin, AuthError } from '@/lib/session-helper';

export async function POST() {
  try {
    await requireSuperAdmin();

    const icaroUrl = process.env.ICARO_API_URL;
    const icaroToken = process.env.ICARO_API_TOKEN;

    if (!icaroUrl || !icaroToken) {
      return NextResponse.json(
        { error: 'Configuración incompleta de Icaro (ICARO_API_URL o ICARO_API_TOKEN faltante)' },
        { status: 500 }
      );
    }

    let res = await fetch(`${icaroUrl}/api/auth/usuarios/`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${icaroToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (res.status === 401 || res.status === 403) {
      console.log('Sync Icaro: Bearer authentication returned unauthorized, trying with Token prefix...');
      const fallbackRes = await fetch(`${icaroUrl}/api/auth/usuarios/`, {
        method: 'GET',
        headers: {
          'Authorization': `Token ${icaroToken}`,
          'Content-Type': 'application/json',
        },
      });
      if (fallbackRes.ok) {
        res = fallbackRes;
      }
    }

    if (!res.ok) {
      const errText = await res.text();
      console.error('Failed to fetch users from Icaro:', errText, 'Status:', res.status);
      return NextResponse.json({ error: `Error de Icaro (Status ${res.status}): ${errText.slice(0, 120)}` }, { status: 502 });
    }

    const body = await res.json() as { ok: boolean; datos?: Array<{
      id: string | number;
      username: string;
      email?: string;
      nombre_completo: string;
      rolBase?: string;
    }> };

    const icaroUsers = body.datos || [];
    let syncedCount = 0;
    const now = new Date();

    for (const item of icaroUsers) {
      const extId = String(item.id);
      await prisma.doxaUsuario.upsert({
        where: { externalUserId: extId },
        update: {
          nombre: item.nombre_completo || item.username,
          email: item.email || null,
          documento: item.username || null,
          rolBase: item.rolBase || 'usuario',
          lastSyncedAt: now,
        },
        create: {
          externalUserId: extId,
          nombre: item.nombre_completo || item.username,
          email: item.email || null,
          documento: item.username || null,
          rolBase: item.rolBase || 'usuario',
          lastSyncedAt: now,
          activo: true,
        },
      });
      syncedCount++;
    }

    return NextResponse.json({ success: true, count: syncedCount });
  } catch (err: unknown) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error('Sync Icaro error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
