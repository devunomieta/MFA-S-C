import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/app/components/ui/dialog";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { FileText, ArrowUpRight, ArrowDownLeft, Clock, Check, X, User, Mail } from "lucide-react";

interface AdminTransactionDetailsProps {
    transaction: any;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onApprove?: (tx: any) => void;
    onReject?: (tx: any) => void;
}

export function AdminTransactionDetails({ transaction, open, onOpenChange, onApprove, onReject }: AdminTransactionDetailsProps) {
    const [relatedData, setRelatedData] = useState<any>(null);
    const [relatedHistory, setRelatedHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (transaction && open) {
            fetchContextData();
        }
    }, [transaction, open]);

    const formatCurrency = (val: number) => new Intl.NumberFormat('en-US', { style: 'decimal', minimumFractionDigits: 2 }).format(val);

    async function fetchContextData() {
        setLoading(true);
        setRelatedData(null);
        setRelatedHistory([]);

        try {
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
                const { data: planDetails } = await supabase.from('plans').select('*').eq('id', transaction.plan_id).single();
                setRelatedData(planDetails);

                const { data: history } = await supabase.from('transactions')
                    .select('*')
                    .eq('plan_id', transaction.plan_id)
                    .eq('user_id', transaction.user_id)
                    .order('created_at', { ascending: false });
                if (history) setRelatedHistory(history);
            }
        } catch (error) {
            console.error("Error fetching context:", error);
        } finally {
            setLoading(false);
        }
    }

    if (!transaction) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-white sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-full ${['deposit', 'loan_disbursement'].includes(transaction.type) ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                                {['deposit', 'loan_disbursement'].includes(transaction.type) ? <ArrowDownLeft className="w-6 h-6" /> : <ArrowUpRight className="w-6 h-6" />}
                            </div>
                            <div>
                                <DialogTitle className="capitalize text-xl flex items-center gap-2">
                                    {transaction.type.replace('_', ' ')}
                                    <Badge variant={transaction.status === 'completed' ? 'default' : transaction.status === 'pending' ? 'secondary' : 'destructive'} className="ml-2 capitalize">
                                        {transaction.status}
                                    </Badge>
                                </DialogTitle>
                                <DialogDescription className="text-xs font-mono mt-1">
                                    ID: {transaction.id}
                                </DialogDescription>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-slate-500">Amount</p>
                            <p className={`text-2xl font-bold ${['deposit', 'loan_disbursement'].includes(transaction.type) ? 'text-emerald-600' : 'text-slate-900'}`}>
                                ${formatCurrency(transaction.amount)}
                            </p>
                        </div>
                    </div>
                </DialogHeader>

                <div className="space-y-6 py-2">
                    {/* USER INFO SECTION */}
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <User className="w-3 h-3" /> User Information
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <span className="text-xs text-slate-500 block">Name</span>
                                <span className="font-medium text-slate-900">{transaction.profile?.full_name || 'Unknown User'}</span>
                            </div>
                            <div>
                                <span className="text-xs text-slate-500 block">Email</span>
                                <div className="flex items-center gap-1">
                                    <span className="font-medium text-slate-900 truncate">{transaction.profile?.email}</span>
                                    {transaction.profile?.email && (
                                        <a href={`mailto:${transaction.profile.email}`} className="text-blue-500 hover:text-blue-700">
                                            <Mail className="w-3 h-3" />
                                        </a>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* RECEIPT SECTION */}
                    {transaction.receipt_url && (
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                <FileText className="w-3 h-3" /> Receipt / Proof
                            </h4>
                            <div className="relative rounded-md overflow-hidden bg-white border border-slate-200 min-h-[200px] flex items-center justify-center group">
                                <img
                                    src={transaction.receipt_url}
                                    alt="Payment Receipt"
                                    className="w-full h-auto max-h-[400px] object-contain"
                                />
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <a
                                        href={transaction.receipt_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="bg-white text-slate-900 px-4 py-2 rounded-full font-medium text-sm hover:bg-slate-100"
                                    >
                                        View Full Size
                                    </a>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* CONTEXT: PLAN or LOAN */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Left Col: Description/Meta */}
                        <div>
                            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Description</h4>
                            <p className="text-sm text-slate-700 bg-white p-3 rounded border border-slate-100">
                                {transaction.description || 'No description provided.'}
                            </p>

                            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 mt-4">Date</h4>
                            <p className="text-sm text-slate-700 flex items-center gap-2">
                                <Clock className="w-3 h-3 text-slate-400" />
                                {new Date(transaction.created_at).toLocaleString()}
                            </p>
                        </div>

                        {/* Right Col: Context Data */}
                        <div>
                            {relatedData && transaction.plan_id && (
                                <div className="bg-blue-50 p-3 rounded border border-blue-100">
                                    <h4 className="text-xs font-semibold text-blue-600 mb-1">Related Plan</h4>
                                    <p className="font-semibold text-blue-900">{relatedData.name}</p>
                                    <p className="text-xs text-blue-700 mt-1 line-clamp-2">{relatedData.description}</p>
                                </div>
                            )}
                            {relatedData && (transaction.type === 'loan_repayment' || transaction.type === 'loan_disbursement') && (
                                <div className="bg-amber-50 p-3 rounded border border-amber-100">
                                    <h4 className="text-xs font-semibold text-amber-600 mb-1">Loan #{relatedData.loan_number}</h4>
                                    <div className="flex justify-between text-xs mt-2">
                                        <span className="text-amber-800">Status: <span className="font-bold uppercase">{relatedData.status}</span></span>
                                        <span className="text-amber-800">Amount: ${formatCurrency(relatedData.amount)}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* RELATED HISTORY TABLE */}
                    {loading ? (
                        <div className="text-center py-4 text-slate-400 text-xs">Loading related history...</div>
                    ) : relatedHistory.length > 0 && (
                        <div className="border-t border-slate-100 pt-4">
                            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Related History</h4>
                            <div className="border rounded-md border-slate-200 max-h-[200px] overflow-y-auto bg-white">
                                <table className="w-full text-xs text-left">
                                    <thead className="bg-slate-50 sticky top-0 text-slate-500">
                                        <tr>
                                            <th className="px-3 py-2">Date</th>
                                            <th className="px-3 py-2">Type</th>
                                            <th className="px-3 py-2 text-right">Amount</th>
                                            <th className="px-3 py-2 text-right">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {relatedHistory.map(tx => (
                                            <tr key={tx.id} className={tx.id === transaction.id ? 'bg-blue-50' : 'hover:bg-slate-50'}>
                                                <td className="px-3 py-2 text-slate-600">{new Date(tx.created_at).toLocaleDateString()}</td>
                                                <td className="px-3 py-2 capitalize">{tx.type.replace('_', ' ')}</td>
                                                <td className={`px-3 py-2 text-right font-medium ${['deposit', 'loan_disbursement'].includes(tx.type) ? 'text-emerald-600' : 'text-slate-600'}`}>
                                                    {['deposit', 'loan_disbursement'].includes(tx.type) ? '+' : '-'}${formatCurrency(tx.amount)}
                                                </td>
                                                <td className="px-3 py-2 text-right">
                                                    <span className={`px-1.5 py-0.5 rounded text-[10px] capitalize ${tx.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                                                        tx.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                                                            'bg-red-100 text-red-700'
                                                        }`}>
                                                        {tx.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                {/* ACTIONS FOOTER */}
                {transaction.status === 'pending' && (onApprove || onReject) && (
                    <DialogFooter className="bg-slate-50 -mx-6 -mb-6 p-4 border-t border-slate-100 flex justify-end gap-2 sticky bottom-0">
                        {onReject && (
                            <Button variant="outline" className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => onReject(transaction)}>
                                <X className="w-4 h-4 mr-1" /> Reject
                            </Button>
                        )}
                        {onApprove && (
                            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => onApprove(transaction)}>
                                <Check className="w-4 h-4 mr-1" /> Approve
                            </Button>
                        )}
                    </DialogFooter>
                )}
            </DialogContent>
        </Dialog>
    );
}
