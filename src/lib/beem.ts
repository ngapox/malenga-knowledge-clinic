// src/lib/beem.ts
export async function sendSms(dest: string, text: string) {
  const BEEM_ENDPOINT = process.env.BEEM_SMS_ENDPOINT || 'https://apisms.beem.africa/v1/send';
  const BEEM_API_KEY = process.env.BEEM_API_KEY || '';
  const BEEM_SECRET_KEY = process.env.BEEM_SECRET_KEY || '';
  const BEEM_SENDER_ID = process.env.BEEM_SENDER_ID || 'INFO';

  if (!BEEM_API_KEY || !BEEM_SECRET_KEY) {
    console.error('Beem API key or secret not configured in .env.local');
    throw new Error('SMS service is not configured.');
  }

  const auth = Buffer.from(`${BEEM_API_KEY}:${BEEM_SECRET_KEY}`).toString('base64');
  
  const payload = {
    source_addr: BEEM_SENDER_ID,
    encoding: 0,
    message: text,
    recipients: [{ recipient_id: '1', dest_addr: dest }],
  };

  const res = await fetch(BEEM_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Basic ${auth}` },
    body: JSON.stringify(payload),
  });

  const responseData = await res.json().catch(() => null);

  // --- 👇 NEW DETAILED LOGGING IS HERE 👇 ---
  console.log('--- BEEM API RESPONSE ---');
  console.log('Status Code:', res.status);
  console.log('Response Body:', JSON.stringify(responseData, null, 2));
  console.log('-------------------------');

  if (!res.ok) {
    // This will now throw a more informative error if something goes wrong.
    throw new Error(responseData?.message || `Beem API error: ${res.status}`);
  }

  // Optional: Check for a successful request code from Beem's documentation if available
  // For example, if Beem returns a specific code for success in the body:
  // if (responseData?.code !== 100) { // Assuming 100 is the success code
  //   throw new Error(`Beem reported an issue: ${responseData?.message}`);
  // }
  
  return responseData;
}