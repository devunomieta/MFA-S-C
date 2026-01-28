import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { toast } from "sonner";
import { Check, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";

export function AdminLoans() {
    const [loans, setLoans] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState("all");

    useEffect(() => {
        fetchLoans();
    }, []);

    async function fetchLoans() {
        setLoading(true);
        const { data, error } = await supabase
            .from('loans')
            .select('*, profile:profiles(full_name, email)')
            .order('created_at', { ascending: false });

        if (error) {
            toast.error("Failed to fetch loans");
            console.error(error);
        } else {
            setLoans(data || []);
        }
        setLoading(false);
    }

    async function handleAction(loanId: string, action: 'approve' | 'reject') {
        const newStatus = action === 'approve' ? 'active' : 'rejected';

        const { error } = await supabase
            .from('loans')
            .update({ status: newStatus })
            .eq('id', loanId);

        if (error) {
            toast.error(`Failed to ${action} loan`);
        } else {
            toast.success(`Loan ${action}ed successfully`);
            fetchLoans(); // Refresh

            // If approved, strictly speaking we should probably disburse funds via transaction?
            // For now, just status update. Logic elsewhere might handle disbursement or we do it here.
            if (action === 'approve') {
                createDisbursementRecord(loanId);
            }
        }
    }

    async function createDisbursementRecord(loanId: string) {
        // Find the loan to get details
        const loan = loans.find(l => l.id === loanId);
        if (!loan) return;

        // Create a 'loan_disbursement' transaction
        await supabase.from('transactions').insert({
            user_id: loan.user_id,
            amount: loan.amount, // Positive amount for user receiving
            type: 'loan_disbursement',
            status: 'completed',
            description: `Loan Disbursement ${loan.loan_number}`,
            loan_id: loan.id
        });
    }

    const filteredLoans = loans.filter(loan => {
        if (filterStatus === 'all') return true;
        return loan.status === filterStatus;
    });

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return 'bg-emerald-100 text-emerald-800';
            case 'pending': return 'bg-amber-100 text-amber-800';
            case 'completed': return 'bg-blue-100 text-blue-800';
            case 'rejected': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Loan Management</h1>
                    <p className="text-slate-500">Review and manage user loan requests.</p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>All Loans</CardTitle>
                        <Select value={filterStatus} onValueChange={setFilterStatus}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Filter Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="completed">Completed</SelectItem>
                                <SelectItem value="rejected">Rejected</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border border-slate-200 overflow-hidden">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                                <tr>
                                    <th className="px-4 py-3">Loan #</th>
                                    <th className="px-4 py-3">User</th>
                                    <th className="px-4 py-3">Amount</th>
                                    <th className="px-4 py-3">Duration</th>
                                    <th className="px-4 py-3">Date</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading ? (
                                    <tr><td colSpan={7} className="p-8 text-center">Loading...</td></tr>
                                ) : filteredLoans.length === 0 ? (
                                    <tr><td colSpan={7} className="p-8 text-center text-slate-400">No loans found.</td></tr>
                                ) : (
                                    filteredLoans.map((loan) => (
                                        <tr key={loan.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-4 py-3 font-mono text-slate-600">{loan.loan_number}</td>
                                            <td className="px-4 py-3">
                                                <div className="font-medium text-slate-900">{loan.profile?.full_name || 'Unknown'}</div>
                                                <div className="text-xs text-slate-500">{loan.profile?.email}</div>
                                            </td>
                                            <td className="px-4 py-3 font-medium">${Number(loan.amount).toLocaleString()}</td>
                                            <td className="px-4 py-3">{loan.duration_months} Months</td>
                                            <td className="px-4 py-3 text-slate-500">{new Date(loan.created_at).toLocaleDateString()}</td>
                                            <td className="px-4 py-3">
                                                <Badge variant="secondary" className={getStatusColor(loan.status)}>
                                                    {loan.status}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-3 text-right space-x-2">
                                                {loan.status === 'pending' && (
                                                    <>
                                                        <Button
                                                            size="sm"
                                                            className="bg-emerald-600 hover:bg-emerald-700 h-8 font-normal"
                                                            onClick={() => handleAction(loan.id, 'approve')}
                                                        >
                                                            <Check className="w-4 h-4 mr-1" /> Approve
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="h-8 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 font-normal"
                                                            onClick={() => handleAction(loan.id, 'reject')}
                                                        >
                                                            <X className="w-4 h-4 mr-1" /> Reject
                                                        </Button>
                                                    </>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
