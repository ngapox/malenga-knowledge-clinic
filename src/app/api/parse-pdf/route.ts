// --- File: src/app/api/parse-pdf/route.ts ---
import { NextRequest, NextResponse } from 'next/server';
import pdf from 'pdf-parse';

// This tells Vercel to run this function in a special, lightweight environment
// that is highly compatible with libraries like pdf-parse.
export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const pdfUrl = searchParams.get('url');

  if (!pdfUrl) {
    return new NextResponse('Missing PDF URL parameter', { status: 400 });
  }

  try {
    const response = await fetch(pdfUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch PDF from ${pdfUrl}. Status: ${response.status}`);
    }

    const pdfBuffer = await response.arrayBuffer();
    const data = await pdf(Buffer.from(pdfBuffer));

    return NextResponse.json({ text: data.text });
  } catch (error: any) {
    return new NextResponse(error.message, { status: 500 });
  }
}