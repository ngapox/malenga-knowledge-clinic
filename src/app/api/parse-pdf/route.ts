// src/app/api/parse-pdf/route.ts
export const runtime = 'nodejs'; // ensure this runs in Node runtime, not Edge

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const pdfUrl = searchParams.get('url');

  if (!pdfUrl) {
    return new NextResponse('Missing PDF URL parameter', { status: 400 });
  }

  try {
    // dynamic import works robustly for CommonJS packages
    const pdfModule = await import('pdf-parse');
    // pdfModule.default for ESM interop, or module itself for CJS
    const pdf = (pdfModule as any).default ?? pdfModule;

    const response = await fetch(pdfUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch PDF from ${pdfUrl}. Status: ${response.status}`);
    }

    const pdfBuffer = await response.arrayBuffer();
    // pdf-parse expects a Buffer when running under Node
    const data = await pdf(Buffer.from(pdfBuffer));

    return NextResponse.json({ text: data?.text ?? '' });
  } catch (error: any) {
    console.error('Error in PDF parsing route:', error);
    return new NextResponse(error?.message ?? 'Unknown error', { status: 500 });
  }
}
