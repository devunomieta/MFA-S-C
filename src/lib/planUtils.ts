import { SupabaseClient } from "@supabase/supabase-js";
import { notificationDispatcher } from "./notificationDispatcher";

export interface PlanMaturityStatus {
  isMatured: boolean;
  isDueSoon: boolean; // within 3 days
  maturityDate: Date;
  daysRemaining: number;
}

export function calculateMaturityForPlan(userPlan: any): PlanMaturityStatus | null {
  const startDateStr = userPlan.start_date;
  if (!startDateStr) return null;

  const startDate = new Date(startDateStr);
  const meta = userPlan.plan_metadata || {};
  const plan = userPlan.plan || userPlan.plans || {};
  let durationDays = 0;

  if (plan.type === "daily_drop") {
    durationDays = meta.selected_duration || 31;
  } else if (plan.type === "monthly_bloom") {
    durationDays = (meta.selected_duration || 12) * 30; // Approx 30 days
  } else if (plan.type === "step_up" || plan.type === "marathon") {
    durationDays = (meta.selected_duration || plan.duration_weeks || 52) * 7;
  } else if (plan.type === "ajo_circle") {
    durationDays = (plan.duration_weeks || 10) * 7;
  } else if (plan.type === "anchor") {
    durationDays = 48 * 7;
  } else {
    durationDays = (plan.duration_weeks || plan.config?.duration_weeks || 1) * 7;
  }

  const maturityDate = new Date(startDate);
  maturityDate.setDate(maturityDate.getDate() + durationDays + 1);

  const now = new Date();
  const nowmidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const maturityMidnight = new Date(
    maturityDate.getFullYear(),
    maturityDate.getMonth(),
    maturityDate.getDate(),
  );

  const diffTime = maturityMidnight.getTime() - nowmidnight.getTime();
  const daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

  const isMatured = now >= maturityDate;
  const isDueSoon = !isMatured && daysRemaining <= 3;

  return {
    isMatured,
    isDueSoon,
    maturityDate,
    daysRemaining,
  };
}

export function getEstimatedMaturityDate(userPlan?: any, defaultDurationDays?: number): string | null {
  if (userPlan) {
    const status = calculateMaturityForPlan(userPlan);
    if (!status || !status.maturityDate) return null;
    return status.maturityDate.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } else if (defaultDurationDays) {
    const date = new Date(Date.now() + defaultDurationDays * 24 * 60 * 60 * 1000);
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }
  return null;
}

/**
 * Checks and updates status for plans that have matured but are still marked as 'active'.
 * This should be called on dashboard load.
 */
export async function checkAndProcessMaturity(supabase: SupabaseClient, userPlans: any[]) {
  const maturedPlans = userPlans.filter((up) => {
    if (up.status !== "active") return false;
    const status = calculateMaturityForPlan(up);
    if (!status) return false;
    return status.isMatured;
  });

  if (maturedPlans.length > 0) {
    const ids = maturedPlans.map((up) => up.id);
    const { error } = await supabase.from("user_plans").update({ status: "matured" }).in("id", ids);

    if (error) return false;
    
    // Auto settle matured plans
    const userId = maturedPlans[0].user_id;
    await supabase.rpc("auto_settle_matured_plans", { p_user_id: userId });

    // Send notifications for matured plans
    try {
      const userId = maturedPlans[0].user_id;
      const { data: profile } = await supabase
        .from("profiles")
        .select("email")
        .eq("id", userId)
        .single();
        
      if (profile?.email) {
        for (const up of maturedPlans) {
          const planName = up.plan?.name || up.plans?.name || "Savings Plan";
          await notificationDispatcher.sendAlert({
            userId,
            email: profile.email,
            type: "plan",
            title: `Plan Maturity Alert: ${planName}`,
            message: `Your savings plan "${planName}" has matured! The balance of $${Number(up.current_balance).toLocaleString()} is now ready for withdrawal or roll-over.`
          });
        }
      }
    } catch (notifError) {
      console.error("Maturity notification error:", notifError);
    }

    return true; // Indicates updates were made
  }
  return false;
}
