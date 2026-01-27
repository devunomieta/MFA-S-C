
import { SupabaseClient } from "@supabase/supabase-js";

export interface PlanMaturityStatus {
    isMatured: boolean;
    isDueSoon: boolean; // within 3 days
    maturityDate: Date;
    daysRemaining: number;
}

export function calculateMaturity(startDateStr: string, durationWeeks: number): PlanMaturityStatus {
    const startDate = new Date(startDateStr);
    const durationDays = durationWeeks * 7;

    // Maturity is Duration + 1 Day
    const maturityDate = new Date(startDate);
    maturityDate.setDate(maturityDate.getDate() + durationDays + 1);

    const now = new Date();

    // Reset times to midnight for accurate day comparison
    const nowmidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const maturityMidnight = new Date(maturityDate.getFullYear(), maturityDate.getMonth(), maturityDate.getDate());

    const diffTime = maturityMidnight.getTime() - nowmidnight.getTime();
    const daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

    const isMatured = now >= maturityDate;
    const isDueSoon = !isMatured && daysRemaining <= 3;

    return {
        isMatured,
        isDueSoon,
        maturityDate,
        daysRemaining
    };
}

/**
 * Checks and updates status for plans that have matured but are still marked as 'active'.
 * This should be called on dashboard load.
 */
export async function checkAndProcessMaturity(supabase: SupabaseClient, userPlans: any[]) {
    const maturedPlans = userPlans.filter(up => {
        if (up.status !== 'active') return false;
        const { isMatured } = calculateMaturity(up.start_date, up.plan.duration_weeks || 0);
        return isMatured;
    });

    if (maturedPlans.length > 0) {
        console.log(`Found ${maturedPlans.length} plans matured. Updating status...`);
        // Batch update status to 'matured'
        // Supabase doesn't support batch update with different values easily in one query without RPC, 
        // but here all values are 'matured'. We can do a single update for all IDs.
        const ids = maturedPlans.map(up => up.id);

        const { error } = await supabase
            .from('user_plans')
            .update({ status: 'matured' })
            .in('id', ids);

        if (error) {
            console.error("Failed to update matured plans:", error);
            return false;
        }
        return true; // Indicates updates were made
    }
    return false;
}
