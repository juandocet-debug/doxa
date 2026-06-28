import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import * as XLSX from 'xlsx';
import { requireSession, AuthError } from '@/lib/session-helper';
import { SUPER_ADMIN_ID } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const currentUserId = await requireSession();
    const isSuperAdmin = currentUserId === SUPER_ADMIN_ID;

    const { searchParams } = new URL(request.url);
    const metaId = searchParams.get('metaId');
    const componenteId = searchParams.get('componenteId');
    const accionId = searchParams.get('accionId');
    const estado = searchParams.get('estado');
    const desde = searchParams.get('desde');
    const hasta = searchParams.get('hasta');

    const where: Record<string, unknown> = {};
    if (metaId) where.metaId = metaId;
    
    // Access control: Non-superadmin is locked to their own component
    if (!isSuperAdmin) {
      where.componenteId = currentUserId;
    } else {
      if (componenteId) where.componenteId = componenteId;
    }

    if (accionId) where.accionId = accionId;
    if (estado) where.estado = estado;
    if (desde || hasta) {
      where.fechaActividad = {};
      if (desde) (where.fechaActividad as Record<string, unknown>).gte = new Date(desde);
      if (hasta) (where.fechaActividad as Record<string, unknown>).lte = new Date(hasta);
    }


    const registros = await prisma.registro.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        meta: true,
        componente: true,
        accion: true,
        instancia: true,
        evidencias: {
          include: {
            evidenciaRequerida: true,
            archivos: true,
          },
        },
      },
    });

    // Flatten: one row per evidencia per registro
    const rows: Record<string, unknown>[] = [];

    for (const reg of registros) {
      if (reg.evidencias.length === 0) {
        rows.push({
          'ID Registro': reg.id,
          'Meta': reg.meta.nombre,
          'Componente': reg.componente.nombre,
          'Acción': reg.accion.nombre,
          'Instancia': reg.instancia?.nombre || '',
          'Fecha Actividad': new Date(reg.fechaActividad).toLocaleDateString('es-CO'),
          'Responsable': reg.responsable,
          'Municipio': reg.municipio,
          'Localidad': reg.localidad || '',
          'Lugar': reg.lugar || '',
          'Estado Registro': reg.estado,
          'Observaciones': reg.observaciones || '',
          'Creado Por': reg.createdBy,
          'Fecha Creación': new Date(reg.createdAt).toLocaleDateString('es-CO'),
          'Evidencia': '',
          'Estado Evidencia': '',
          'Archivos Cargados': 0,
          'Observación Revisión': '',
          'Revisado Por': '',
          'Fecha Revisión': '',
        });
      } else {
        for (const ev of reg.evidencias) {
          rows.push({
            'ID Registro': reg.id,
            'Meta': reg.meta.nombre,
            'Componente': reg.componente.nombre,
            'Acción': reg.accion.nombre,
            'Instancia': reg.instancia?.nombre || '',
            'Fecha Actividad': new Date(reg.fechaActividad).toLocaleDateString('es-CO'),
            'Responsable': reg.responsable,
            'Municipio': reg.municipio,
            'Localidad': reg.localidad || '',
            'Lugar': reg.lugar || '',
            'Estado Registro': reg.estado,
            'Observaciones': reg.observaciones || '',
            'Creado Por': reg.createdBy,
            'Fecha Creación': new Date(reg.createdAt).toLocaleDateString('es-CO'),
            'Evidencia': ev.evidenciaRequerida.nombre,
            'Estado Evidencia': ev.estado,
            'Archivos Cargados': ev.archivos.length,
            'Observación Revisión': ev.observacionRevision || '',
            'Revisado Por': ev.reviewedBy || '',
            'Fecha Revisión': ev.reviewedAt ? new Date(ev.reviewedAt).toLocaleDateString('es-CO') : '',
          });
        }
      }
    }

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Registros');

    // Auto-width columns
    const colWidths = Object.keys(rows[0] || {}).map((key) => ({
      wch: Math.max(key.length, 15),
    }));
    worksheet['!cols'] = colWidths;

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="registros-evidencias-${Date.now()}.xlsx"`,
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Error generating Excel:', error);
    return NextResponse.json({ error: 'Error al generar Excel' }, { status: 500 });
  }
}
