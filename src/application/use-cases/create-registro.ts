import { prisma } from '@/lib/db';

export interface CreateRegistroInput {
  metaId: string;
  componenteId: string;
  accionId: string;
  instanciaAccionId?: string | null;
  fechaActividad: Date;
  responsable: string;
  municipio: string;
  localidad?: string | null;
  lugar?: string | null;
  observaciones?: string | null;
  createdBy: string;
}

export async function createRegistro(input: CreateRegistroInput) {
  const evidenciasReq = await prisma.evidenciaRequerida.findMany({
    where: { accionId: input.accionId, estado: 'activa' },
    orderBy: { orden: 'asc' },
  });

  return await prisma.registro.create({
    data: {
      metaId: input.metaId,
      componenteId: input.componenteId,
      accionId: input.accionId,
      instanciaAccionId: input.instanciaAccionId || null,
      fechaActividad: input.fechaActividad,
      responsable: input.responsable,
      municipio: input.municipio,
      localidad: input.localidad || null,
      lugar: input.lugar || null,
      observaciones: input.observaciones || null,
      estado: 'borrador',
      createdBy: input.createdBy,
      evidencias: {
        create: evidenciasReq.map((er: { id: string }) => ({
          evidenciaRequeridaId: er.id,
          estado: 'pendiente',
        })),
      },
    },
    include: {
      evidencias: {
        include: {
          evidenciaRequerida: true,
        },
      },
    },
  });
}
