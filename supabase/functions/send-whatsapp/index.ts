import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, prefer, x-webhook-secret",
};

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { phone, message, user_id } = await req.json();

    if (!phone || !message) {
      throw new Error("Phone number and message are required");
    }

    // 1. Initialize Supabase Client with service role to log the message
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 2. Sanitize and format phone number for WhatsApp
    let sanitizedPhone = phone.replace(/\D/g, "");
    if (sanitizedPhone.startsWith("0") && sanitizedPhone.length === 11) {
      sanitizedPhone = "234" + sanitizedPhone.substring(1);
    } else if (sanitizedPhone.length === 10) {
      sanitizedPhone = "234" + sanitizedPhone;
    }
    const chatId = `${sanitizedPhone}@c.us`;

    // 3. Get Green API Config
    const GREEN_API_URL = Deno.env.get("GREEN_API_URL") || "https://api.greenapi.com";
    const GREEN_API_INSTANCE_ID = Deno.env.get("GREEN_API_INSTANCE_ID");
    const GREEN_API_TOKEN = Deno.env.get("GREEN_API_TOKEN");

    let status = "sent";
    let apiResponse = null;
    let errMessage = null;

    if (GREEN_API_INSTANCE_ID && GREEN_API_TOKEN) {
      const url = `${GREEN_API_URL}/waInstance${GREEN_API_INSTANCE_ID}/sendMessage/${GREEN_API_TOKEN}`;
      console.log(`Sending Green API WhatsApp to: ${chatId}`);

      try {
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chatId, message }),
        });

        apiResponse = await response.json();
        if (!response.ok) {
          throw new Error(apiResponse.message || `HTTP error! Status: ${response.status}`);
        }
        console.log("Green API send message response:", apiResponse);
      } catch (err: any) {
        console.error("Failed to send WhatsApp message via Green API:", err.message);
        status = "failed";
        errMessage = err.message;
      }
    } else {
      console.log(`[MOCK WHATSAPP] To: ${chatId} | Message: ${message}`);
      status = "mocked";
    }

    // 4. Log the message to the database
    const { error: dbError } = await supabase.from("whatsapp_messages").insert({
      user_id: user_id || null,
      phone: phone,
      message: message,
      status: status,
    });

    if (dbError) {
      console.error("Database log failed for WhatsApp message:", dbError.message);
    }

    if (status === "failed") {
      return new Response(JSON.stringify({ success: false, error: errMessage }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    return new Response(JSON.stringify({ success: true, apiResponse }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("WhatsApp Function Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
