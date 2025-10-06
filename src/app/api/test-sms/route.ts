// src/app/api/test-sms/route.ts
import { NextResponse } from 'next/server';
import { sendSms } from '@/lib/beem';

export async function POST(req: Request) {
  console.log('\n--- [Test SMS API] - INITIATING DIRECT SMS TEST ---');
  try {
    const { phone, message } = await req.json();

    if (!phone || !message) {
      throw new Error('Request must include a "phone" and "message" property.');
    }

    console.log(`[Test SMS API] Attempting to send message: "${message}" to ${phone}`);

    // Call your existing sendSms function directly
    const beemResponse = await sendSms(phone, message);

    console.log('[Test SMS API] Test completed.');
    
    // Return the full response from Beem back to the client
    return NextResponse.json({
      success: true,
      message: 'Test SMS request sent successfully.',
      beemResponse: beemResponse,
    });

  } catch (error: any) {
    console.error('[Test SMS API] An error occurred during the test.', error);
    return new NextResponse(error.message || 'Server error', { status: 500 });
  }
}