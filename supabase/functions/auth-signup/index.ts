import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const { email, password, full_name } = await req.json();

    if (!email || !password || !full_name) {
      throw new Error("Email, password, and full name are required");
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Enforce Rate Limiting
    const now = new Date();
    const { data: limitData, error: limitFetchError } = await supabase
      .from("signup_rate_limits")
      .select("*")
      .eq("email", email)
      .maybeSingle();

    if (limitFetchError) {
      console.error("Rate limit check error:", limitFetchError);
    }

    if (limitData) {
      const lastAttempt = new Date(limitData.last_attempt);
      const diffMs = now.getTime() - lastAttempt.getTime();

      // Block if less than 60 seconds since last attempt
      if (diffMs < 60 * 1000) {
        return new Response(
          JSON.stringify({ error: "Please wait 60 seconds before attempting to register or resend again." }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 429 }
        );
      }

      // Block if more than 5 attempts within 1 hour
      if (limitData.attempts_count >= 5 && diffMs < 60 * 60 * 1000) {
        return new Response(
          JSON.stringify({ error: "Registration attempts limit exceeded. Please try again in 1 hour." }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 429 }
        );
      }

      // Reset count if last attempt was over 1 hour ago, otherwise increment
      const newCount = diffMs >= 60 * 60 * 1000 ? 1 : limitData.attempts_count + 1;
      await supabase
        .from("signup_rate_limits")
        .update({ last_attempt: now.toISOString(), attempts_count: newCount })
        .eq("email", email);
    } else {
      await supabase
        .from("signup_rate_limits")
        .insert({ email, last_attempt: now.toISOString(), attempts_count: 1 });
    }

    // 2. Fetch App General Settings for Branding
    const { data: appSettings } = await supabase.from("app_settings").select("*");
    const general = appSettings?.find((s) => s.key === "general")?.value || {};
    const smtp = appSettings?.find(s => s.key === "smtp")?.value || {};
    const appName = general.app_name || "Mary's Thrift Services";
    const logoUrl = general.logo_url;
    const fromEmail = smtp.from_email || "onboarding@resend.dev";

    // Determine Redirect Origin
    const origin = req.headers.get("origin") || "http://localhost:5173";

    // 3. Generate Link and OTP
    console.log(`Generating signup link/OTP for user: ${email}`);
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: "signup",
      email: email,
      password: password,
      options: {
        redirectTo: `${origin}/dashboard`,
        data: {
          full_name: full_name,
        },
      },
    });

    if (linkError) {
      throw linkError;
    }

    const { email_otp, action_link } = linkData.properties;

    // 4. Send Email via Resend containing BOTH OTP and Link
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      console.warn("RESEND_API_KEY not configured. OTP:", email_otp, "Link:", action_link);
    } else {
      const emailRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: `${appName} <${fromEmail}>`,
          to: [email],
          subject: `Verify your account - ${appName}`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
              ${logoUrl ? `<img src="${logoUrl}" alt="${appName}" style="height: 40px; margin-bottom: 25px;">` : `<h2 style="color: #059669; margin-top: 0;">${appName}</h2>`}
              <h1 style="font-size: 22px; font-weight: 700; color: #1f2937; margin-bottom: 10px;">Welcome, ${full_name}!</h1>
              <p style="font-size: 16px; color: #4b5563; line-height: 1.6; margin-bottom: 25px;">
                Thank you for registering. Please verify your email to activate your account and start saving.
              </p>
              
              <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 25px;">
                <p style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; color: #166534; font-weight: 700; margin: 0 0 8px 0;">
                  Your 6-Digit Verification Code
                </p>
                <span style="font-size: 36px; font-weight: 800; color: #047857; letter-spacing: 0.25em;">
                  ${email_otp}
                </span>
                <p style="font-size: 13px; color: #166534; margin: 8px 0 0 0; font-style: italic;">
                  This code expires in 60 minutes
                </p>
              </div>

              <p style="font-size: 15px; color: #4b5563; line-height: 1.6; margin-bottom: 20px; text-align: center;">
                OR verify automatically by clicking the button below:
              </p>

              <div style="text-align: center; margin-bottom: 30px;">
                <a href="${action_link}" target="_blank" style="background-color: #059669; color: #ffffff; padding: 14px 28px; border-radius: 10px; text-decoration: none; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 12px rgba(5, 150, 105, 0.15);">
                  Confirm Email Address
                </a>
              </div>

              <p style="font-size: 12px; color: #9ca3af; line-height: 1.5; margin-top: 30px;">
                If you did not sign up for this account, you can safely ignore this email.
              </p>
              <hr style="margin-top: 30px; border: 0; border-top: 1px solid #e5e7eb;">
              <p style="font-size: 11px; color: #9ca3af; text-align: center; margin-bottom: 0;">
                &copy; ${new Date().getFullYear()} ${appName}. All rights reserved.
              </p>
            </div>
          `,
        }),
      });

      if (!emailRes.ok) {
        const errJson = await emailRes.json();
        throw new Error(errJson.message || "Failed to send verification email via Resend");
      }
    }

    return new Response(JSON.stringify({ success: true, message: "Verification code sent to email." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("Signup Endpoint Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
