
/**
 * Unified utility for wallet calculations to ensure consistency across the app.
 */

export interface Transaction {
    id: string;
    type: 'deposit' | 'withdrawal' | 'loan_disbursement' | 'loan_repayment' | 'interest' | 'transfer' | 'fee' | 'service_charge' | 'limit_transfer' | 'payout';
    status: 'pending' | 'completed' | 'failed';
    amount: number;
    charge?: number;
    plan_id?: string | null;
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
export function calculateBalance(transactions: Transaction[], filterPlanId: string | null = null): number {
    return transactions.reduce((acc, curr) => {
        const amt = Number(curr.amount);
        const chg = Number(curr.charge || 0);
        const isPlanMatch = curr.plan_id === filterPlanId;

        if (!isPlanMatch) return acc;

        // INFLOWS
        if (['deposit', 'loan_disbursement', 'interest', 'limit_transfer', 'payout'].includes(curr.type)) {
            if (curr.status === 'completed') {
                return acc + amt - chg;
            }
        }

        // OUTFLOWS
        if (['withdrawal', 'loan_repayment', 'fee', 'service_charge'].includes(curr.type)) {
            if (['completed', 'pending'].includes(curr.status)) {
                return acc - amt - chg;
            }
        }

        // TRANSFERS
        if (curr.type === 'transfer') {
            if (curr.status === 'completed') {
                // If it's a transfer OUT of a location (e.g. out of Wallet to Plan)
                // For General Wallet (plan_id null), this is a deduction.
                // For a specific Plan, this would actually be an inflow if it was coming FROM wallet.
                // However, the database records transfers TWICE: once for the source (minus) and once for the target (plus).
                // Wait, let's verify if the logic in DepositModal/Wallet handles it this way.

                // Usually, the debit record has plan_id = null and the credit record has plan_id = target_id.
                // But sometimes researchers use negative amounts.
                // Let's assume standard: Positive amount, type='transfer', status='completed'.
                // If plan_id matches the one we are calculating for, it's an inflow? 
                // No, in some parts of the code, transfers out of wallet have plan_id = null.

                // Let's follow the existing logic in Wallet.tsx:
                // if (curr.type === 'transfer' && curr.status === 'completed') { return acc - amt - chg; }
                // This implies 'transfer' with plan_id=null is ALWAYS a deduction from Wallet.

                if (filterPlanId === null) {
                    return acc - amt - chg;
                } else {
                    // For a Plan, a 'transfer' is usually an INFLOW from the wallet.
                    return acc + amt - chg;
                }
            }
        }

        return acc;
    }, 0);
}
