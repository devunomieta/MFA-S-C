export interface Plan {
    id: string;
    name: string;
    description: string;
    service_charge: number;
    duration_weeks: number;
    duration_months: number;
    min_amount: number;
    contribution_type: 'fixed' | 'flexible';
    fixed_amount: number;
    whatsapp_link?: string;
    start_date?: string;
    is_active: boolean;
    created_at?: string;
    type: 'standard' | 'marathon' | 'sprint' | 'anchor' | 'daily_drop' | 'step_up' | 'monthly_bloom' | 'ajo_circle';
    config?: MarathonConfig | any;
    subscriber_count?: number;
}

export interface MarathonConfig {
    durations: number[];
    tiers: { min: number; max: number; fee: number }[];
}

export const CHARGE_TIERS = [
    { min: 3000, max: 14000, fee: 200 },
    { min: 14500, max: 23000, fee: 300 },
    { min: 23500, max: 999999999, fee: 500 }
];

export interface UserPlan {
    id: string;
    user_id: string;
    plan_id: string;
    plan: Plan;
    current_balance: number;
    status: 'pending_activation' | 'active' | 'completed' | 'cancelled' | 'matured';
    start_date: string;
    created_at: string;
    updated_at?: string;
    plan_metadata?: {
        // Marathon specific
        selected_duration?: number;
        total_weeks_paid?: number;
        current_week_paid?: boolean;
        arrears_amount?: number;
        last_payment_date?: string;

        // Sprint specific
        weeks_completed?: number;
        current_week_total?: number;
        last_settlement_date?: string;
        start_date?: string;

        // Daily Drop specific
        fixed_amount?: number;
        total_days_paid?: number;

        // Step-Up specific
        week_paid_so_far?: number;
        days_advanced?: number;

        // Monthly Bloom specific
        month_paid_so_far?: number;
        target_amount?: number;
        months_completed?: number;
        months_duration?: number;
        arrears?: number;

        // Ajo Circle specific
        picking_turns?: number[]; // Weeks assigned for payout (e.g. [3, 7])
        current_week?: number;
        week_paid?: boolean;
        missed_weeks?: number;
    };
}
