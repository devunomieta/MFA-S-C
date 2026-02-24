
/**
 * Unified utility for wallet calculations to ensure consistency across the app.
 */

export interface Transaction {
    id: string;
    type: 'deposit' | 'withdrawal' | 'loan_disbursement' | 'loan_repayment' | 'interest' | 'transfer' | 'fee' | 'service_charge' | 'limit_transfer' | 'payout' | 'maturity_payout' | 'internal_transfer';
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
 * - Deposits, Loan Disbursements, Interest, Limit Transfers, Payouts: Add if COMPLETED (minus charges)
 * - Withdrawals, Loan Repayments: Deduct if COMPLETED or PENDING (to reserve funds)
 * - Transfers: 
 *      - If plan_id is null (General Wallet): Deduct if COMPLETED
 *      - If plan_id is NOT null (Plan Wallet): Usually handled by the plan balance logic, 
 *        but here we treat it as an inflow to the plan.
 */
export function calculateBalance(transactions: Transaction[], filterPlanId: string | null = null, filterPlanType: string | null = null): number {
    return transactions.reduce((acc, curr) => {
        const amt = Number(curr.amount);
        const chg = Number(curr.charge || 0);
        // If filterPlanType is provided, we ONLY match by type.
        // If filterPlanType is null, we match by filterPlanId (which defaults to null for General Wallet).
        const isPlanMatch = filterPlanType === null && curr.plan_id === filterPlanId;
        const isTypeMatch = filterPlanType !== null && curr.plan?.type === filterPlanType;

        if (!isPlanMatch && !isTypeMatch) return acc;

        // --- INFLOWS ---
        if (['deposit', 'loan_disbursement', 'interest', 'limit_transfer', 'payout', 'maturity_payout'].includes(curr.type)) {
            if (curr.status === 'completed') {
                return acc + amt - chg;
            }
        }

        // --- OUTFLOWS ---
        if (['withdrawal', 'loan_repayment', 'fee', 'service_charge', 'penalty'].includes(curr.type)) {
            if (['completed', 'pending'].includes(curr.status)) {
                return acc - amt - chg;
            }
        }

        // --- TRANSFERS ---
        if (curr.type === 'transfer' || curr.type === 'internal_transfer') {
            if (curr.status === 'completed') {
                // Heuristic: If it's a transfer and plan_id is NULL, it's LEAVING the General Wallet.
                // If it's a transfer and plan_id IS set, it's ENTERING that Plan.
                if (filterPlanId === null && !filterPlanType) {
                    return acc - amt - chg;
                } else {
                    return acc + amt - chg;
                }
            }
        }

        return acc;
    }, 0);
}
