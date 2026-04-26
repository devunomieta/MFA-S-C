import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, prefer, x-webhook-secret",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("x-webhook-secret");
    const secretToken = Deno.env.get("FUNCTION_SECRET_TOKEN");

    if (secretToken && authHeader !== secretToken) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { subject, content, recipients, newsletterId } = await req.json();

    if (!subject || !content || !recipients || !Array.isArray(recipients)) {
      throw new Error("Missing required fields: subject, content, recipients");
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Get Branding Settings for the email footer/header if needed
    const { data: settings } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "general")
      .maybeSingle();
    
    const appName = settings?.value?.app_name || "Mary's Thrift Services";
    const logoUrl = settings?.value?.logo_url;

    console.log(`Sending newsletter "${subject}" to ${recipients.length} recipients.`);

    // Batch send via Resend (Resend supports up to 50 recipients in the 'to' array for batching, 
    // or we can use their Batch API for larger lists. For simplicity and reliability in MVP, 
    // we'll loop or use the 'to' array if the list is small).
    
    // Split recipients into chunks of 50 to comply with many API limits
    const chunks = [];
    for (let i = 0; i < recipients.length; i += 50) {
      chunks.push(recipients.slice(i, i + 50));
    }

    let successCount = 0;
    let failCount = 0;

    for (const chunk of chunks) {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: `${appName} <onboarding@resend.dev>`, // In production, use verified domain
          to: chunk,
          subject: subject,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; rounded: 8px;">
              ${logoUrl ? `<img src="${logoUrl}" alt="${appName}" style="height: 40px; margin-bottom: 20px;">` : `<h2>${appName}</h2>`}
              <div style="line-height: 1.6; color: #1e293b; font-size: 16px;">
                ${content.replace(/\n/g, '<br>')}
              </div>
              <hr style="margin-top: 30px; border: 0; border-top: 1px solid #e2e8f0;">
              <p style="font-size: 12px; color: #64748b; text-align: center;">
                &copy; ${new Date().getFullYear()} ${appName}. All rights reserved.<br>
                You are receiving this because you subscribed to our newsletter or have an account with us.
              </p>
            </div>
          `,
        }),
      });

      if (res.ok) {
        successCount += chunk.length;
      } else {
        const error = await res.json();
        console.error("Resend error chunk:", error);
        failCount += chunk.length;
      }
    }

    // Update the newsletter record status
    if (newsletterId) {
      await supabase
        .from("newsletters")
        .update({ 
          status: failCount === 0 ? "sent" : "partial_fail", 
          sent_at: new Date(),
          details: { successCount, failCount }
        })
        .eq("id", newsletterId);
    }

    return new Response(JSON.stringify({ successCount, failCount }), {
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
