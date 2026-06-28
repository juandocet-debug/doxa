/**
 * Crea 4 formularios en Tally (uno por Componente) con lógica condicional:
 * Acción → si Clases → Clase 1-10 → evidencias
 *       → si otro → evidencias directas
 *
 * Ejecutar: npx tsx scripts/crear-forms-tally.ts
 */

import path from 'path';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PrismaClient } = require('@prisma/client');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');

const dbPath = path.resolve(process.cwd(), 'prisma', 'dev.db');
const adapter = new PrismaBetterSqlite3({ url: dbPath });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const prisma = new PrismaClient({ adapter } as any);

if (!process.env.TALLY_API_KEY) {
  throw new Error("CRITICAL CONFIGURATION ERROR: TALLY_API_KEY is not set in the environment.");
}
const KEY = process.env.TALLY_API_KEY;
const MCP_URL = process.env.TALLY_MCP_URL || 'https://api.tally.so/mcp';


// ────────────────────────────────────────────────────────────
// MCP CLIENT
// ────────────────────────────────────────────────────────────
class McpClient {
  private sessionId: string | null = null;
  private rid = 0;

  async send(method: string, params: unknown) {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${KEY}`,
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
    };
    if (this.sessionId) headers['Mcp-Session-Id'] = this.sessionId;

    const res = await fetch(MCP_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({ jsonrpc: '2.0', method, params, id: ++this.rid }),
    });

    const sid = res.headers.get('Mcp-Session-Id');
    if (sid) this.sessionId = sid;

    const text = await res.text();
    for (const chunk of text.split('\n\n').reverse()) {
      for (const line of chunk.split('\n')) {
        if (line.startsWith('data: ')) {
          try {
            const d = JSON.parse(line.slice(6));
            if (d.result !== undefined || d.error !== undefined) {
              if (d.error) throw new Error(`MCP ${method}: ${JSON.stringify(d.error)}`);
              return d;
            }
          } catch (e) { if ((e as Error).message.startsWith('MCP')) throw e; }
        }
      }
    }
    throw new Error(`Sin respuesta SSE para ${method}`);
  }

  async notify(method: string, params: unknown = {}) {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${KEY}`,
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
    };
    if (this.sessionId) headers['Mcp-Session-Id'] = this.sessionId;
    const res = await fetch(MCP_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({ jsonrpc: '2.0', method, params }),
    });
    await res.text();
  }

  async tool(name: string, args: Record<string, unknown> = {}) {
    return this.send('tools/call', { name, arguments: args });
  }
}

// ────────────────────────────────────────────────────────────
// HELPERS
// ────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toolResult(raw: any): any {
  const content: { type: string; text: string }[] = raw?.result?.content ?? [];
  for (const item of content) {
    if (item.type === 'text' && item.text?.startsWith('{')) {
      try { return JSON.parse(item.text); } catch { /* skip */ }
    }
  }
  return raw?.result ?? null;
}

function parseQuestions(ledger: string): { questionUuid: string; nombre: string }[] {
  const result: { questionUuid: string; nombre: string }[] = [];
  const seen = new Set<string>();
  for (const row of ledger.split('\n')) {
    if (!row.includes('| TITLE |')) continue;
    const cols = row.split('|').map(c => c.trim());
    const questionUuid = cols[5];
    const nombre = cols[2];
    if (questionUuid && questionUuid !== '-' && questionUuid !== 'questionUuid' && !seen.has(questionUuid)) {
      seen.add(questionUuid);
      result.push({ questionUuid, nombre });
    }
  }
  return result;
}

function parseOptions(ledger: string, questionUuid: string): { text: string; blockUuid: string }[] {
  const result: { text: string; blockUuid: string }[] = [];
  for (const row of ledger.split('\n')) {
    if (!row.includes('| DROPDOWN_OPTION |')) continue;
    const cols = row.split('|').map(c => c.trim());
    if (cols[5] === questionUuid) result.push({ text: cols[2], blockUuid: cols[3] });
  }
  return result;
}

