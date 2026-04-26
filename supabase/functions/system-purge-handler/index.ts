import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("Missing Authorization header");
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Auth header received: ${authHeader.substring(0, 20)}...`);

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );

    console.log("Wipe service invoked. Checking user session...");
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      console.error("Authentication failed:", authError);
      return new Response(JSON.stringify({ error: "Unauthorized", message: authError?.message }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Authenticated as ${user.email}. Checking privileges...`);

    // Check admin status of caller
    const { data: callerProfile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("is_admin, is_superadmin")
      .eq("id", user.id)
      .single();

    if (profileError || !callerProfile?.is_admin) {
      console.error("Privilege check failed:", profileError || "Not an admin");
      return new Response(JSON.stringify({ error: "Forbidden: Admins only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = await req.json();
    const { scope, dataOnly, targetUserId } = payload;

    console.log(
      `Payload received - Scope: ${scope}, DataOnly: ${dataOnly}, TargetUserId: ${targetUserId}`,
    );

    // Create service client for admin actions
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Identify target users
    let targetIds: string[] = [];

    if (scope === "single-user") {
      if (!targetUserId) throw new Error("Missing targetUserId for single-user scope");
      targetIds = [targetUserId];
    } else if (scope === "non-admin") {
      const { data: targets, error: targetError } = await serviceClient
        .from("profiles")
        .select("id")
        .eq("is_admin", false);
      if (targetError) throw targetError;
      targetIds = (targets || []).map((t) => t.id);
    } else if (scope === "all-except-super") {
      if (!callerProfile.is_superadmin) {
        return new Response(
          JSON.stringify({ error: "Forbidden: Superadmin access required for this scope" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const { data: targets, error: targetError } = await serviceClient
        .from("profiles")
        .select("id")
        .eq("is_superadmin", false);
      if (targetError) throw targetError;
      targetIds = (targets || []).map((t) => t.id);
    } else {
      return new Response(JSON.stringify({ error: "Invalid scope: " + scope }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(
      `Starting wipe with scope: ${scope}, dataOnly: ${dataOnly}. Found ${targetIds.length} target users.`,
    );

    if (targetIds.length === 0) {
      return new Response(
        JSON.stringify({ message: "No users found to wipe", success: true, count: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // App data tables to explicitly clear for all wipe modes.
    // We always delete these explicitly rather than relying solely on CASCADE,
    // because FK cascade behaviour depends on how each migration defined its constraints.
    const tablesToClear = [
      "notifications",
      "notification_settings",
      "transactions",
      "user_plans",
      "bank_accounts",
      "unpaid_arrears",
      "email_change_requests",
      "activity_logs",
    ];

    // Perform wipe
    if (dataOnly) {
      console.log("Performing DATA ONLY wipe for related tables...");

      for (const table of tablesToClear) {
        const { error } = await serviceClient.from(table).delete().in("user_id", targetIds);
        if (error) console.warn(`Non-critical: Failed to clear table ${table}:`, error.message);
      }

      // Clear the profile row (auth.users record remains — user can still log in, fresh account)
      console.log("Clearing profiles...");
      const { error: deleteError } = await serviceClient
        .from("profiles")
        .delete()
        .in("id", targetIds);
      if (deleteError) throw deleteError;

    } else {
      // AUTH + DATA: Explicitly delete all app data FIRST, then remove the auth.users record.
      // Do NOT rely on CASCADE alone — some tables may not have ON DELETE CASCADE defined.
      console.log("Performing COMPLETE AUTH wipe — clearing app data first...");

      for (const table of tablesToClear) {
        const { error } = await serviceClient.from(table).delete().in("user_id", targetIds);
        if (error) console.warn(`Non-critical: Failed to clear table ${table}:`, error.message);
      }

      // Clear the profile row explicitly before auth deletion
      const { error: profileError } = await serviceClient
        .from("profiles")
        .delete()
        .in("id", targetIds);
      if (profileError) console.warn("Profile delete warning:", profileError.message);

      // Now permanently delete from auth.users — this frees the email for re-registration
      console.log("Deleting auth.users records...");
      const authFailures: string[] = [];
      for (const id of targetIds) {
        const { error: authError } = await serviceClient.auth.admin.deleteUser(id);
        if (authError) {
          // Log every failure with full detail
          console.error(`FAILED to delete auth user ${id}:`, JSON.stringify(authError));
          authFailures.push(`${id}: ${authError.message}`);
        } else {
          console.log(`Auth user ${id} deleted successfully.`);
        }
      }

      // If ANY auth deletions failed, surface the error — don't silently return success
      if (authFailures.length > 0) {
        throw new Error(
          `Auth deletion failed for ${authFailures.length} user(s). ` +
          `App data was wiped but auth.users records remain. ` +
          `Details: ${authFailures.join(" | ")}. ` +
          `Check that SUPABASE_SERVICE_ROLE_KEY is correctly set in the Edge Function environment.`
        );
      }
    }

    // Log the action in activity_logs
    try {
      console.log("Logging purge action...");
      const { error: logError } = await serviceClient.from("activity_logs").insert({
        user_id: user.id,
        action: scope === "single-user" ? "SINGLE_USER_WIPE" : "BULK_USER_WIPE",
        details: {
          scope,
          data_only: dataOnly,
          user_count: targetIds.length,
          target_user_id: targetUserId,
        },
        ip_address:
          req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for") || "edge-function",
      });
      if (logError) console.error("Activity log insert failed (non-blocking):", logError);
    } catch (logCatch) {
      console.error("Failed to log activity (non-blocking):", logCatch);
    }

    console.log("Wipe completed successfully.");
    return new Response(JSON.stringify({ success: true, count: targetIds.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Wipe Service Critical Error:", error);
    const errorMsg = error.message || "An unexpected error occurred during the wipe process";
    return new Response(JSON.stringify({ error: errorMsg, message: errorMsg }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
