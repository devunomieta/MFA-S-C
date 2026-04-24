
/**
 * Unified utility for wallet calculations to ensure consistency across the app.
 */

export interface Transaction {
    id: string;
    related_id?: string | null;
    type: 'deposit' | 'withdrawal' | 'loan_disbursement' | 'loan_repayment' | 'transfer' | 'fee' | 'service_charge' | 'payout' | 'maturity_payout' | 'internal_transfer' | 'penalty' | 'credit' | 'debit';
    status: 'pending' | 'completed' | 'failed';
    amount: number;
    charge?: number;
    plan_id?: string | null;
    plan?: {
        type: string;
        name: string;
    };
}

/**
 * Calculates the balance for a set of transactions.
 * Rules:
 * - Inflows (Credit): deposit, loan_disbursement, payout, maturity_payout, credit.
 * - Outflows (Debit): withdrawal, loan_repayment, fee, service_charge, penalty, debit.
 * - Transfers: 
 *      - If plan_id is NULL: It is a DEBIT from the General Wallet (Outflow).
 *      - If plan_id is NOT NULL: It is a CREDIT to that Plan Wallet (Inflow).
 */
export function calculateBalance(transactions: Transaction[], filterPlanId: string | null = null, filterPlanType: string | null = null): number {
    return transactions.reduce((acc, curr) => {
        const amt = Number(curr.amount);
        const chg = Number(curr.charge || 0);
        
        // Match logic:
        // 1. If filterPlanType is provided (e.g. 'daily_drop'), match by plan type.
        // 2. Otherwise match by exact filterPlanId (NULL for General Wallet).
        const isPlanMatch = filterPlanType === null && curr.plan_id === filterPlanId;
        const isTypeMatch = filterPlanType !== null && curr.plan?.type === filterPlanType;

        if (!isPlanMatch && !isTypeMatch) return acc;

        // --- INFLOWS (Credits) ---
        if (['deposit', 'loan_disbursement', 'payout', 'maturity_payout', 'credit'].includes(curr.type)) {
            if (curr.status === 'completed') {
                return acc + amt - chg;
            }
        }

        // --- OUTFLOWS (Debits) ---
        if (['withdrawal', 'loan_repayment', 'fee', 'service_charge', 'penalty', 'debit'].includes(curr.type)) {
            if (['completed', 'pending'].includes(curr.status)) {
                return acc - amt - chg;
            }
        }

        // --- TRANSFERS (Internal movements) ---
        if (curr.type === 'transfer' || curr.type === 'internal_transfer') {
            if (curr.status === 'completed') {
                // If we are looking at the General Wallet (filterPlanId is NULL)
                // then any transfer with plan_id=NULL is a DEBIT from it.
                if (filterPlanId === null && !filterPlanType) {
                    return acc - amt - chg;
                } 
                // If we are looking at a specific Plan Wallet
                // then any transfer with that plan_id is a CREDIT to it.
                else {
                    return acc + amt - chg;
                }
            }
        }

        return acc;
    }, 0);
}