// ────────────────────────────────────────────────────────────
// DATOS DE LOS 4 COMPONENTES
// ────────────────────────────────────────────────────────────
const COMPONENTES = [
  {
    dbId: 'comp_1',
    nombre: 'Toma Unidas por la libertad y la seguridad de las mujeres afro usmeñas',
    acciones: [
      { nombre: 'Clases', requiereInstancia: true,  evidencias: ['Plan de clase', 'Registro fotográfico', 'Lista de asistencia'] },
      { nombre: 'Feria / Evento', requiereInstancia: false, evidencias: ['Planeación del evento', 'Registro fotográfico', 'Lista de asistencia', 'Lista de entrega de implementos', 'Fotos de logística'] },
    ],
  },
  {
    dbId: 'comp_2',
    nombre: 'Círculos de la palabra: tejiendo los derechos de las mujeres',
    acciones: [
      { nombre: 'Clases', requiereInstancia: true,  evidencias: ['Plan de clase', 'Registro fotográfico', 'Lista de asistencia'] },
      { nombre: 'Encuentro', requiereInstancia: false, evidencias: ['Planeación del encuentro', 'Registro fotográfico', 'Lista de asistencia', 'Entrega de implementos', 'Fotos de logística'] },
    ],
  },
  {
    dbId: 'comp_3',
    nombre: 'Por la no violencia y la vida de las mujeres campesinas y rurales',
    acciones: [
      { nombre: 'Clases', requiereInstancia: true,  evidencias: ['Plan de clase', 'Registro fotográfico', 'Lista de asistencia', 'Lista de entrega de implementos'] },
      { nombre: 'Desarrollo de murales / Evento', requiereInstancia: false, evidencias: ['Planeación del evento', 'Registro fotográfico', 'Lista de asistencia', 'Lista de entrega de implementos', 'Fotos de logística'] },
      { nombre: 'Instalación de alarmas', requiereInstancia: false, evidencias: ['Acta de reunión', 'Registro fotográfico', 'Lista de entrega de implementos'] },
    ],
  },
  {
    dbId: 'comp_4',
    nombre: 'Previniendo el feminicidio desde los derechos de las mujeres',
    acciones: [
      { nombre: 'Clases', requiereInstancia: true,  evidencias: ['Plan de clase', 'Registro fotográfico', 'Lista de asistencia', 'Lista de entrega de implementos'] },
      { nombre: 'Batucada / Evento', requiereInstancia: false, evidencias: ['Planeación del evento', 'Registro fotográfico', 'Lista de asistencia', 'Lista de entrega de implementos', 'Fotos de logística'] },
    ],
  },
];

