import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, prefer, x-webhook-secret",
};

const HMAC_SECRET = Deno.env.get("HMAC_SECRET") || "marys_thrift_finance_default_hmac_secret_key_2026";

async function getHMACSignature(text: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    encoder.encode(text)
  );
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("x-webhook-secret");
    const secretToken = Deno.env.get("FUNCTION_SECRET_TOKEN");

    if (secretToken && authHeader !== secretToken) {
      console.error("Unauthorized contact form submission attempt");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { name, email, subject, message, honeypot, timestamp, signature } = await req.json();

    if (!email || !message) {
      throw new Error("Email and message are required");
    }

    // 1. Honeypot check: silently succeed for bots to waste their resources
    if (honeypot) {
      console.warn("Honeypot triggered in contact-handler:", { honeypot });
      return new Response(
        JSON.stringify({ success: true, message: "Your message has been received." }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // 2. HMAC-signed timestamp validation
    if (!timestamp || !signature) {
      throw new Error("Security verification failed (missing tokens).");
    }

    const expectedSig = await getHMACSignature(timestamp.toString(), HMAC_SECRET);
    if (signature !== expectedSig) {
      throw new Error("Security verification failed (signature mismatch).");
    }

    const diffMs = Date.now() - parseInt(timestamp, 10);
    if (diffMs < 1500) {
      throw new Error("Submission failed (too fast).");
    }
    if (diffMs > 15 * 60 * 1000) {
      throw new Error("Security check expired. Please refresh the page and try again.");
    }

    const forwardTo = Deno.env.get("FORWARD_TO_EMAIL") || "marysthriftservice@gmail.com";

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Contact Form <onboarding@resend.dev>",
        to: [forwardTo],
        subject: subject || `New Inquiry from ${name}`,
        reply_to: email,
        html: `
          <h3>New Contact Form Submission</h3>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Subject:</strong> ${subject}</p>
          <p><strong>Message:</strong></p>
          <p>${message}</p>
        `,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "Failed to send email via Resend");
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
