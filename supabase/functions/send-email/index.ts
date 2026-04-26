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
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { to, subject, template, data } = await req.json();

    if (!to || (!subject && !template)) {
      throw new Error("Missing recipient or subject/template");
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // 1. Fetch Templates & Settings
    const { data: appSettings } = await supabase.from("app_settings").select("*");
    const templates = appSettings?.find(s => s.key === "email_templates")?.value || {};
    const general = appSettings?.find(s => s.key === "general")?.value || {};
    
    const appName = general.app_name || "Mary's Thrift Services";
    const logoUrl = general.logo_url;

    // 2. Determine Subject and Body
    let finalSubject = subject;
    let finalBody = "";

    if (template && templates[template]) {
      finalSubject = templates[template].subject;
      finalBody = templates[template].body;

      // Replace variables in subject and body
      const replacements = { ...data, name: data.name || "User" };
      Object.entries(replacements).forEach(([key, val]) => {
        const regex = new RegExp(`{${key}}`, "g");
        finalSubject = finalSubject.replace(regex, String(val));
        finalBody = finalBody.replace(regex, String(val));
      });
    } else {
      finalBody = data.message || "No content provided.";
    }

    // 3. Send via Resend
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `${appName} <onboarding@resend.dev>`,
        to: Array.isArray(to) ? to : [to],
        subject: finalSubject,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; rounded: 8px;">
            ${logoUrl ? `<img src="${logoUrl}" alt="${appName}" style="height: 40px; margin-bottom: 20px;">` : `<h2>${appName}</h2>`}
            <div style="line-height: 1.6; color: #1e293b; font-size: 16px; white-space: pre-wrap;">
              ${finalBody}
            </div>
            <hr style="margin-top: 30px; border: 0; border-top: 1px solid #e2e8f0;">
            <p style="font-size: 12px; color: #64748b; text-align: center;">
              &copy; ${new Date().getFullYear()} ${appName}. All rights reserved.
            </p>
          </div>
        `,
      }),
    });

    const result = await res.json();
    if (!res.ok) throw new Error(result.message || "Failed to send email");

    return new Response(JSON.stringify(result), {
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