// ────────────────────────────────────────────────────────────
// CREAR UN FORMULARIO TALLY
// ────────────────────────────────────────────────────────────
async function crearFormComponente(comp: typeof COMPONENTES[0]) {
  console.log(`\n📋 Creando form para: ${comp.nombre}`);
  const mcp = new McpClient();

  await mcp.send('initialize', {
    protocolVersion: '2024-11-05', capabilities: {},
    clientInfo: { name: 'evidencias-system', version: '1.0' },
  });
  await mcp.notify('notifications/initialized');

  // 1. Crear formulario
  const createRes = toolResult(await mcp.tool('create_new_form', {
    title: comp.nombre,
    submitButtonText: 'Enviar evidencias',
  }));
  const titleBlockUuid: string = createRes?.blockUuids?.[0];
  if (!titleBlockUuid) throw new Error('No se obtuvo titleBlockUuid');
  console.log('  ✓ Formulario creado');

  // 2. Definir grupos de bloques
  const clasesAccion = comp.acciones.find(a => a.requiereInstancia);
  const otrasAcciones = comp.acciones.filter(a => !a.requiereInstancia);

  const groups = [
    // ── INFO FIELDS (siempre visibles) ──────────────────────
    { blocks: [{ type: 'TITLE', html: 'Fecha de la actividad' }, { type: 'INPUT_DATE' }], insertAfterBlockUuid: titleBlockUuid },
    { blocks: [{ type: 'TITLE', html: 'Responsable' }, { type: 'INPUT_TEXT', placeholder: 'Nombre del responsable' }], insertAfterBlockUuid: titleBlockUuid },
    { blocks: [{ type: 'TITLE', html: 'Municipio' }, { type: 'INPUT_TEXT', placeholder: 'Municipio' }], insertAfterBlockUuid: titleBlockUuid },
    { blocks: [{ type: 'TITLE', html: 'Localidad' }, { type: 'INPUT_TEXT', placeholder: 'Localidad (opcional)' }], insertAfterBlockUuid: titleBlockUuid },
    { blocks: [{ type: 'TITLE', html: 'Lugar' }, { type: 'INPUT_TEXT', placeholder: 'Lugar de la actividad (opcional)' }], insertAfterBlockUuid: titleBlockUuid },
    { blocks: [{ type: 'TITLE', html: 'Observaciones generales' }, { type: 'TEXTAREA', placeholder: 'Observaciones (opcional)' }], insertAfterBlockUuid: titleBlockUuid },
    // ── ACCIÓN DROPDOWN ─────────────────────────────────────
    {
      blocks: [
        { type: 'TITLE', html: '¿Qué acción vas a registrar?' },
        ...comp.acciones.map(a => ({ type: 'DROPDOWN_OPTION', text: a.nombre })),
      ],
      insertAfterBlockUuid: titleBlockUuid,
    },
    // ── NÚMERO DE CLASE (solo si existe acción con instancia) ─
    ...(clasesAccion ? [{
      blocks: [
        { type: 'TITLE', html: 'Número de clase' },
        ...Array.from({ length: 10 }, (_, i) => ({ type: 'DROPDOWN_OPTION', text: `Clase ${i + 1}` })),
      ],
      insertAfterBlockUuid: titleBlockUuid,
    }] : []),
    // ── EVIDENCIAS DE CLASES (ocultas por defecto) ───────────
    ...(clasesAccion ? clasesAccion.evidencias.map(ev => ({
      blocks: [{ type: 'TITLE', html: ev }, { type: 'FILE_UPLOAD' }],
      insertAfterBlockUuid: titleBlockUuid,
    })) : []),
    // ── EVIDENCIAS DE OTRAS ACCIONES (ocultas por defecto) ───
    ...otrasAcciones.flatMap(accion =>
      accion.evidencias.map(ev => ({
        blocks: [{ type: 'TITLE', html: ev }, { type: 'FILE_UPLOAD' }],
        insertAfterBlockUuid: titleBlockUuid,
      }))
    ),
  ];

  // Enviar grupos en lotes de máximo 3 grupos por llamada
  const BATCH = 3;
  let lastLedger = '';
  let lastBlockUuid = titleBlockUuid;

  for (let i = 0; i < groups.length; i += BATCH) {
    const batch = groups.slice(i, i + BATCH).map((g, idx) => ({
      ...g,
      insertAfterBlockUuid: idx === 0 ? lastBlockUuid : titleBlockUuid,
    }));
    // Solo el primer grupo del lote usa lastBlockUuid, el resto cadena
    const batchFixed = batch.map((g, idx) => ({
      blocks: g.blocks,
      insertAfterBlockUuid: idx === 0 ? lastBlockUuid : lastBlockUuid,
    }));

    const batchRaw = await mcp.tool('create_blocks', { groups: batchFixed });
    const batchRes = toolResult(batchRaw);
    if (!batchRes) {
      const errText = batchRaw?.result?.content?.[0]?.text || 'sin detalle';
      throw new Error(`create_blocks lote ${i}-${i+BATCH} falló: ${errText.slice(0, 200)}`);
    }
    if (batchRes.context?.ledger) lastLedger = batchRes.context.ledger;
    // El último blockUuid del lote para encadenar el siguiente
    const uuids: string[] = batchRes.blockUuids ?? [];
    if (uuids.length > 0) lastBlockUuid = uuids[uuids.length - 1];
    console.log(`    Lote ${Math.floor(i/BATCH)+1}/${Math.ceil(groups.length/BATCH)}: ${uuids.length} bloques`);
  }

  const ledger = lastLedger;
  if (!ledger) throw new Error('No se obtuvo ledger tras todos los lotes');

  // 3. Parsear questionUuids en orden
  const questions = parseQuestions(ledger);
  // Índices:
  // 0-5: info fields (fecha, responsable, municipio, localidad, lugar, observaciones)
  // 6: Acción dropdown
  // 7: Número de clase (si hay Clases)
  // 7+: evidencias clases (si hay Clases)
  // luego: evidencias otras acciones

  const accionQuestion = questions[6];
  if (!accionQuestion) throw new Error('No se encontró la pregunta de Acción');

  const accionOptions = parseOptions(ledger, accionQuestion.questionUuid);
  console.log(`  ✓ Bloques creados. Opciones de acción: ${accionOptions.map(o => o.text).join(', ')}`);

  // Calcular índices de preguntas de evidencias
  let qIdx = 7;
  const operations: { operation: string; dsl: string }[] = [];

  // Si hay Clases
  if (clasesAccion) {
    const claseQuestion = questions[qIdx++]; // Número de clase
    const clasesOption = accionOptions.find(o => o.text === clasesAccion.nombre);

    if (clasesOption && claseQuestion) {
      // Mostrar "Número de clase" cuando Acción = Clases
      operations.push({
        operation: 'insert',
        dsl: `WHEN ${accionQuestion.questionUuid} IS ${clasesOption.blockUuid} THEN SHOW ${claseQuestion.questionUuid}`,
      });

      // Mostrar cada evidencia de Clases cuando Acción = Clases
      for (let i = 0; i < clasesAccion.evidencias.length; i++) {
        const evQ = questions[qIdx++];
        if (evQ) {
          operations.push({
            operation: 'insert',
            dsl: `WHEN ${accionQuestion.questionUuid} IS ${clasesOption.blockUuid} THEN SHOW ${evQ.questionUuid}`,
          });
        }
      }
    }
  }

  // Para cada otra acción: mostrar sus evidencias
  for (const accion of otrasAcciones) {
    const accionOption = accionOptions.find(o => o.text === accion.nombre);
    for (let i = 0; i < accion.evidencias.length; i++) {
      const evQ = questions[qIdx++];
      if (accionOption && evQ) {
        operations.push({
          operation: 'insert',
          dsl: `WHEN ${accionQuestion.questionUuid} IS ${accionOption.blockUuid} THEN SHOW ${evQ.questionUuid}`,
        });
      }
    }
  }

  // 4. Aplicar lógica condicional
  if (operations.length > 0) {
    await mcp.tool('apply_logic', { operations });
    console.log(`  ✓ Lógica condicional aplicada (${operations.length} reglas)`);
  }

  // 5. Publicar formulario
  const saveRes = toolResult(await mcp.tool('save_form', { status: 'PUBLISHED' }));
  const formId: string = saveRes?.data?.formId;
  const url: string = saveRes?.data?.url;
  if (!formId) throw new Error('No se obtuvo formId al guardar');

  console.log(`  ✅ Publicado: ${url}`);
  return { formId, url };
}

// ────────────────────────────────────────────────────────────
// MAIN
// ────────────────────────────────────────────────────────────
async function main() {
  console.log('🚀 Iniciando creación de formularios Tally...\n');

  for (const comp of COMPONENTES) {
    // Verificar si ya existe
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existing = await (prisma as any).tallyFormulario.findUnique({
      where: { componenteId: comp.dbId },
    });
    if (existing) {
      console.log(`⏭  Componente ${comp.dbId} ya tiene formulario: ${existing.tallyFormUrl}`);
      continue;
    }

    try {
      const { formId, url } = await crearFormComponente(comp);
      // Guardar en BD
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (prisma as any).tallyFormulario.create({
        data: {
          componenteId: comp.dbId,
          tallyFormId: formId,
          tallyFormUrl: url,
          titulo: comp.nombre,
        },
      });
      console.log(`  💾 Guardado en BD\n`);
    } catch (err) {
      console.error(`  ❌ Error en ${comp.dbId}:`, (err as Error).message);
    }
  }

  console.log('\n✅ Proceso completado.');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (prisma as any).$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
