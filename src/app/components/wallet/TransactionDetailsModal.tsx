import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/app/components/ui/dialog";
import { Badge } from "@/app/components/ui/badge";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { FileText, ArrowUpRight, ArrowDownLeft, Clock } from "lucide-react";

interface TransactionDetailsModalProps {
    transaction: any;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function TransactionDetailsModal({ transaction, open, onOpenChange }: TransactionDetailsModalProps) {
    const [relatedData, setRelatedData] = useState<any>(null);
    const [relatedHistory, setRelatedHistory] = useState<any[]>([]);

    useEffect(() => {
        if (transaction && open) {
            fetchContextData();
        }
    }, [transaction, open]);

    const formatCurrency = (val: number) => new Intl.NumberFormat('en-US', { style: 'decimal', minimumFractionDigits: 2 }).format(val);

    async function fetchContextData() {
        setRelatedData(null);
        setRelatedHistory([]);

        if (transaction.type === 'loan_repayment' || transaction.type === 'loan_disbursement') {
            // 1. LOAN CONTEXT
            if (transaction.loan_id) {
                const { data: loan } = await supabase.from('loans').select('*').eq('id', transaction.loan_id).single();
                if (loan) {
                    setRelatedData(loan);
                    // Fetch all tx for this loan
                    const { data: history } = await supabase.from('transactions')
                        .select('*')
                        .eq('loan_id', transaction.loan_id)
                        .order('created_at', { ascending: false });
                    if (history) setRelatedHistory(history);
                }
            }
        } else if (transaction.plan_id) {
            // 2. PLAN CONTEXT
            // 2. PLAN CONTEXT
            // In Wallet.tsx, plan_id in transactions usually refers to the 'plan table' ID or 'user_plans' ID?
            // In insert: plan_id: plan.plan.id (which is the PLAN DEFINITION ID). 
            // BUT wait, if we want specific user plan history, we need user_plans ID.
            // Looking at Wallet.tsx: plan_id: plan.plan.id.
            // This means we are linking to the generic PLAN (e.g., "Silver Plan"), not the specific user subscription instance.
            // Let's check logic. modifying this strictly on available data.
            // If plan_id exists, we can show "Related Plan Transactions" for this user + plan_id.

            if (transaction.plan_id) {
                const { data: planDetails } = await supabase.from('plans').select('*').eq('id', transaction.plan_id).single();
                setRelatedData(planDetails);

                const { data: history } = await supabase.from('transactions')
                    .select('*')
                    .eq('plan_id', transaction.plan_id)
                    .eq('user_id', transaction.user_id)
                    .order('created_at', { ascending: false });
                if (history) setRelatedHistory(history);
            }
        }

    }

    if (!transaction) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="dark:bg-gray-900 dark:border-gray-800 sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${['deposit', 'loan_disbursement'].includes(transaction.type) ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'
                            }`}>
                            {['deposit', 'loan_disbursement'].includes(transaction.type) ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                        </div>
                        <div>
                            <DialogTitle className="dark:text-white capitalize text-xl">{transaction.type.replace('_', ' ')}</DialogTitle>
                            <DialogDescription className="dark:text-gray-400 text-xs">
                                Transaction ID: {transaction.id.slice(0, 8)}...
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="space-y-6 py-2">
                    {/* Main Request Details */}
                    <div className="grid grid-cols-2 gap-4 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg">
                        <div>
                            <p className="text-xs text-gray-500">Amount</p>
                            <p className={`text-xl font-bold ${['deposit', 'loan_disbursement'].includes(transaction.type) ? 'text-emerald-600' : 'text-gray-900 dark:text-white'
                                }`}>
                                ${formatCurrency(transaction.amount)}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500">Status</p>
                            <Badge variant={transaction.status === 'completed' ? 'default' : 'secondary'} className="capitalize mt-1">
                                {transaction.status}
                            </Badge>
                        </div>
                        <div className="col-span-2">
                            <p className="text-xs text-gray-500">Description</p>
                            <p className="text-sm dark:text-gray-300">{transaction.description}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500">Date</p>
                            <p className="text-sm dark:text-gray-300">{new Date(transaction.created_at).toLocaleString()}</p>
                        </div>
                    </div>

                    {/* RECEIPT SECTION */}
                    {transaction.receipt_url && (
                        <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg border border-gray-100 dark:border-gray-700">
                            <h4 className="text-xs text-gray-500 mb-2 flex items-center gap-2">
                                <FileText className="w-3.5 h-3.5" /> Payment Receipt
                            </h4>
                            <div className="relative rounded-md overflow-hidden bg-white dark:bg-black/20 border border-gray-200 dark:border-gray-700 min-h-[200px] flex items-center justify-center">
                                <img
                                    src={transaction.receipt_url}
                                    alt="Payment Receipt"
                                    className="w-full h-auto max-h-[300px] object-contain"
                                    onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                        e.currentTarget.parentElement?.classList.add('flex-col', 'p-4');
                                        const fallback = document.createElement('div');
                                        fallback.innerHTML = `<p class="text-xs text-gray-500 mb-2">Image preview unavailable.</p><a href="${transaction.receipt_url}" target="_blank" class="text-xs text-blue-600 underline break-all">${transaction.receipt_url}</a>`;
                                        e.currentTarget.parentElement?.appendChild(fallback);
                                    }}
                                />
                            </div>
                        </div>
                    )}

                    {/* CONTEXT: LOAN DETAILS */}
                    {(transaction.type === 'loan_repayment' || transaction.type === 'loan_disbursement') && relatedData && (
                        <div className="space-y-3 border-t border-gray-100 dark:border-gray-700 pt-4">
                            <h4 className="text-sm font-semibold dark:text-white flex items-center gap-2">
                                <FileText className="w-4 h-4" /> Principal Loan Details
                            </h4>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                                <div className="p-3 border rounded dark:border-gray-700">
                                    <span className="text-xs text-gray-500 block">Loan Number</span>
                                    <span className="font-medium dark:text-white">{relatedData.loan_number}</span>
                                </div>
                                <div className="p-3 border rounded dark:border-gray-700">
                                    <span className="text-xs text-gray-500 block">Current Status</span>
                                    <span className={`font-medium capitalize ${relatedData.status === 'active' ? 'text-green-600' : 'text-gray-600'}`}>
                                        {relatedData.status}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* CONTEXT: PLAN DETAILS */}
                    {['deposit', 'withdrawal', 'transfer'].includes(transaction.type) && transaction.plan_id && relatedData && (
                        <div className="space-y-3 border-t border-gray-100 dark:border-gray-700 pt-4">
                            <h4 className="text-sm font-semibold dark:text-white flex items-center gap-2">
                                <FileText className="w-4 h-4" /> Related Plan: {relatedData.name}
                            </h4>
                            <p className="text-xs text-gray-500">{relatedData.description}</p>
                        </div>
                    )}

                    {/* RELATED HISTORY */}
                    {relatedHistory.length > 0 && (
                        <div className="space-y-3 border-t border-gray-100 dark:border-gray-700 pt-4">
                            <h4 className="text-sm font-semibold dark:text-white flex items-center gap-2">
                                <Clock className="w-4 h-4" /> Related Transactions
                            </h4>
                            <div className="border rounded-md border-gray-100 dark:border-gray-700 max-h-[200px] overflow-y-auto">
                                {relatedHistory.map(tx => (
                                    <div key={tx.id} className={`flex justify-between items-center p-2 text-xs border-b last:border-0 border-gray-100 dark:border-gray-800 ${tx.id === transaction.id ? 'bg-blue-50 dark:bg-blue-900/10' : ''}`}>
                                        <div className="flex flex-col">
                                            <span className="font-medium dark:text-gray-300">{new Date(tx.created_at).toLocaleDateString()}</span>
                                            <span className="text-gray-500 text-[10px]">{tx.type.replace('_', ' ')}</span>
                                        </div>
                                        <span className={['deposit', 'loan_disbursement'].includes(tx.type) ? 'text-emerald-600' : 'text-gray-600'}>
                                            {['deposit', 'loan_disbursement'].includes(tx.type) ? '+' : '-'}${formatCurrency(tx.amount)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
