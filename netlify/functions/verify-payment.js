// Netlify Function: verify-payment.js
export async function handler(event) {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const { payment_id } = JSON.parse(event.body || '{}');
    if (!payment_id) {
      return { statusCode: 400, body: JSON.stringify({ error: 'payment_id required' }) };
    }

    const resp = await fetch('https://spaceremit.com/api/v2/payment_info/', {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({
        private_key: process.env.SP_SECRET_KEY, // set in Netlify env
        payment_id
      })
    });

    const text = await resp.text();
    // Pass through JSON (Spaceremit returns JSON on success)
    return {
      statusCode: resp.ok ? 200 : resp.status,
      headers: { 'Content-Type': 'application/json' },
      body: text
    };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
}

