import { toast } from "sonner";

import { supabase } from "@/lib/supabase";

export interface HoneypotData {
  timestamp: string;
  signature: string;
}

/**
 * Fetches a fresh HMAC-signed timestamp from the security-gateway edge function.
 */
export async function fetchHoneypotData(): Promise<HoneypotData | null> {
  try {
    const { data, error } = await supabase.functions.invoke("security-gateway", {
      body: { action: "generate" },
    });

    if (error) throw error;
    return data as HoneypotData;
  } catch (err) {
    console.warn(
      "Failed to fetch honeypot security data (Edge function offline or not running):",
      err,
    );
    return null;
  }
}

/**
 * Verifies the honeypot and HMAC timestamp.
 * If the security tokens are missing (e.g. Edge function is offline during page load),
 * it logs a warning and fails open to prevent locking out legitimate users.
 */
export async function verifyHoneypot(
  timestamp: string | undefined | null,
  signature: string | undefined | null,
  honeypot: string,
): Promise<boolean> {
  if (honeypot) {
    console.warn("Honeypot triggered client side");
    toast.success("Verification successful!"); // Mimic success to trick the bot
    return false;
  }

  // Fail-open for local development or if the server was unreachable during mount
  if (!timestamp || !signature) {
    console.warn("Security gateway tokens missing. Proceeding without HMAC check (fail-open).");
    return true;
  }

  try {
    const { data, error } = await supabase.functions.invoke("security-gateway", {
      body: {
        action: "verify",
        timestamp,
        signature,
        honeypot,
      },
    });

    if (error) {
      if (
        error.message?.includes("non-2xx status code") ||
        error.message?.includes("Failed to fetch")
      ) {
        console.warn("Security gateway returned non-2xx or failed to fetch. Failing open.", error);
        return true;
      }
      // If the function specifically rejected the submission, block it
      const errMsg = error.message || "Security check failed.";
      toast.error(errMsg);
      return false;
    }

    return !!data?.success;
  } catch (err: any) {
    // Fail-open on network errors (e.g. Adblocker blocking edge function call)
    console.warn("Security gateway network verification error. Failing open:", err);
    return true;
  }
}
