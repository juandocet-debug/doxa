import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const metas = await prisma.meta.findMany({
      where: { estado: 'activa' },
      orderBy: { createdAt: 'asc' },
      include: {
        componentes: {
          where: { estado: 'activo' },
          orderBy: { orden: 'asc' },
          include: {
            acciones: {
              where: { estado: 'activa' },
              orderBy: { orden: 'asc' },
              include: {
                instancias: {
                  where: { estado: 'activa' },
                  orderBy: { orden: 'asc' },
                },
                evidenciasReq: {
                  where: { estado: 'activa' },
                  orderBy: { orden: 'asc' },
                },
              },
            },
          },
        },
      },
    });
    return NextResponse.json({ metas });
  } catch (error) {
    console.error('Error fetching estructura:', error);
    return NextResponse.json({ error: 'Error al obtener la estructura' }, { status: 500 });
  }
}
