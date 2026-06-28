// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PrismaClient } = require('@prisma/client');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');
import path from 'path';

const dbPath = path.resolve(process.cwd(), 'prisma', 'dev.db');
const adapter = new PrismaBetterSqlite3({ url: dbPath });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const prisma = new PrismaClient({ adapter }) as any;

async function main() {
  console.log('Seeding database...');

  // ── META ──────────────────────────────────────────────────────────────────
  const meta = await prisma.meta.upsert({
    where: { id: 'meta-001' },
    update: {},
    create: {
      id: 'meta-001',
      nombre: 'Prevención del feminicidio y la violencia contra la mujer',
      descripcion: 'Meta de prevención y atención de violencias basadas en género en la localidad de Usme',
      estado: 'activa',
    },
  });
  console.log('Meta created:', meta.nombre);

  // ── COMPONENTE 1 ──────────────────────────────────────────────────────────
  const comp1 = await prisma.componente.upsert({
    where: { id: 'comp-001' },
    update: {},
    create: {
      id: 'comp-001',
      metaId: meta.id,
      nombre: 'Toma Unidas por la libertad y la seguridad de las mujeres afro usmeñas',
      descripcion: 'Acciones de empoderamiento y seguridad para mujeres afro en Usme',
      estado: 'activo',
      orden: 1,
    },
  });

  // Accion 1.1 - Clases (requiere instancia, 10 instancias, 3 evidencias)
  const accion1_1 = await prisma.accion.upsert({
    where: { id: 'accion-001-001' },
    update: {},
    create: {
      id: 'accion-001-001',
      componenteId: comp1.id,
      nombre: 'Clases',
      descripcion: 'Clases de formación para mujeres afro usmeñas',
      requiereInstancia: true,
      tipoInstancia: 'Clase',
      cantidadInstancias: 10,
      estado: 'activa',
      orden: 1,
    },
  });

  for (let i = 1; i <= 10; i++) {
    await prisma.instanciaAccion.upsert({
      where: { id: `inst-001-001-${String(i).padStart(2, '0')}` },
      update: {},
      create: {
        id: `inst-001-001-${String(i).padStart(2, '0')}`,
        accionId: accion1_1.id,
        nombre: `Clase ${i}`,
        numero: i,
        tipo: 'Clase',
        estado: 'activa',
        orden: i,
      },
    });
  }

  const evReq1_1 = [
    { id: 'ev-req-001-001-01', nombre: 'Fotografías del desarrollo de la clase', orden: 1 },
    { id: 'ev-req-001-001-02', nombre: 'Lista de asistencia firmada', orden: 2 },
    { id: 'ev-req-001-001-03', nombre: 'Material didáctico utilizado', orden: 3 },
  ];
  for (const ev of evReq1_1) {
    await prisma.evidenciaRequerida.upsert({
      where: { id: ev.id },
      update: {},
      create: { ...ev, accionId: accion1_1.id, tipoArchivo: 'foto', multiple: true, obligatorio: true, estado: 'activa' },
    });
  }

  // Accion 1.2 - Feria/Evento (5 evidencias, sin instancias)
  const accion1_2 = await prisma.accion.upsert({
    where: { id: 'accion-001-002' },
    update: {},
    create: {
      id: 'accion-001-002',
      componenteId: comp1.id,
      nombre: 'Feria/Evento',
      descripcion: 'Feria o evento de empoderamiento para mujeres afro usmeñas',
      requiereInstancia: false,
      estado: 'activa',
      orden: 2,
    },
  });

  const evReq1_2 = [
    { id: 'ev-req-001-002-01', nombre: 'Fotografías del evento', orden: 1 },
    { id: 'ev-req-001-002-02', nombre: 'Lista de asistencia firmada', orden: 2 },
    { id: 'ev-req-001-002-03', nombre: 'Material de difusión', orden: 3 },
    { id: 'ev-req-001-002-04', nombre: 'Registro fotográfico de participantes', orden: 4 },
    { id: 'ev-req-001-002-05', nombre: 'Acta o relatoría del evento', orden: 5 },
  ];
  for (const ev of evReq1_2) {
    await prisma.evidenciaRequerida.upsert({
      where: { id: ev.id },
      update: {},
      create: { ...ev, accionId: accion1_2.id, tipoArchivo: 'foto', multiple: true, obligatorio: true, estado: 'activa' },
    });
  }

  // ── COMPONENTE 2 ──────────────────────────────────────────────────────────
  const comp2 = await prisma.componente.upsert({
    where: { id: 'comp-002' },
    update: {},
    create: {
      id: 'comp-002',
      metaId: meta.id,
      nombre: 'Círculos de la palabra: tejiendo los derechos de las mujeres',
      descripcion: 'Espacios de diálogo y construcción colectiva de derechos para mujeres',
      estado: 'activo',
      orden: 2,
    },
  });

  // Accion 2.1 - Clases (10 instancias, 3 evidencias)
  const accion2_1 = await prisma.accion.upsert({
    where: { id: 'accion-002-001' },
    update: {},
    create: {
      id: 'accion-002-001',
      componenteId: comp2.id,
      nombre: 'Clases',
      descripcion: 'Clases en el marco de los círculos de la palabra',
      requiereInstancia: true,
      tipoInstancia: 'Clase',
      cantidadInstancias: 10,
      estado: 'activa',
      orden: 1,
    },
  });

  for (let i = 1; i <= 10; i++) {
    await prisma.instanciaAccion.upsert({
      where: { id: `inst-002-001-${String(i).padStart(2, '0')}` },
      update: {},
      create: {
        id: `inst-002-001-${String(i).padStart(2, '0')}`,
        accionId: accion2_1.id,
        nombre: `Clase ${i}`,
        numero: i,
        tipo: 'Clase',
        estado: 'activa',
        orden: i,
      },
    });
  }

  const evReq2_1 = [
    { id: 'ev-req-002-001-01', nombre: 'Fotografías del círculo de la palabra', orden: 1 },
    { id: 'ev-req-002-001-02', nombre: 'Lista de asistencia firmada', orden: 2 },
    { id: 'ev-req-002-001-03', nombre: 'Registro de acuerdos y compromisos', orden: 3 },
  ];
  for (const ev of evReq2_1) {
    await prisma.evidenciaRequerida.upsert({
      where: { id: ev.id },
      update: {},
      create: { ...ev, accionId: accion2_1.id, tipoArchivo: 'foto', multiple: true, obligatorio: true, estado: 'activa' },
    });
  }

  // Accion 2.2 - Encuentro (5 evidencias)
  const accion2_2 = await prisma.accion.upsert({
    where: { id: 'accion-002-002' },
    update: {},
    create: {
      id: 'accion-002-002',
      componenteId: comp2.id,
      nombre: 'Encuentro',
      descripcion: 'Encuentro comunitario de tejido de derechos de las mujeres',
      requiereInstancia: false,
      estado: 'activa',
      orden: 2,
    },
  });

  const evReq2_2 = [
    { id: 'ev-req-002-002-01', nombre: 'Fotografías del encuentro', orden: 1 },
    { id: 'ev-req-002-002-02', nombre: 'Lista de asistencia firmada', orden: 2 },
    { id: 'ev-req-002-002-03', nombre: 'Materiales producidos en el encuentro', orden: 3 },
    { id: 'ev-req-002-002-04', nombre: 'Registro audiovisual', orden: 4 },
    { id: 'ev-req-002-002-05', nombre: 'Acta del encuentro', orden: 5 },
  ];
  for (const ev of evReq2_2) {
    await prisma.evidenciaRequerida.upsert({
      where: { id: ev.id },
      update: {},
      create: { ...ev, accionId: accion2_2.id, tipoArchivo: 'foto', multiple: true, obligatorio: true, estado: 'activa' },
    });
  }

  // ── COMPONENTE 3 ──────────────────────────────────────────────────────────
  const comp3 = await prisma.componente.upsert({
    where: { id: 'comp-003' },
    update: {},
    create: {
      id: 'comp-003',
      metaId: meta.id,
      nombre: 'Por la no violencia y la vida de las mujeres campesinas y rurales',
      descripcion: 'Acciones para la prevención de violencias en contextos rurales y campesinos',
      estado: 'activo',
      orden: 3,
    },
  });

  // Accion 3.1 - Clases (10 instancias, 4 evidencias)
  const accion3_1 = await prisma.accion.upsert({
    where: { id: 'accion-003-001' },
    update: {},
    create: {
      id: 'accion-003-001',
      componenteId: comp3.id,
      nombre: 'Clases',
      descripcion: 'Clases para mujeres campesinas y rurales',
      requiereInstancia: true,
      tipoInstancia: 'Clase',
      cantidadInstancias: 10,
      estado: 'activa',
      orden: 1,
    },
  });

  for (let i = 1; i <= 10; i++) {
    await prisma.instanciaAccion.upsert({
      where: { id: `inst-003-001-${String(i).padStart(2, '0')}` },
      update: {},
      create: {
        id: `inst-003-001-${String(i).padStart(2, '0')}`,
        accionId: accion3_1.id,
        nombre: `Clase ${i}`,
        numero: i,
        tipo: 'Clase',
        estado: 'activa',
        orden: i,
      },
    });
  }

  const evReq3_1 = [
    { id: 'ev-req-003-001-01', nombre: 'Fotografías del desarrollo de la clase', orden: 1 },
    { id: 'ev-req-003-001-02', nombre: 'Lista de asistencia firmada', orden: 2 },
    { id: 'ev-req-003-001-03', nombre: 'Material didáctico utilizado', orden: 3 },
    { id: 'ev-req-003-001-04', nombre: 'Registro de compromisos de las participantes', orden: 4 },
  ];
  for (const ev of evReq3_1) {
    await prisma.evidenciaRequerida.upsert({
      where: { id: ev.id },
      update: {},
      create: { ...ev, accionId: accion3_1.id, tipoArchivo: 'foto', multiple: true, obligatorio: true, estado: 'activa' },
    });
  }

  // Accion 3.2 - Desarrollo de murales/Evento (5 evidencias)
  const accion3_2 = await prisma.accion.upsert({
    where: { id: 'accion-003-002' },
    update: {},
    create: {
      id: 'accion-003-002',
      componenteId: comp3.id,
      nombre: 'Desarrollo de murales/Evento',
      descripcion: 'Creación de murales artísticos por la no violencia',
      requiereInstancia: false,
      estado: 'activa',
      orden: 2,
    },
  });

  const evReq3_2 = [
    { id: 'ev-req-003-002-01', nombre: 'Fotografías del proceso de creación del mural', orden: 1 },
    { id: 'ev-req-003-002-02', nombre: 'Fotografía del mural terminado', orden: 2 },
    { id: 'ev-req-003-002-03', nombre: 'Lista de participantes', orden: 3 },
    { id: 'ev-req-003-002-04', nombre: 'Registro fotográfico de participantes', orden: 4 },
    { id: 'ev-req-003-002-05', nombre: 'Acta del evento', orden: 5 },
  ];
  for (const ev of evReq3_2) {
    await prisma.evidenciaRequerida.upsert({
      where: { id: ev.id },
      update: {},
      create: { ...ev, accionId: accion3_2.id, tipoArchivo: 'foto', multiple: true, obligatorio: true, estado: 'activa' },
    });
  }

  // Accion 3.3 - Instalación de alarmas (3 evidencias)
  const accion3_3 = await prisma.accion.upsert({
    where: { id: 'accion-003-003' },
    update: {},
    create: {
      id: 'accion-003-003',
      componenteId: comp3.id,
      nombre: 'Instalación de alarmas',
      descripcion: 'Instalación de sistemas de alarma comunitaria para mujeres rurales',
      requiereInstancia: false,
      estado: 'activa',
      orden: 3,
    },
  });

  const evReq3_3 = [
    { id: 'ev-req-003-003-01', nombre: 'Fotografías de la instalación', orden: 1 },
    { id: 'ev-req-003-003-02', nombre: 'Acta de entrega y recepción', orden: 2 },
    { id: 'ev-req-003-003-03', nombre: 'Registro de beneficiarias', orden: 3 },
  ];
  for (const ev of evReq3_3) {
    await prisma.evidenciaRequerida.upsert({
      where: { id: ev.id },
      update: {},
      create: { ...ev, accionId: accion3_3.id, tipoArchivo: 'foto', multiple: true, obligatorio: true, estado: 'activa' },
    });
  }

  // ── COMPONENTE 4 ──────────────────────────────────────────────────────────
  const comp4 = await prisma.componente.upsert({
    where: { id: 'comp-004' },
    update: {},
    create: {
      id: 'comp-004',
      metaId: meta.id,
      nombre: 'Previniendo el feminicidio desde los derechos de las mujeres',
      descripcion: 'Acciones de prevención del feminicidio con enfoque de derechos',
      estado: 'activo',
      orden: 4,
    },
  });

  // Accion 4.1 - Clases (10 instancias, 4 evidencias)
  const accion4_1 = await prisma.accion.upsert({
    where: { id: 'accion-004-001' },
    update: {},
    create: {
      id: 'accion-004-001',
      componenteId: comp4.id,
      nombre: 'Clases',
      descripcion: 'Clases de derechos para la prevención del feminicidio',
      requiereInstancia: true,
      tipoInstancia: 'Clase',
      cantidadInstancias: 10,
      estado: 'activa',
      orden: 1,
    },
  });

  for (let i = 1; i <= 10; i++) {
    await prisma.instanciaAccion.upsert({
      where: { id: `inst-004-001-${String(i).padStart(2, '0')}` },
      update: {},
      create: {
        id: `inst-004-001-${String(i).padStart(2, '0')}`,
        accionId: accion4_1.id,
        nombre: `Clase ${i}`,
        numero: i,
        tipo: 'Clase',
        estado: 'activa',
        orden: i,
      },
    });
  }

  const evReq4_1 = [
    { id: 'ev-req-004-001-01', nombre: 'Fotografías del desarrollo de la clase', orden: 1 },
    { id: 'ev-req-004-001-02', nombre: 'Lista de asistencia firmada', orden: 2 },
    { id: 'ev-req-004-001-03', nombre: 'Material didáctico utilizado', orden: 3 },
    { id: 'ev-req-004-001-04', nombre: 'Productos generados por las participantes', orden: 4 },
  ];
  for (const ev of evReq4_1) {
    await prisma.evidenciaRequerida.upsert({
      where: { id: ev.id },
      update: {},
      create: { ...ev, accionId: accion4_1.id, tipoArchivo: 'foto', multiple: true, obligatorio: true, estado: 'activa' },
    });
  }

  // Accion 4.2 - Batucada/Evento (5 evidencias)
  const accion4_2 = await prisma.accion.upsert({
    where: { id: 'accion-004-002' },
    update: {},
    create: {
      id: 'accion-004-002',
      componenteId: comp4.id,
      nombre: 'Batucada/Evento',
      descripcion: 'Batucada y evento cultural por la prevención del feminicidio',
      requiereInstancia: false,
      estado: 'activa',
      orden: 2,
    },
  });

  const evReq4_2 = [
    { id: 'ev-req-004-002-01', nombre: 'Fotografías del evento/batucada', orden: 1 },
    { id: 'ev-req-004-002-02', nombre: 'Lista de participantes', orden: 2 },
    { id: 'ev-req-004-002-03', nombre: 'Material de difusión del evento', orden: 3 },
    { id: 'ev-req-004-002-04', nombre: 'Registro fotográfico de la comunidad', orden: 4 },
    { id: 'ev-req-004-002-05', nombre: 'Acta o relatoría del evento', orden: 5 },
  ];
  for (const ev of evReq4_2) {
    await prisma.evidenciaRequerida.upsert({
      where: { id: ev.id },
      update: {},
      create: { ...ev, accionId: accion4_2.id, tipoArchivo: 'foto', multiple: true, obligatorio: true, estado: 'activa' },
    });
  }

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
