// --- File: src/app/api/parse-pdf/route.ts ---
import { NextRequest, NextResponse } from 'next/server';
import { PDFExtract } from 'pdf.js-extract';

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
    const pdfExtractor = new PDFExtract();
    const data = await pdfExtractor.extractBuffer(Buffer.from(pdfBuffer));

    // Combine the text content from all pages
    const text = data.pages.map(page => page.content.map(item => item.str).join(' ')).join('\n');

    return NextResponse.json({ text });
  } catch (error: any) {
    console.error('Error in PDF parsing helper:', error.message);
    return new NextResponse(error.message, { status: 500 });
  }
}