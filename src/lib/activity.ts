import { supabase } from "./supabase";

export type ActivityAction = 
    | 'USER_JOIN' 
    | 'PLAN_JOIN' 
    | 'DEPOSIT' 
    | 'WITHDRAWAL' 
    | 'AUTH_FAILURE' 
    | 'PASSWORD_RESET_REQUEST'
    | 'SENSITIVE_DATA_CHANGE'
    | 'MFA_UPDATE';

interface LogActivityParams {
    userId?: string; // Optional for failures
    action: ActivityAction;
    details: Record<string, any>;
    isPublic?: boolean;
}

/**
 * Centrally logs platform activity for social proof and audit trails.
 */
export async function logActivity({ userId, action, details, isPublic = false }: LogActivityParams) {
    try {
        const { error } = await supabase.from('activity_logs').insert({
            user_id: userId || null,
            action,
            details: {
                ...details,
                userAgent: navigator.userAgent,
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
