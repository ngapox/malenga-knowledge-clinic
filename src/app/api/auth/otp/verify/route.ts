// src/app/api/auth/otp/verify/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { pbkdf2Sync } from 'crypto';
import jwt from 'jsonwebtoken';

export async function POST(req: Request) {
  console.log('\n--- [API: Verify OTP] - NEW REQUEST ---');
  try {
    const { phone, otp } = await req.json();
    console.log(`[LOG] Received request for phone: ${phone}, otp: ${otp}`);

    if (!phone || !otp) {
      return new NextResponse('Phone number and OTP are required.', { status: 400 });
    }

    // Step 1: Verify the OTP
    const { data: otpData, error: otpError } = await supabaseAdmin
      .from('otps')
      .select('*')
      .eq('phone', phone)
      .single();

    if (otpError || !otpData) {
      throw new Error('Invalid phone number or OTP expired.');
    }
    
    // ... (OTP validation logic remains the same)
    if (new Date(otpData.expires_at) < new Date()) {
        await supabaseAdmin.from('otps').delete().eq('id', otpData.id);
        throw new Error('OTP has expired.');
    }
    const hashedOtp = pbkdf2Sync(otp, phone, 1000, 64, 'sha512').toString('hex');
    if (hashedOtp !== otpData.hashed_otp) {
        throw new Error('Invalid OTP code.');
    }
    
    await supabaseAdmin.from('otps').delete().eq('id', otpData.id);
    console.log('[LOG] OTP is valid and has been deleted.');

    let userId: string;

    // Step 2: "Look before you leap" with DEEP LOGGING
    console.log(`[LOG] Checking for existing user with phone: "${phone}" via RPC...`);
    const { data: existingAuthUsers, error: rpcError } = await supabaseAdmin
      .rpc('get_auth_user_by_phone', { p_phone: phone });

    // --- DEEP LOGGING ---
    console.log('[LOG] Raw RPC Result:', JSON.stringify({ data: existingAuthUsers, error: rpcError }, null, 2));

    if (rpcError) {
      console.error('[FATAL] RPC call failed:', rpcError);
      throw rpcError;
    }

    if (existingAuthUsers && existingAuthUsers.length > 0) {
      userId = existingAuthUsers[0].id;
      console.log(`[LOG] SUCCESS: Found existing auth user with ID: ${userId}`);
    } else {
      console.log('[LOG] No auth user found. Attempting to create a new one...');
      const { data: newUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
        phone: phone,
        phone_confirm: true,
      });

      if (createUserError) {
        // This is the error we keep seeing. Now we can compare it with the RPC log above.
        console.error('[FATAL] Failed to create user:', createUserError);
        throw createUserError;
      }
      if (!newUser?.user?.id) throw new Error('User could not be created successfully.');
      
      userId = newUser.user.id;
      console.log(`[LOG] SUCCESS: New auth user created with ID: ${userId}`);
    }
    
    // Step 3: Create the JWT
    const jwtSecret = process.env.SUPABASE_JWT_SECRET;
    if (!jwtSecret) throw new Error('JWT Secret is not configured.');

    const token = jwt.sign(
      { aud: 'authenticated', exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24), sub: userId, phone: phone, role: 'authenticated' },
      jwtSecret
    );
    
    console.log('[LOG] JWT created successfully. Sending token to client.');
    return NextResponse.json({ token });

  } catch (error: any) {
    console.error('[FINAL CATCH] An error occurred:', error.message);
    return new NextResponse(error.message || 'Server error', { status: 500 });
  }
}