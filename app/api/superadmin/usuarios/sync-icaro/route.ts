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

    const res = await fetch(`${icaroUrl}/api/users`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${icaroToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('Failed to fetch users from Icaro:', errText);
      return NextResponse.json({ error: 'Error al consultar usuarios desde Icaro' }, { status: 502 });
    }

    const icaroUsers = await res.json() as Array<{
      id: string | number;
      nombre: string;
      email?: string;
      documento?: string;
      rolBase?: string;
    }>;

    let syncedCount = 0;
    const now = new Date();

    for (const item of icaroUsers) {
      const extId = String(item.id);
      await prisma.doxaUsuario.upsert({
        where: { externalUserId: extId },
        update: {
          nombre: item.nombre,
          email: item.email || null,
          documento: item.documento || null,
          rolBase: item.rolBase || 'usuario',
          lastSyncedAt: now,
        },
        create: {
          externalUserId: extId,
          nombre: item.nombre,
          email: item.email || null,
          documento: item.documento || null,
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
