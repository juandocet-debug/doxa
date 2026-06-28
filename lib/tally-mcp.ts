const MCP_URL = process.env.TALLY_MCP_URL!;
const KEY = process.env.TALLY_API_KEY!;

export interface FormField {
  type: 'text' | 'textarea' | 'dropdown' | 'date' | 'file';
  label: string;
  options?: string[];
}

export interface LogicRule {
  sourceFieldIndex: number;
  optionIndex: number;
  targetFieldIndex: number;
}

function parseSse(text: string): Record<string, unknown> | null {
  // Try each SSE chunk in reverse (last result wins)
  const chunks = text.split('\n\n').filter(Boolean).reverse();
  for (const chunk of chunks) {
    for (const line of chunk.split('\n')) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6)) as Record<string, unknown>;
          if (data.result !== undefined || data.error !== undefined) return data;
        } catch { /* skip */ }
      }
    }
  }
  return null;
}

interface McpResponse {
  result?: {
    content?: Array<{ type: string; text: string }>;
  };
}

function toolResult(raw: unknown): Record<string, unknown> | null {
  const mcpRaw = raw as McpResponse;
  const content = mcpRaw?.result?.content ?? [];
  // The MCP returns multiple content items; find the one with valid JSON data
  for (const item of content) {
    if (item.type === 'text' && item.text?.startsWith('{')) {
      try { return JSON.parse(item.text) as Record<string, unknown>; } catch { /* skip */ }
    }
  }
  return (mcpRaw?.result as unknown as Record<string, unknown>) ?? null;
}

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
    const data = parseSse(text);
    if (!data) throw new Error(`MCP no respondió para ${method}. Raw: ${text.slice(0, 300)}`);
    if (data.error) throw new Error(`MCP error en ${method}: ${JSON.stringify(data.error)}`);
    return data;
  }

  async notify(method: string, params: Record<string, unknown> = {}) {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${KEY}`,
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
    };
    if (this.sessionId) headers['Mcp-Session-Id'] = this.sessionId;
    // Notifications have no id
    await fetch(MCP_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({ jsonrpc: '2.0', method, params }),
    });
  }

  async tool(name: string, args: Record<string, unknown> = {}) {
    return this.send('tools/call', { name, arguments: args });
  }
}

export async function createTallyForm(
  title: string,
  fields: FormField[],
  logic: LogicRule[] = [],
  status: 'PUBLISHED' | 'DRAFT' = 'PUBLISHED'
): Promise<{ formId: string; url: string }> {
  const mcp = new McpClient();

  // 1. Initialize session
  await mcp.send('initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'mi-plataforma', version: '1.0' },
  });
  // Send initialized notification (required by MCP spec)
  await mcp.notify('notifications/initialized');

  // 2. Create form
  const createRaw = await mcp.tool('create_new_form', { title });
  const createRes = toolResult(createRaw) as { blockUuids?: string[] } | null;
  const titleBlockUuid: string = createRes?.blockUuids?.[0] as string;
  if (!titleBlockUuid) {
    throw new Error(`create_new_form no devolvió blockUuid. Respuesta: ${JSON.stringify(createRes)}`);
  }

  // 3. Build and create blocks
  const groups = fields.map((f) => {
    const blocks: Record<string, unknown>[] = [{ type: 'TITLE', html: f.label }];
    if (f.type === 'text') blocks.push({ type: 'INPUT_TEXT' });
    else if (f.type === 'textarea') blocks.push({ type: 'TEXTAREA' });
    else if (f.type === 'date') blocks.push({ type: 'INPUT_DATE' });
    else if (f.type === 'file') blocks.push({ type: 'FILE_UPLOAD' });
    else if (f.type === 'dropdown') {
      (f.options || []).forEach((opt) => blocks.push({ type: 'DROPDOWN_OPTION', text: opt }));
    }
    return { insertAfterBlockUuid: titleBlockUuid, blocks };
  });

  const blocksRaw = await mcp.tool('create_blocks', { groups });
  const blocksRes = toolResult(blocksRaw) as { context?: { ledger?: string } } | null;
  const ledger: string = blocksRes?.context?.ledger || '';

  // 4. Apply conditional logic if defined
  if (logic.length > 0 && ledger) {
    const questionUuids = extractQuestionUuids(ledger);
    const optionUuids = extractOptionUuids(ledger, questionUuids);

    const operations = logic
      .map((rule) => {
        const srcQ = questionUuids[rule.sourceFieldIndex];
        const optB = optionUuids[rule.sourceFieldIndex]?.[rule.optionIndex];
        const tgtQ = questionUuids[rule.targetFieldIndex];
        if (!srcQ || !optB || !tgtQ) return null;
        return { operation: 'insert', dsl: `WHEN ${srcQ} IS ${optB} THEN SHOW ${tgtQ}` };
      })
      .filter(Boolean);

    if (operations.length > 0) {
      await mcp.tool('apply_logic', { operations });
    }
  }

  // 5. Save and publish
  const saveRaw = await mcp.tool('save_form', { status });
  const saveRes = toolResult(saveRaw) as { data?: { formId?: string; url?: string } } | null;
  const formId = saveRes?.data?.formId;
  const url = saveRes?.data?.url || '';
  if (!formId) throw new Error(`save_form no devolvió formId. Respuesta: ${JSON.stringify(saveRes)}`);

  return { formId, url };
}

export async function deleteTallyForm(formId: string): Promise<void> {
  const mcp = new McpClient();
  await mcp.send('initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'mi-plataforma', version: '1.0' },
  });
  await mcp.notify('notifications/initialized');
  await mcp.tool('load_form', { formId });
  await mcp.tool('save_form', { formId, status: 'DELETED' });
}

function extractQuestionUuids(ledger: string): string[] {
  const uuids: string[] = [];
  for (const row of ledger.split('\n')) {
    if (!row.includes('| TITLE |')) continue;
    const cols = row.split('|').map((c) => c.trim());
    // cols[5] = questionUuid
    if (cols[5] && cols[5] !== '-' && cols[5] !== 'questionUuid') uuids.push(cols[5]);
  }
  return uuids;
}

function extractOptionUuids(ledger: string, questionUuids: string[]): string[][] {
  const byQuestion: Record<string, string[]> = {};
  for (const row of ledger.split('\n')) {
    if (!row.includes('| DROPDOWN_OPTION |')) continue;
    const cols = row.split('|').map((c) => c.trim());
    const blockUuid = cols[3]; // blockUuid column
    const questionUuid = cols[5]; // questionUuid column
    if (!questionUuid || !blockUuid || questionUuid === '-') continue;
    if (!byQuestion[questionUuid]) byQuestion[questionUuid] = [];
    byQuestion[questionUuid].push(blockUuid);
  }
  return questionUuids.map((qUuid) => byQuestion[qUuid] || []);
}
