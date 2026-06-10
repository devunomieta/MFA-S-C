import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { action, timestamp, signature, honeypot } = await req.json();

    if (action === "generate") {
      const now = Date.now().toString();
      const sig = await getHMACSignature(now, HMAC_SECRET);
      return new Response(
        JSON.stringify({ timestamp: now, signature: sig }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    if (action === "verify") {
      // 1. Check honeypot field
      if (honeypot) {
        console.warn("Honeypot triggered:", { honeypot });
        return new Response(
          JSON.stringify({ error: "Forbidden submission detected." }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          }
        );
      }

      if (!timestamp || !signature) {
        return new Response(
          JSON.stringify({ error: "Missing security tokens." }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          }
        );
      }

      // 2. Validate HMAC signature
      const expectedSig = await getHMACSignature(timestamp.toString(), HMAC_SECRET);
      if (signature !== expectedSig) {
        console.warn("Invalid signature:", { signature, expectedSig });
        return new Response(
          JSON.stringify({ error: "Security validation failed (signature mismatch)." }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          }
        );
      }

      // 3. Validate timestamp delay (prevent fast bot submissions) and expiration
      const submissionTime = Date.now();
      const generatedTime = parseInt(timestamp, 10);

      if (isNaN(generatedTime)) {
        return new Response(
          JSON.stringify({ error: "Invalid timestamp format." }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          }
        );
      }

      const diffMs = submissionTime - generatedTime;

      // Min delay: 1.5 seconds (human can't fill/submit form faster than that)
      if (diffMs < 1500) {
        console.warn("Submission too fast:", { diffMs });
        return new Response(
          JSON.stringify({ error: "Submission failed (too fast)." }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          }
        );
      }

      // Max delay: 15 minutes (session expiration)
      if (diffMs > 15 * 60 * 1000) {
        console.warn("Submission expired:", { diffMs });
        return new Response(
          JSON.stringify({ error: "Security check expired. Please refresh and try again." }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action." }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  } catch (error: any) {
    console.error("Security Gateway Error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
