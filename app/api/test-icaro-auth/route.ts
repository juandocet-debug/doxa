import { NextResponse } from 'next/server';

export async function GET() {
  const icaroUrl = process.env.ICARO_API_URL;
  const icaroToken = process.env.ICARO_API_TOKEN;

  if (!icaroUrl || !icaroToken) {
    return NextResponse.json({ error: 'Missing environment variables on Vercel' });
  }

  const results: Record<string, { status: number; text: string }> = {};

  const tests = {
    'Bearer': { 'Authorization': `Bearer ${icaroToken}` },
    'Token': { 'Authorization': `Token ${icaroToken}` },
    'Api-Key-Auth': { 'Authorization': `Api-Key ${icaroToken}` },
    'X-Api-Key': { 'X-Api-Key': icaroToken },
    'Api-Key-Header': { 'Api-Key': icaroToken },
  };

  for (const [name, headers] of Object.entries(tests)) {
    try {
      const res = await fetch(`${icaroUrl}/api/auth/usuarios/`, {
        method: 'GET',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
      });
      const text = await res.text();
      results[name] = {
        status: res.status,
        text: text.slice(0, 300),
      };
    } catch (err: unknown) {
      results[name] = {
        status: 0,
        text: err instanceof Error ? err.message : 'Error',
      };
    }
  }

  return NextResponse.json(results);
}
