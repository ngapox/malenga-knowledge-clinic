// supabase/functions/custom-sms-sender/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

// These are your Beem credentials, which we will set securely
const BEEM_API_KEY = Deno.env.get('BEEM_API_KEY') || '';
const BEEM_SECRET_KEY = Deno.env.get('BEEM_SECRET_KEY') || '';
const BEEM_SENDER_ID = Deno.env.get('BEEM_SENDER_ID') || 'INFO';
const BEEM_ENDPOINT = 'https://apisms.beem.africa/v1/send';

serve(async (req) => {
  try {
    const { record } = await req.json();

    const phone = record.phone;
    const token = record.token;

    if (!phone || !token) {
      throw new Error('Phone or token missing from webhook payload.');
    }

    const message = `Your Malenga login code is: ${token}`;

    const auth = btoa(`${BEEM_API_KEY}:${BEEM_SECRET_KEY}`);
    const payload = {
      source_addr: BEEM_SENDER_ID,
      message: message,
      recipients: [{ recipient_id: '1', dest_addr: phone }],
    };

    const beemResponse = await fetch(BEEM_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify(payload),
    });

    if (!beemResponse.ok) {
      const errorData = await beemResponse.json();
      throw new Error(`Beem API failed: ${JSON.stringify(errorData)}`);
    }

    return new Response(JSON.stringify({ message: 'SMS sent via Beem!' }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Edge Function Error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});