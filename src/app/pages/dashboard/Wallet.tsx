import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/app/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/app/components/ui/table";
import { ArrowDownLeft, ArrowUpRight, Filter, Milestone } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/app/context/AuthContext";
import { Link, useSearchParams } from "react-router-dom";
import { DepositModal } from "@/app/components/DepositModal";
import { PlansDeck } from "@/app/components/wallet/PlansDeck";

export function Wallet() {
    const { user } = useAuth();
    const [balance, setBalance] = useState(0);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [filteredTransactions, setFilteredTransactions] = useState<any[]>([]);
    const [allPlans, setAllPlans] = useState<any[]>([]);
    const [userPlans, setUserPlans] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    // Bank Accounts State
    const [bankAccounts, setBankAccounts] = useState<any[]>([]);
    const [selectedBankId, setSelectedBankId] = useState<string>("");

    const [selectedPlanFilter, setSelectedPlanFilter] = useState<string>("all");

    // Transaction Form State
    const [amount, setAmount] = useState("");
    const [open, setOpen] = useState(false);
    const [type, setType] = useState<'deposit' | 'withdrawal'>('deposit');
    const [selectedPlanId, setSelectedPlanId] = useState<string>("");

    // DepositModal State
    // No extra state needed, just passing props

    // Withdrawal State
    const [uploading, setUploading] = useState(false);

    // URL Params for filtering
    const [searchParams] = useSearchParams();

    useEffect(() => {
        const planId = searchParams.get('planId');
        if (planId) {
            setSelectedPlanFilter(planId);
        }
    }, [searchParams]);

    useEffect(() => {
        if (user) {
            fetchWalletData();
            fetchPlansData();
            fetchBankAccounts();
            fetchUserPlans();
        }
    }, [user]);

    async function fetchUserPlans() {
        const { data, error } = await supabase
            .from('user_plans')
            .select(`
                *,
                plan:plans(name, duration_months)
            `)
            .eq('user_id', user?.id)
            .eq('status', 'active');

        if (!error && data) {
            setUserPlans(data);
        }
        setLoading(false);
    }

    useEffect(() => {
        if (selectedPlanFilter === "all") {
            setFilteredTransactions(transactions);
        } else if (selectedPlanFilter === "general") {
            setFilteredTransactions(transactions.filter(tx => !tx.plan_id));
        } else {
            setFilteredTransactions(transactions.filter(tx => tx.plan_id === selectedPlanFilter));
        }
    }, [selectedPlanFilter, transactions]);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'decimal',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(value);
    };

    async function fetchPlansData() {
        const { data: plansData } = await supabase.from("plans").select("*");
        if (plansData) setAllPlans(plansData);
        // Removed myPlans fetching as it was only used for the deprecated inline modal
    }

    async function fetchBankAccounts() {
        const { data } = await supabase
            .from("bank_accounts")
            .select("*")
            .eq("user_id", user?.id)
            .order("created_at", { ascending: false });

        if (data) setBankAccounts(data);
    }

    async function fetchWalletData() {
        const { data } = await supabase
            .from("transactions")
            .select(`
                *,
                plan:plans(name)
            `)
            .eq("user_id", user?.id)
            .order("created_at", { ascending: false });

        if (data) {
            setTransactions(data);

            // Calculate General Balance (Only transactions with NO plan_id)
            // Wait, per user request "Pay from their wallet (display their current balance)".
            // If we only show General Balance in the big card, that's fine.
            // But if the big card is "Total Balance", it should probably be everything.
            // However, for "Pay from Wallet", we need "Available (Unallocated) Balance".

            // Let's keep "Total Balance" as "Net Worth" (General + Plans) for the Overview/Wallet display?
            // Or should Wallet display "General Wallet" only?
            // Usually "Wallet" implies the source of funds.
            // Let's stick to calculating "Total Net Balance" here, but maybe distinguish later.
            // Actually, for simplicity and safety, let's make the main Balance display = General Wallet Balance.
            // If it includes Plans, users might think they can spend Plan money easily.

            // Refined Logic based on `DepositModal`:
            // General Balance = Sum of transactions where plan_id is NULL.

            const generalTx = data.filter(tx => !tx.plan_id);
            const generalBal = generalTx.reduce((acc, curr) => {
                const amt = Number(curr.amount);
                const chg = Number(curr.charge || 0);

                if (curr.type === 'deposit' || curr.type === 'loan_disbursement') return acc + amt - chg;
                if (curr.type === 'limit_transfer') return acc + amt - chg; // Legacy support

                if (curr.type === 'withdrawal' || curr.type === 'loan_repayment') return acc - amt - chg;

                // Transfer Logic:
                // If type is transfer and it's in generalTx (plan_id is null), it is an OUTGOING transfer to a plan.
                if (curr.type === 'transfer') return acc - amt - chg;

                return acc;
            }, 0);

            setBalance(generalBal);
        }
    }

    // copyToClipboard removed

    // Removed handleTransaction as it is now in DepositModal

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Wallet</h1>
                <p className="text-gray-500 dark:text-gray-400">Manage your funds and view transaction history.</p>
            </div>

            <div className="grid gap-8 md:grid-cols-3 items-start">

                {/* Left Column: Unified Deck & Actions (1/3 width) */}
                <div className="md:col-span-1 flex flex-col gap-6">
                    <div>
                        <div className="flex justify-between items-center px-1 mb-4">
                            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                Cards & Accounts
                            </h3>
                            {userPlans.length > 0 && (
                                <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-500 px-2 py-1 rounded-full">
                                    {userPlans.length} Active
                                </span>
                            )}
                        </div>

                        <PlansDeck
                            plans={userPlans}
                            loading={loading}
                            walletBalance={balance}
                            onActiveChange={(id, type, name) => {
                                // When deck rotates, update context for actions
                                // If id is 'wallet', specificPlanId is empty string
                                setSelectedPlanId(id === 'wallet' ? "" : id);
                            }}
                        />
                    </div>

                    {/* Contextual Actions using the existing Dialog/Modal logic */}
                    <Card className="border-0 shadow-none bg-transparent">
                        <CardContent className="p-0">
                            <div className="grid grid-cols-2 gap-3">
                                <Dialog open={open} onOpenChange={setOpen}>
                                    <DialogTrigger asChild>
                                        <Button onClick={() => { setType('deposit'); }} className="h-12 bg-gray-900 text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200 shadow-xl transition-all rounded-xl border border-gray-900 dark:border-white">
                                            <ArrowDownLeft className="mr-2 h-4 w-4" />
                                            {selectedPlanId ? 'Add Funds' : 'Deposit'}
                                        </Button>
                                    </DialogTrigger>
                                    <DialogTrigger asChild>
                                        <Button onClick={() => { setType('withdrawal'); }} variant="outline" className="h-12 border-gray-200 text-white dark:border-gray-700 hover:bg-gray-100 hover:text-white dark:hover:bg-gray-800 transition-all rounded-xl shadow-sm bg-white dark:bg-gray-900">
                                            <ArrowUpRight className="mr-2 h-4 w-4" /> Withdraw
                                        </Button>
                                    </DialogTrigger>

                                    {/* Use the new Shared Component for Deposits */}
                                    {type === 'deposit' ? (
                                        <DepositModal
                                            onSuccess={() => {
                                                fetchWalletData();
                                                fetchUserPlans(); // Refresh plans too in case of internal transfer
                                            }}
                                            defaultPlanId={selectedPlanId}
                                            onClose={() => setOpen(false)}
                                        />
                                    ) : (
                                        <DialogContent className="dark:bg-gray-900 dark:border-gray-800 max-w-md max-h-[90vh] overflow-y-auto">
                                            <DialogHeader>
                                                <DialogTitle className="capitalize dark:text-white">Withdraw Funds</DialogTitle>
                                                <DialogDescription className="dark:text-gray-400">
                                                    Withdraw funds to your saved bank account.
                                                </DialogDescription>
                                            </DialogHeader>

                                            <div className="grid gap-4 py-4">
                                                <div className="grid gap-2">
                                                    <Label htmlFor="amount" className="dark:text-gray-300">Amount</Label>
                                                    <Input
                                                        id="amount"
                                                        type="number"
                                                        placeholder="0.00"
                                                        value={amount}
                                                        onChange={(e) => setAmount(e.target.value)}
                                                        className="dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                                                    />
                                                </div>
                                                <div className="grid gap-2">
                                                    <Label htmlFor="bank_account" className="dark:text-gray-300">Select Bank Account</Label>
                                                    {bankAccounts.length === 0 ? (
                                                        <div className="text-center p-4 border rounded-md border-dashed bg-gray-50 dark:bg-gray-800 dark:border-gray-700">
                                                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">No saved bank accounts.</p>
                                                            <Link to="/dashboard/profile">
                                                                <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
                                                                    <Milestone className="w-3 h-3 mr-1" /> Go to Profile to Add
                                                                </Button>
                                                            </Link>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <select
                                                                id="bank_account"
                                                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                                                                value={selectedBankId}
                                                                onChange={(e) => setSelectedBankId(e.target.value)}
                                                            >
                                                                <option value="">Select an account</option>
                                                                {bankAccounts.map(account => (
                                                                    <option key={account.id} value={account.id}>
                                                                        {account.bank_name} - {account.account_number}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                            <p className="text-xs text-yellow-600 dark:text-yellow-500 mt-1">
                                                                Note: Only accounts with your registered name are accepted.
                                                            </p>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                            <DialogFooter>
                                                <Button
                                                    onClick={async () => {
                                                        if (!selectedBankId || !amount) return;
                                                        setUploading(true);
                                                        const finalAmount = parseFloat(amount);
                                                        const { error } = await supabase.from("transactions").insert({
                                                            user_id: user?.id,
                                                            amount: finalAmount,
                                                            type: 'withdrawal',
                                                            status: 'completed',
                                                            description: `Wallet Withdrawal to ${bankAccounts.find(b => b.id === selectedBankId)?.bank_name}`,
                                                            plan_id: null,
                                                            charge: 0,
                                                            receipt_url: null
                                                        });
                                                        if (error) {
                                                            toast.error("Withdrawal failed");
                                                        } else {
                                                            toast.success("Withdrawal successful!");
                                                            setOpen(false);
                                                            setAmount("");
                                                            fetchWalletData();
                                                        }
                                                        setUploading(false);
                                                    }}
                                                    className="dark:bg-emerald-600 dark:text-white dark:hover:bg-emerald-700 w-full"
                                                    disabled={uploading || !amount || !selectedBankId}
                                                >
                                                    {uploading ? 'Processing...' : 'Confirm Withdrawal'}
                                                </Button>
                                            </DialogFooter>
                                        </DialogContent>
                                    )}
                                </Dialog>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Transaction History (2/3 width) */}
                <div className="md:col-span-2">
                    <Card className="dark:bg-gray-800 dark:border-gray-700 h-full border-none shadow-sm md:shadow-md">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <div>
                                <CardTitle className="dark:text-white text-lg">Transaction History</CardTitle>
                                <p className="text-sm text-gray-500 mt-1">Recent financial activity</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Filter className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                                <select
                                    className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring dark:text-white dark:border-gray-600"
                                    value={selectedPlanFilter}
                                    onChange={(e) => setSelectedPlanFilter(e.target.value)}
                                >
                                    <option value="all">All Transactions</option>
                                    <option value="general">General Wallet</option>
                                    {allPlans.map(plan => (
                                        <option key={plan.id} value={plan.id}>{plan.name}</option>
                                    ))}
                                </select>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="dark:border-gray-800 hover:bg-transparent">
                                            <TableHead className="dark:text-gray-400 font-medium">Date</TableHead>
                                            <TableHead className="dark:text-gray-400 font-medium">Type</TableHead>
                                            {/* Plan column removed */}
                                            <TableHead className="dark:text-gray-400 font-medium">Description</TableHead>
                                            <TableHead className="dark:text-gray-400 font-medium">Status</TableHead>
                                            <TableHead className="text-right dark:text-gray-400 font-medium">Charge</TableHead>
                                            <TableHead className="text-right dark:text-gray-400 font-medium">Amount</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredTransactions.length === 0 ? (
                                            <TableRow className="dark:border-gray-800">
                                                <TableCell colSpan={6} className="text-center py-12 text-gray-500 dark:text-gray-400">
                                                    <div className="flex flex-col items-center justify-center gap-2">
                                                        <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                                                            <Filter className="h-6 w-6 opacity-30" />
                                                        </div>
                                                        <p>No transactions found for this filter.</p>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            filteredTransactions
                                                // Filter out the 'credit' side of internal transfers only when viewing ALL or GENERAL
                                                .filter(tx => {
                                                    if (selectedPlanFilter !== 'all' && selectedPlanFilter !== 'general') return true;
                                                    // In All/General view: Hide transfer credits (positive amounts) because they are redundant with the debit
                                                    if (tx.type === 'transfer' && tx.amount > 0 && tx.plan_id) return false;
                                                    return true;
                                                })
                                                .map((tx) => {
                                                    // Determine styling based on type
                                                    let amountClass = "text-gray-900 dark:text-gray-200";
                                                    let amountPrefix = "";

                                                    if (tx.type === 'deposit' || tx.type === 'loan_disbursement') {
                                                        amountClass = "text-emerald-600 dark:text-emerald-400";
                                                        amountPrefix = "+";
                                                    } else if (tx.type === 'withdrawal' || tx.type === 'loan_repayment') {
                                                        amountClass = "text-red-600 dark:text-red-500";
                                                        amountPrefix = "-";
                                                    } else if (tx.type === 'transfer') {
                                                        // Transfers are neutral white/gray, no sign
                                                        amountClass = "text-gray-900 dark:text-white";
                                                        amountPrefix = "";
                                                    }

                                                    return (
                                                        <TableRow key={tx.id} className="dark:border-gray-800 dark:hover:bg-gray-900/50 group">
                                                            <TableCell className="dark:text-gray-300 font-mono text-xs">{new Date(tx.created_at).toLocaleDateString()}</TableCell>
                                                            <TableCell className="capitalize dark:text-gray-300 text-xs font-medium">{tx.type.replace('_', ' ')}</TableCell>
                                                            {/* Plan column removed */}
                                                            <TableCell className="dark:text-gray-300 text-sm max-w-[200px] truncate" title={tx.description}>{tx.description}</TableCell>
                                                            <TableCell>
                                                                <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-semibold ${tx.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800' :
                                                                    tx.status === 'pending' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800'
                                                                    }`}>
                                                                    {tx.status}
                                                                </span>
                                                            </TableCell>
                                                            <TableCell className="text-right text-red-500 dark:text-red-400 text-sm font-mono opacity-80 group-hover:opacity-100">
                                                                {tx.charge > 0 ? `-$${formatCurrency(tx.charge)}` : '-'}
                                                            </TableCell>
                                                            <TableCell className={`text-right font-medium font-mono ${amountClass}`}>
                                                                {amountPrefix}${formatCurrency(Math.abs(tx.amount))}
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div >
    );
}
