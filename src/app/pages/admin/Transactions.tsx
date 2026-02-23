import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { toast } from "sonner";
import { Check, X, FileText, ExternalLink, Mail, AlertCircle, Eye } from "lucide-react";
import { Card, CardContent } from "@/app/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/app/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { AdminTransactionDetails } from "./AdminTransactionDetails";

export function AdminTransactions() {
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loans, setLoans] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState("all");

    // Details Modal State
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [viewingTx, setViewingTx] = useState<any>(null);

    // Deposit Rejection State
    const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
    const [selectedDeposit, setSelectedDeposit] = useState<any>(null);
    const [rejectAction, setRejectAction] = useState<'reject' | 'refund_wallet'>('reject');
    const [refundAmount, setRefundAmount] = useState("");
    const [rejectReason, setRejectReason] = useState("");

    useEffect(() => {
        fetchData();
    }, []);

    async function fetchData() {
        await Promise.all([fetchTransactions(), fetchLoans()]);
    }

    async function fetchTransactions() {
        const { data, error } = await supabase
            .from('transactions')
            .select('*, profile:profiles(full_name, email), plan:plans(name)')
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Error fetching transactions:", error);
            toast.error("Failed to fetch transactions");
        } else {
            setTransactions(data || []);
        }
    }

    async function fetchLoans() {
        const { data, error } = await supabase
            .from('loans')
            .select('*, profile:profiles(full_name, email)')
            .eq('status', 'pending')
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Error fetching loans:", error);
        } else {
            setLoans(data || []);
        }
    }

    // --- SHARED ACTIONS ---
    const contactUser = (email: string) => {
        // Simple mailto for now
        window.location.href = `mailto:${email}`;
    };

    function openDetails(tx: any) {
        setViewingTx(tx);
        setDetailsOpen(true);
    }

    // --- TRANSACTION LOGIC ---
    async function handleTransactionAction(tx: any, action: 'confirm' | 'reject') {
        // Close details if open, to handle logic cleanly (especially for dialog stacking)
        if (detailsOpen) setDetailsOpen(false);

        // Handle Deposit Logic via Dialog if Reject
        if (tx.type === 'deposit' && action === 'reject') {
            setSelectedDeposit(tx);
            setRefundAmount(tx.amount.toString()); // Default to full amount
            setRejectReason("");
            setRejectAction('reject'); // Default
            setRejectDialogOpen(true);
            return;
        }

        try {
            // Withdrawal Rejection Logic: Refund to Plan
            if (tx.type === 'withdrawal' && action === 'reject') {
                if (!confirm(`Rejecting this withdrawal will refund $${tx.amount} back to the user's plan balance. Continue?`)) return;

                if (tx.plan_id) {
                    // Refetch plan balance to be safe or just increment
                    const { error: refundError } = await supabase.rpc('increment_user_plan_balance', {
                        p_user_id: tx.user_id,
                        p_plan_id: tx.plan_id,
                        p_amount: Number(tx.amount)
                    });

                    // Fallback if RPC doesn't exist (simpler direct update for now)
                    if (refundError) {
                        // Fetch current
                        const { data: up } = await supabase.from('user_plans').select('current_balance').eq('user_id', tx.user_id).eq('plan_id', tx.plan_id).single();
                        if (up) {
                            await supabase.from('user_plans').update({ current_balance: up.current_balance + Number(tx.amount) }).eq('user_id', tx.user_id).eq('plan_id', tx.plan_id);
                        }
                    }
                } else if (!tx.plan_id) {
                    // Refund to General Wallet? (Not tracked in DB explicitly, just sum of txs. So we just mark tx as failed. 
                    // WAIT: General wallet balance is sum of completed txs. 
                    // Withdrawal (pending) doesn't deduct from General Wallet usually until completed? 
                    // Let's check Wallet.tsx: "performWithdrawal" -> Inserts 'withdrawal' (pending) -> DOES NOT UPDATE user_plans if general.
                    // Actually Wallet.tsx calculates balance from ALL transactions.
                    // If type='withdrawal' and status='pending', does it deduct? 
                    // Wallet.tsx: "if (curr.type === 'withdrawal' ...) return acc - amt". 
                    // YES, it subtracts withdrawals regardless of status if we look closely at logic?
                    // Wallet.tsx: "if (curr.type === 'withdrawal' || curr.type === 'loan_repayment') return acc - amt - chg;"
                    // It sums ALL txs? "const { data } = await supabase...select()...eq('user_id', user.id)"
                    // It does NOT filter by status='completed' for general wallet in Wallet.tsx line 182 approx.
                    // So Pending Withdrawal reduces balance.
                    // So rejecting (setting status='failed') will naturally "refund" it because 'failed' txs should probably be excluded from balance calc?
                    // Let's assume 'failed' status transactions are NOT included in Wallet Balance Calc. 
                    // Wallet.tsx needs to be checked if it filters 'failed'. 
                    // Checking Wallet.tsx line 177: "const generalTx = data.filter(tx => !tx.plan_id);"
                    // Then sum. 
                    // **CRITICAL**: We need to make sure 'failed' transactions are NOT included in Wallet Balance Calc.
                    // Use 'failed' status for rejected withdrawals.
                }
            }

            // Execute Status Update
            const newStatus = action === 'confirm' ? 'completed' : 'failed';
            const { error } = await supabase
                .from('transactions')
                .update({ status: newStatus })
                .eq('id', tx.id);

            if (error) throw error;

            // Deposit Confirm Logic: Update Plan Balance
            if (tx.type === 'deposit' && action === 'confirm' && tx.plan_id) {
                // Fetch current
                const { data: up } = await supabase.from('user_plans').select('current_balance, status').eq('user_id', tx.user_id).eq('plan_id', tx.plan_id).single();
                if (up) {
                    const newBal = up.current_balance + Number(tx.amount) - Number(tx.charge || 0);
                    await supabase.from('user_plans').update({
                        current_balance: newBal,
                        status: up.status === 'pending_activation' ? 'active' : up.status
                    }).eq('user_id', tx.user_id).eq('plan_id', tx.plan_id);
                }
            }

            toast.success(`Transaction ${action}ed`);
            fetchTransactions();
        } catch (err: any) {
            toast.error(`Failed to ${action}: ${err.message}`);
        }
    }

    async function handleDepositRejection() {
        if (!selectedDeposit) return;

        try {
            if (rejectAction === 'refund_wallet') {
                const finalAmount = parseFloat(refundAmount);
                if (isNaN(finalAmount) || finalAmount < 0) {
                    toast.error("Invalid refund amount");
                    return;
                }

                // Update transaction: status='completed', plan_id=null (General Wallet)
                // Use new Amount and append Reason to description
                const { error } = await supabase
                    .from('transactions')
                    .update({
                        status: 'completed',
                        plan_id: null,
                        amount: finalAmount,
                        description: `Deposit Redirected (Reason: ${rejectReason || 'Admin Action'})`
                    })
                    .eq('id', selectedDeposit.id);

                if (error) throw error;
                toast.success(`Deposit redirected ($${finalAmount}) to General Wallet`);
            } else {
                // Standard Reject
                const { error } = await supabase
                    .from('transactions')
                    .update({
                        status: 'failed',
                        description: rejectReason ? `${selectedDeposit.description} - Rejected: ${rejectReason}` : selectedDeposit.description
                    })
                    .eq('id', selectedDeposit.id);

                if (error) throw error;
                toast.success("Deposit rejected");
            }

            setRejectDialogOpen(false);
            fetchTransactions();
        } catch (error: any) {
            toast.error("Error processing rejection: " + error.message);
        }
    }

    // --- LOAN LOGIC ---
    async function handleLoanAction(loan: any, action: 'approve' | 'reject') {
        try {
            if (action === 'approve') {
                // 1. Create Disbursement Transaction
                const { error: txError } = await supabase.from('transactions').insert({
                    user_id: loan.user_id,
                    amount: loan.amount, // Full amount disbursed to wallet
                    type: 'loan_disbursement',
                    status: 'completed',
                    description: `Loan Disbursement: ${loan.loan_number}`,
                    loan_id: loan.id
                });

                if (txError) throw txError;

                // 2. Update Loan Status
                const { error: loanError } = await supabase
                    .from('loans')
                    .update({ status: 'active', start_date: new Date().toISOString() })
                    .eq('id', loan.id);

                if (loanError) throw loanError;

                toast.success("Loan approved and funds disbursed.");
            } else {
                // Reject
                const { error } = await supabase
                    .from('loans')
                    .update({ status: 'rejected' })
                    .eq('id', loan.id);

                if (error) throw error;
                toast.success("Loan rejected.");
            }

            fetchLoans();
            // Refresh txs as well if approved
            if (action === 'approve') fetchTransactions();

        } catch (error: any) {
            toast.error("Failed to process loan: " + error.message);
        }
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed': case 'active': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
            case 'pending': return 'bg-amber-100 text-amber-800 border-amber-200';
            case 'failed': case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const renderRevenueTable = (txs: any[]) => {
        const filtered = txs.filter(t => t.type === 'service_charge' && t.status === 'completed');

        if (filtered.length === 0) return <div className="p-8 text-center text-gray-500">No revenue records found.</div>;

        return (
            <div className="rounded-md border border-slate-200 overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                        <tr>
                            <th className="px-4 py-3">Date</th>
                            <th className="px-4 py-3">Source Plan</th>
                            <th className="px-4 py-3">User</th>
                            <th className="px-4 py-3">Fee Type</th>
                            <th className="px-4 py-3">Amount</th>
                            <th className="px-4 py-3 text-right">Reference</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filtered.map((tx) => (
                            <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                                    {new Date(tx.created_at).toLocaleDateString()}
                                </td>
                                <td className="px-4 py-3 font-medium text-slate-900">
                                    {tx.plan?.name || 'General Platform'}
                                </td>
                                <td className="px-4 py-3">
                                    <div className="text-xs text-slate-900 font-medium">{tx.profile?.full_name}</div>
                                    <div className="text-[10px] text-slate-500">{tx.profile?.email}</div>
                                </td>
                                <td className="px-4 py-3">
                                    <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700">
                                        {tx.description?.includes('Penalty') ? 'Penalty' : 'Service Fee'}
                                    </Badge>
                                </td>
                                <td className="px-4 py-3 font-bold text-emerald-600">
                                    +${Number(tx.amount).toLocaleString()}
                                </td>
                                <td className="px-4 py-3 text-right text-[10px] font-mono text-slate-400">
                                    {tx.id.split('-')[0]}...
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    const renderTransactionTable = (txs: any[], typeFilter?: string) => {
        const filtered = txs.filter(t => {
            if (typeFilter === 'deposit') return t.type === 'deposit';
            if (typeFilter === 'withdrawal') return t.type === 'withdrawal';
            return true;
        });

        if (filtered.length === 0) return <div className="p-8 text-center text-gray-500">No records found.</div>;

        return (
            <div className="rounded-md border border-slate-200 overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                        <tr>
                            <th className="px-4 py-3">Date</th>
                            <th className="px-4 py-3">User</th>
                            <th className="px-4 py-3">Type</th>
                            <th className="px-4 py-3">Amount</th>
                            <th className="px-4 py-3">Context</th>
                            <th className="px-4 py-3 text-center">Receipt</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filtered.map((tx) => (
                            <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                                    {new Date(tx.created_at).toLocaleDateString()}
                                    <div className="text-xs">{new Date(tx.created_at).toLocaleTimeString()}</div>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="font-medium text-slate-900">{tx.profile?.full_name || 'Unknown'}</div>
                                    <div className="text-xs text-slate-500">{tx.profile?.email}</div>
                                </td>
                                <td className="px-4 py-3 capitalize">{tx.type}</td>
                                <td className={`px-4 py-3 font-medium ${tx.type === 'withdrawal' ? 'text-red-600' : 'text-emerald-600'}`}>
                                    {tx.type === 'withdrawal' ? '-' : '+'}${Number(tx.amount).toLocaleString()}
                                </td>
                                <td className="px-4 py-3 text-slate-500 text-xs truncate max-w-[150px]">
                                    {tx.plan?.name || tx.description || 'General Wallet'}
                                </td>
                                <td className="px-4 py-3 text-center">
                                    {tx.receipt_url ? (
                                        <Dialog>
                                            <DialogTrigger asChild>
                                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-blue-600">
                                                    <FileText className="h-4 w-4" />
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent className="max-w-2xl bg-white">
                                                <div className="flex justify-center bg-gray-100 p-4 rounded min-h-[300px] items-center">
                                                    <img src={tx.receipt_url} alt="Receipt" className="max-h-[500px] w-auto object-contain" />
                                                </div>
                                                <div className="text-center mt-2">
                                                    <a href={tx.receipt_url} target="_blank" className="text-blue-600 underline text-sm flex items-center justify-center gap-1">
                                                        Open Original <ExternalLink className="w-3 h-3" />
                                                    </a>
                                                </div>
                                            </DialogContent>
                                        </Dialog>
                                    ) : <span className="text-slate-300">-</span>}
                                </td>
                                <td className="px-4 py-3">
                                    <Badge variant="outline" className={getStatusColor(tx.status)}>
                                        {tx.status}
                                    </Badge>
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <div className="flex items-center justify-end gap-1">
                                        {/* View Details */}
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-blue-600" onClick={() => openDetails(tx)} title="View Details">
                                            <Eye className="h-4 w-4" />
                                        </Button>

                                        {/* Contact User */}
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-blue-600" onClick={() => contactUser(tx.profile?.email)} title="Contact User">
                                            <Mail className="h-4 w-4" />
                                        </Button>

                                        {tx.status === 'pending' && (
                                            <>
                                                <Button
                                                    size="icon"
                                                    className="bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200 h-8 w-8 shadow-sm"
                                                    onClick={() => handleTransactionAction(tx, 'confirm')}
                                                    title="Approve"
                                                >
                                                    <Check className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    size="icon"
                                                    variant="outline"
                                                    className="h-8 w-8 text-red-600 border-red-200 hover:bg-red-50"
                                                    onClick={() => handleTransactionAction(tx, 'reject')}
                                                    title="Reject"
                                                >
                                                    <X className="w-4 h-4" />
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    const renderLoanTable = () => {
        if (loans.length === 0) return <div className="p-8 text-center text-gray-500">No pending loan requests.</div>;

        return (
            <div className="rounded-md border border-slate-200 overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                        <tr>
                            <th className="px-4 py-3">Requested</th>
                            <th className="px-4 py-3">Loan ID</th>
                            <th className="px-4 py-3">User</th>
                            <th className="px-4 py-3">Amount</th>
                            <th className="px-4 py-3">Duration</th>
                            <th className="px-4 py-3">Interest (Flat)</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loans.map((loan) => (
                            <tr key={loan.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                                    {new Date(loan.created_at).toLocaleDateString()}
                                </td>
                                <td className="px-4 py-3 font-mono text-xs">{loan.loan_number}</td>
                                <td className="px-4 py-3">
                                    <div className="font-medium text-slate-900">{loan.profile?.full_name || 'Unknown'}</div>
                                    <div className="text-xs text-slate-500">{loan.profile?.email}</div>
                                </td>
                                <td className="px-4 py-3 font-medium text-slate-900">${Number(loan.amount).toLocaleString()}</td>
                                <td className="px-4 py-3">{loan.duration_months} Months</td>
                                <td className="px-4 py-3">{loan.interest_rate}%</td>
                                <td className="px-4 py-3">
                                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                                        Pending Review
                                    </Badge>
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <div className="flex items-center justify-end gap-1">
                                        {/* View Details */}
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-blue-600" onClick={() => openDetails(loan)} title="View Details">
                                            <Eye className="h-4 w-4" />
                                        </Button>

                                        {/* Contact User */}
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-blue-600" onClick={() => contactUser(loan.profile?.email)} title="Contact User">
                                            <Mail className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            size="icon"
                                            className="bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200 h-8 w-8 shadow-sm"
                                            onClick={() => handleLoanAction(loan, 'approve')}
                                            title="Approve & Disburse"
                                        >
                                            <Check className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            size="icon"
                                            variant="outline"
                                            className="h-8 w-8 text-red-600 border-red-200 hover:bg-red-50"
                                            onClick={() => handleLoanAction(loan, 'reject')}
                                            title="Reject"
                                        >
                                            <X className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Transaction Hub</h1>
                    <p className="text-slate-500">Manage all financial requests and history.</p>
                </div>
                <Button variant="outline" onClick={fetchData} size="sm">
                    Refresh Data
                </Button>
            </div>

            <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="bg-white border">
                    <TabsTrigger value="all">All Transactions</TabsTrigger>
                    <TabsTrigger value="deposits" className="flex gap-2">
                        Deposits
                        {transactions.filter(t => t.type === 'deposit' && t.status === 'pending').length > 0 && (
                            <Badge variant="destructive" className="h-5 w-5 p-0 flex items-center justify-center rounded-full text-[10px]">
                                {transactions.filter(t => t.type === 'deposit' && t.status === 'pending').length}
                            </Badge>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="loans" className="flex gap-2">
                        Loan Requests
                        {loans.length > 0 && (
                            <Badge variant="destructive" className="h-5 w-5 p-0 flex items-center justify-center rounded-full text-[10px]">
                                {loans.length}
                            </Badge>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="withdrawals" className="flex gap-2">
                        Withdrawals
                        {transactions.filter(t => t.type === 'withdrawal' && t.status === 'pending').length > 0 && (
                            <Badge variant="destructive" className="h-5 w-5 p-0 flex items-center justify-center rounded-full text-[10px]">
                                {transactions.filter(t => t.type === 'withdrawal' && t.status === 'pending').length}
                            </Badge>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="revenue" className="flex gap-2">
                        Revenue Ledger
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="all" className="mt-6">
                    <Card><CardContent className="pt-6">{renderTransactionTable(transactions)}</CardContent></Card>
                </TabsContent>
                <TabsContent value="deposits" className="mt-6">
                    <div className="mb-4 text-sm text-gray-500 bg-blue-50 p-3 rounded-md border border-blue-100 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-blue-600" />
                        Pending deposits require manual verification of the uploaded receipt.
                    </div>
                    <Card><CardContent className="pt-6">{renderTransactionTable(transactions, 'deposit')}</CardContent></Card>
                </TabsContent>
                <TabsContent value="loans" className="mt-6">
                    <div className="mb-4 text-sm text-gray-500 bg-blue-50 p-3 rounded-md border border-blue-100 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-blue-600" />
                        Approving a loan will immediately credit the user's wallet with the loan amount.
                    </div>
                    <Card><CardContent className="pt-6">{renderLoanTable()}</CardContent></Card>
                </TabsContent>
                <TabsContent value="withdrawals" className="mt-6">
                    <div className="mb-4 text-sm text-gray-500 bg-amber-50 p-3 rounded-md border border-amber-100 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-600" />
                        Rejecting a withdrawal will automatically refund the amount to the source plan.
                    </div>
                    <Card><CardContent className="pt-6">{renderTransactionTable(transactions, 'withdrawal')}</CardContent></Card>
                </TabsContent>
                <TabsContent value="revenue" className="mt-6">
                    <div className="mb-4 text-sm text-gray-500 bg-emerald-50 p-3 rounded-md border border-emerald-100 flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-600" />
                        This ledger tracks all platform service charges and penalties collected.
                    </div>
                    <Card>
                        <CardContent className="pt-6">
                            {renderRevenueTable(transactions)}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Deposit Rejection Dialog */}
            <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Reject Deposit</DialogTitle>
                        <DialogDescription>
                            Determine how to handle this rejected deposit.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <div className="space-y-4">
                            <div className="flex items-start space-x-3 p-3 border rounded-md cursor-pointer hover:bg-gray-50 bg-gray-50">
                                <input
                                    type="radio"
                                    id="option-reject"
                                    name="rejectAction"
                                    className="mt-1"
                                    checked={rejectAction === 'reject'}
                                    onChange={() => setRejectAction('reject')}
                                />
                                <div>
                                    <Label htmlFor="option-reject" className="font-semibold cursor-pointer">Standard Reject</Label>
                                    <p className="text-xs text-gray-500 mt-1">Funds were NOT received. Mark transaction as failed.</p>
                                </div>
                            </div>

                            <div className="flex items-start space-x-3 p-3 border rounded-md cursor-pointer hover:bg-gray-50 border-emerald-100 bg-emerald-50">
                                <input
                                    type="radio"
                                    id="option-refund"
                                    name="rejectAction"
                                    className="mt-1"
                                    checked={rejectAction === 'refund_wallet'}
                                    onChange={() => setRejectAction('refund_wallet')}
                                />
                                <div className="w-full">
                                    <Label htmlFor="option-refund" className="font-semibold cursor-pointer text-emerald-900">Redirect to General Wallet</Label>
                                    <p className="text-xs text-emerald-700 mt-1">Funds WERE received, but plan/context was wrong. Credit the user's General Wallet instead.</p>

                                    {rejectAction === 'refund_wallet' && (
                                        <div className="mt-3 space-y-2">
                                            <div>
                                                <Label className="text-xs text-emerald-800">Refund Amount</Label>
                                                <Input
                                                    type="number"
                                                    value={refundAmount}
                                                    onChange={(e) => setRefundAmount(e.target.value)}
                                                    className="bg-white border-emerald-200 h-8 text-sm"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="mt-2">
                                <Label className="block mb-1">Reason / Comment</Label>
                                <Input
                                    placeholder="Optional reason for rejection/redirect..."
                                    value={rejectReason}
                                    onChange={(e) => setRejectReason(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
                        <Button
                            variant={rejectAction === 'reject' ? 'destructive' : 'default'}
                            className={rejectAction === 'refund_wallet' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
                            onClick={handleDepositRejection}
                        >
                            {rejectAction === 'reject' ? 'Confirm Reject' : 'Confirm Redirect'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            {/* Detail Modal */}
            <AdminTransactionDetails
                transaction={viewingTx}
                open={detailsOpen}
                onOpenChange={setDetailsOpen}
                onApprove={(tx) => handleTransactionAction(tx, 'confirm')}
                onReject={(tx) => handleTransactionAction(tx, 'reject')}
            />
        </div>
    );
}
