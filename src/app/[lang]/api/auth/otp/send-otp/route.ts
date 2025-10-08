// src/app/api/auth/otp/send-otp/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { sendSms } from '@/lib/beem';
import { pbkdf2Sync } from 'crypto';

export async function POST(req: Request) {
  // --- 👇 NEW LOGS START HERE 👇 ---
  console.log('\n--- [send-otp API] - NEW REQUEST ---');
  try {
    const { phone } = await req.json();
    console.log(`[send-otp API] Step 1: Received request for phone number: "${phone}"`);

    const phoneRegex = /^\+255[67]\d{8}$/;
    if (!phoneRegex.test(phone)) {
      console.error('[send-otp API] Step 2: Validation FAILED. Invalid phone format.');
      return new NextResponse('Invalid phone number format. Use +255XXXXXXXXX.', { status: 400 });
    }
    console.log('[send-otp API] Step 2: Phone number validation successful.');

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 5 * 60 * 1000);
    const hashedOtp = pbkdf2Sync(otp, phone, 1000, 64, 'sha512').toString('hex');

    console.log('[send-otp API] Step 3: Generated OTP and preparing to save to database.');
    const { error: upsertError } = await supabaseAdmin.from('otps').upsert({
      phone: phone,
      hashed_otp: hashedOtp,
      expires_at: expires.toISOString(),
    }, { onConflict: 'phone' });
    
    if (upsertError) throw upsertError;
    console.log('[send-otp API] Step 4: Successfully saved hashed OTP to database.');

    // --- 👇 THIS IS THE CRITICAL CALL TO THE SMS FUNCTION 👇 ---
    console.log('[send-otp API] Step 5: Calling the sendSms function...');
    await sendSms(phone, `Your Malenga login code is: ${otp}. It expires in 5 minutes.`);
    // --- 👆 END OF CRITICAL CALL 👆 ---

    console.log('[send-otp API] Step 6: sendSms function completed. Sending success response to client.');
    return NextResponse.json({ message: 'OTP sent successfully.' });
  } catch (error: any) {
    console.error('[send-otp API] FINAL CATCH: An error occurred in the send-otp flow.', error);
    return new NextResponse(error.message || 'Server error', { status: 500 });
  }
}