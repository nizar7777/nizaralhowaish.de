// Netlify Functions (Node 18+): verifies a Spaceremit payment_id
export default async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: cors() });
  }
  if (req.method !== "POST") {
    return json({ error: "Method Not Allowed" }, 405);
  }

  try {
    const { payment_id } = await req.json();
    if (!payment_id) return json({ error: "Missing payment_id" }, 400);

    const privateKey = process.env.SPACEREMIT_PRIVATE_KEY;
    if (!privateKey) return json({ error: "Missing SPACEREMIT_PRIVATE_KEY" }, 500);

    // Docs: POST /api/v2/payment_info/ with private_key + payment_id
    const upstream = await fetch("https://spaceremit.com/api/v2/payment_info/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ private_key: privateKey, payment_id })
    });

    const data = await upstream.json().catch(() => ({}));
    return json(data, 200);
  } catch (err) {
    return json({ error: err.message || "Server error" }, 500);
  }
};

const cors = () => ({
  "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Content-Type": "application/json"
});
const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj ?? {}), { status, headers: cors() });
