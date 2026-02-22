import { supabase } from "./supabase";

export type ActivityAction = 'USER_JOIN' | 'PLAN_JOIN' | 'DEPOSIT' | 'WITHDRAWAL';

interface LogActivityParams {
    userId: string;
    action: ActivityAction;
    details: Record<string, any>;
    isPublic?: boolean;
}

/**
 * Centrally logs platform activity for social proof and audit trails.
 * If isPublic is true, it may be used by the Landing Page ActivityPopup.
 */
export async function logActivity({ userId, action, details, isPublic = true }: LogActivityParams) {
    try {
        const { error } = await supabase.from('activity_logs').insert({
            user_id: userId,
            action,
            details: {
                ...details,
                timestamp: new Date().toISOString()
            },
            is_public: isPublic
        });

        if (error) {
            console.error('Failed to log activity:', error);
        }
    } catch (e) {
        console.error('Unexpected error logging activity:', e);
    }
}
