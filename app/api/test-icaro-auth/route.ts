import { NextResponse } from 'next/server';

export async function GET() {
  const icaroUrl = process.env.ICARO_API_URL;
  const icaroToken = process.env.ICARO_API_TOKEN;

  if (!icaroUrl || !icaroToken) {
    return NextResponse.json({
      error: 'Missing variables',
      icaroUrl: !!icaroUrl,
      icaroToken: !!icaroToken,
    });
  }

  return NextResponse.json({
    icaroUrl,
    tokenLength: icaroToken.length,
    firstChars: icaroToken.slice(0, 3) + '...',
    lastChars: '...' + icaroToken.slice(-3),
    rawTokenCharCodes: Array.from(icaroToken).map(c => c.charCodeAt(0)),
  });
}
