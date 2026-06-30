import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    console.log("Starting Automated Savings Trigger...");

    // Call the SQL function
    const { data: rpcData, error: rpcError } = await supabaseClient.rpc("trigger_all_auto_saves");

    if (rpcError) {
      console.error("Error triggering auto-saves:", rpcError);
      throw rpcError;
    }

    console.log("Automated Savings Summary:", rpcData);

    // Helper to invoke send-email Edge Function
    const sendEmail = async (to: string, subject: string, message: string) => {
      try {
        const anonKeyJwt = Deno.env.get("ANON_KEY_JWT");
        const response = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${anonKeyJwt || SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({ to, subject, data: { message } }),
        });
        if (!response.ok) {
          const errText = await response.text();
          console.error(`Failed to send email to ${to}:`, errText);
        }
      } catch (err) {
        console.error(`Failed to invoke send-email for ${to}:`, err.message);
      }
    };

    // Helper to create in-app notification
    const createNotification = async (userId: string, type: string, title: string, message: string) => {
      try {
        const { error } = await supabaseClient.from("notifications").insert({
          user_id: userId,
          type: type,
          title: title,
          message: message,
          data: {},
          is_read: false,
        });
        if (error) console.error("Database log failed for notification:", error.message);
      } catch (err) {
        console.error("Failed to insert notification:", err.message);
      }
    };

    // 1. Process new successful auto-saves (created in the last 2 minutes)
    try {
      const { data: newTxs } = await supabaseClient
        .from("transactions")
        .select("*, profile:profiles(email), plan:plans(name)")
        .eq("type", "debit")
        .eq("status", "completed")
        .like("description", "Auto-Save%")
        .gte("created_at", new Date(Date.now() - 120 * 1000).toISOString());

      if (newTxs) {
        for (const tx of newTxs) {
          const email = tx.profile?.email;
          const planName = tx.plan?.name || "Savings Plan";
          const formattedAmount = new Intl.NumberFormat("en-US", {
            style: "decimal",
            minimumFractionDigits: 2,
          }).format(tx.amount);

          const title = `Successful Auto-Save: ${planName}`;
          const message = `Your automated savings contribution of ₦${formattedAmount} for your "${planName}" plan has been successfully debited from your wallet.`;
          
          await createNotification(tx.user_id, "plan", title, message);
          if (email) await sendEmail(email, title, message);
        }
      }
    } catch (txErr) {
      console.error("Failed to process auto-save tx notifications:", txErr.message);
    }

    // 2. Process new unpaid arrears (failed auto-saves created in the last 2 minutes)
    try {
      const { data: newArrears } = await supabaseClient
        .from("unpaid_arrears")
        .select("*, user_plan:user_plans(plan:plans(name)), profile:profiles(email)")
        .gte("created_at", new Date(Date.now() - 120 * 1000).toISOString());

      if (newArrears) {
        for (const arr of newArrears) {
          const email = arr.profile?.email;
          const planName = arr.user_plan?.plan?.name || "Savings Plan";
          const formattedAmount = new Intl.NumberFormat("en-US", {
            style: "decimal",
            minimumFractionDigits: 2,
          }).format(arr.amount);
          const formattedPenalty = new Intl.NumberFormat("en-US", {
            style: "decimal",
            minimumFractionDigits: 2,
          }).format(arr.penalty_fee);

          const title = `Failed Auto-Save Arrear: ${planName}`;
          const message = `Alert: Your automated savings contribution of ₦${formattedAmount} for your "${planName}" plan failed due to insufficient general wallet balance. An unpaid arrear of ₦${formattedAmount} (plus penalty of ₦${formattedPenalty}) has been recorded on your account.`;

          await createNotification(arr.user_id, "plan", title, message);
          if (email) await sendEmail(email, title, message);
        }
      }
    } catch (arrErr) {
      console.error("Failed to process auto-save arrears notifications:", arrErr.message);
    }

    // 3. Loan Arrears & Overdue/Default checks
    try {
      const { data: activeLoans } = await supabaseClient
        .from("loans")
        .select("*, profile:profiles(email)")
        .eq("status", "active");

      if (activeLoans) {
        for (const loan of activeLoans) {
          const dueDate = new Date(
            new Date(loan.created_at).getTime() +
              loan.duration_months * 30 * 24 * 60 * 60 * 1000
          );
          const now = new Date();
          if (now > dueDate) {
            console.log(`Loan ${loan.loan_number} is overdue. Marking as defaulted...`);
            
            const { error: updateError } = await supabaseClient
              .from("loans")
              .update({ status: "defaulted" })
              .eq("id", loan.id);

            if (!updateError) {
              const email = loan.profile?.email;
              const formattedAmount = new Intl.NumberFormat("en-US", {
                style: "decimal",
                minimumFractionDigits: 2,
              }).format(loan.amount);

              const title = "Loan Payment Arrears Alert (Overdue)";
              const message = `Urgent Alert: Your loan ${loan.loan_number} of ₦${formattedAmount} is overdue (due date was ${dueDate.toLocaleDateString()}). Your account has been placed in defaulted status, and a 5% late fee may apply. Please settle your arrears immediately.`;

              await createNotification(loan.user_id, "loan", title, message);
              if (email) await sendEmail(email, title, message);
            }
          }
        }
      }
    } catch (loanErr) {
      console.error("Failed to process loan arrears check:", loanErr.message);
    }

    // 4. Upcoming 24h Plan Payment Reminders
    try {
      const checkIsDueSoon = (planType: string) => {
        const today = new Date();
        const currentDay = today.getDate();
        const isSunday = today.getDay() === 0;
        const isSaturday = today.getDay() === 6;
        
        switch (planType) {
          case "daily_drop":
            return true;
          case "marathon":
          case "sprint":
          case "anchor":
          case "ajo_circle":
          case "step_up":
            return isSaturday || isSunday;
          case "monthly_bloom":
            return currentDay >= 25 && currentDay <= 28;
          default:
            return false;
        }
      };

      const checkHasPaidForPeriod = async (userId: string, planId: string, planType: string) => {
        const today = new Date();
        let sinceDate = new Date();

        if (planType === "daily_drop") {
          sinceDate.setHours(0, 0, 0, 0);
        } else if (planType === "monthly_bloom") {
          sinceDate = new Date(today.getFullYear(), today.getMonth(), 1);
        } else {
          // Weekly: Find last Sunday
          const day = today.getDay();
          const diff = today.getDate() - day; // Adjust to last Sunday
          const tempDate = new Date();
          tempDate.setDate(diff);
          tempDate.setHours(0, 0, 0, 0);
          sinceDate = tempDate;
        }

        const { data } = await supabaseClient
          .from("transactions")
          .select("id")
          .eq("user_id", userId)
          .eq("plan_id", planId)
          .eq("status", "completed")
          .gte("created_at", sinceDate.toISOString())
          .limit(1);

        return (data && data.length > 0);
      };

      const getReminderCount = async (userId: string, planName: string) => {
        const { count } = await supabaseClient
          .from("notifications")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("type", "reminder")
          .ilike("title", `Upcoming Payment Reminder: ${planName}%`)
          .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

        return count || 0;
      };

      const { data: activeUserPlans } = await supabaseClient
        .from("user_plans")
        .select("*, plan:plans(*), profile:profiles(email)")
        .eq("status", "active");

      if (activeUserPlans) {
        for (const up of activeUserPlans) {
          const planType = up.plan?.type;
          const planName = up.plan?.name;
          
          if (checkIsDueSoon(planType)) {
            const hasPaid = await checkHasPaidForPeriod(up.user_id, up.plan_id, planType);
            if (!hasPaid) {
              const count = await getReminderCount(up.user_id, planName);
              if (count < 5) {
                const email = up.profile?.email;
                const title = `Upcoming Payment Reminder: ${planName} (${count + 1}/5)`;
                const amountToSave = up.plan_metadata?.fixed_amount || up.plan?.fixed_amount || 0;
                const formattedAmount = new Intl.NumberFormat("en-US", {
                  style: "decimal",
                  minimumFractionDigits: 2,
                }).format(amountToSave);

                const message = `Friendly reminder: Your contribution of ₦${formattedAmount} for your "${planName}" savings plan is due soon. Please ensure your General Wallet is sufficiently funded to allow the auto-save deduction or pay manually.`;

                await createNotification(up.user_id, "reminder", title, message);
                if (email) await sendEmail(email, title, message);
                console.log(`Sent payment reminder ${count + 1}/5 to user ${up.user_id} for ${planName}`);
              }
            }
          }
        }
      }
    } catch (remindErr) {
      console.error("Failed to process payment reminders:", remindErr.message);
    }

    return new Response(
      JSON.stringify({
        message: "Automated savings process and notification dispatches completed",
        summary: rpcData,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    console.error("Critical error in scheduled-auto-save:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
