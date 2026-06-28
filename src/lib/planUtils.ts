import { SupabaseClient } from "@supabase/supabase-js";

import { notificationDispatcher } from "./notificationDispatcher";

export interface PlanMaturityStatus {
  isMatured: boolean;
  isDueSoon: boolean; // within 3 days
  maturityDate: Date;
  daysRemaining: number;
}

function getWeekNumber(d: Date): number {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function addCalendarMonths(startDate: Date, months: number): Date {
  const targetDate = new Date(startDate);
  const expectedMonth = (targetDate.getMonth() + months) % 12;
  targetDate.setMonth(targetDate.getMonth() + months);
  // Rollover protection: If day overflowed (e.g., Jan 31 + 1 month became Mar 3), set to last day of target month (e.g., Feb 28/29)
  if (targetDate.getMonth() !== expectedMonth) {
    targetDate.setDate(0);
  }
  return targetDate;
}

export function calculateMaturityForPlan(userPlan: any): PlanMaturityStatus | null {
  const startDateStr = userPlan.start_date;
  if (!startDateStr) return null;

  const startDate = new Date(startDateStr);
  const meta = userPlan.plan_metadata || {};
  const plan = userPlan.plan || userPlan.plans || {};
  let durationDays = 0;
  let isMonthlyBloom = false;

  if (plan.type === "daily_drop") {
    durationDays = meta.selected_duration || 31;
  } else if (plan.type === "monthly_bloom") {
    isMonthlyBloom = true;
  } else if (plan.type === "step_up") {
    durationDays = (meta.selected_duration || plan.duration_weeks || 52) * 7;
  } else if (plan.type === "marathon") {
    const joinWeek = getWeekNumber(startDate);
    const selectedDur = meta.selected_duration || plan.duration_weeks || 48;
    const effectiveWeeks = Math.max(1, Math.min(selectedDur, 50 - joinWeek));
    durationDays = effectiveWeeks * 7;
  } else if (plan.type === "ajo_circle") {
    durationDays = (plan.duration_weeks || 10) * 7;
  } else if (plan.type === "anchor") {
    durationDays = 48 * 7;
  } else {
    durationDays = (plan.duration_weeks || plan.config?.duration_weeks || 1) * 7;
  }

  const maturityDate = new Date(startDate);
  if (isMonthlyBloom) {
    const months = meta.selected_duration || 12;
    const targetMaturity = addCalendarMonths(startDate, months);
    maturityDate.setTime(targetMaturity.getTime());
    maturityDate.setDate(maturityDate.getDate() + 1);
  } else {
    maturityDate.setDate(maturityDate.getDate() + durationDays + 1);
  }

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

export function getEstimatedMaturityDate(
  userPlan?: any,
  defaultDurationDays?: number,
): string | null {
  if (userPlan) {
    const status = calculateMaturityForPlan(userPlan);
    if (!status || !status.maturityDate) return null;
    return status.maturityDate.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } else if (defaultDurationDays) {
    const date = new Date(Date.now() + defaultDurationDays * 24 * 60 * 60 * 1000);
    return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
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
            message: `Your savings plan "${planName}" has matured! The balance of ₦${Number(up.current_balance).toLocaleString()} is now ready for withdrawal or roll-over.`,
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
