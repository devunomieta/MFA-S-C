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
import { checkAndProcessMaturity } from "@/lib/planUtils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";


interface Plan {
    id: string;
    name: string;
    description: string;
    service_charge: number;
    duration_weeks: number;
    min_amount: number;
    contribution_type: 'fixed' | 'flexible';
    fixed_amount: number;
}

interface UserPlan {
    id: string;
    plan: Plan;
    current_balance: number;
    status: string;
    start_date: string;
}

export function Wallet() {
    const { user } = useAuth();
    const [balance, setBalance] = useState(0);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [filteredTransactions, setFilteredTransactions] = useState<any[]>([]);
    const [allPlans, setAllPlans] = useState<any[]>([]);
    const [userPlans, setUserPlans] = useState<UserPlan[]>([]);
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
                plan:plans(name, duration_weeks)
            `)
            .eq('user_id', user?.id)
            .in('status', ['active', 'matured']);

        if (!error && data) {
            setUserPlans(data);

            // Run maturity check
            // We can import checkAndProcessMaturity dynamically or at top level if we add import
            // For now, let's assume we added the import
            await checkAndProcessMaturity(supabase, data);
            // If it updated something, we might want to re-fetch or just update local state logic?
            // For simplicity, relying on next refresh or realtime.
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

    // Withdrawable Balance (Sum of Matured Plans)
    const [withdrawableBalance, setWithdrawableBalance] = useState(0);

    useEffect(() => {
        if (userPlans.length > 0) {
            // Need to calculate which plans are matured based on local time logic if DB status isn't updated yet.
            // Ideally, we trust the DB status 'matured'. But we also want to show it if we just calculated it.
            // For now, let's rely on 'matured' status being set (we might need to call checkAndProcessMaturity here too).

            // Actually, let's filter by status 'matured'
            const maturedSum = userPlans
                .filter(p => p.status === 'matured')
                .reduce((acc, curr) => acc + (curr.current_balance || 0), 0);

            setWithdrawableBalance(maturedSum);
        } else {
            setWithdrawableBalance(0);
        }
    }, [userPlans]);

    async function performWithdrawal(target: 'bank' | 'wallet' | 'plan') {
        if (!amount) return;
        const finalAmount = parseFloat(amount);
        if (finalAmount > withdrawableBalance) {
            toast.error("Insufficient withdrawable funds");
            return;
        }

        if (target === 'bank' && !selectedBankId) {
            toast.error("Please select a bank account");
            return;
        }
        if (target === 'plan' && !selectedPlanId) {
            toast.error("Please select a target plan");
            return;
        }

        setUploading(true);
        let remainingToWithdraw = finalAmount;
        const maturedPlans = userPlans.filter(p => p.status === 'matured' && p.current_balance > 0);

        maturedPlans.sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());

        for (const plan of maturedPlans) {
            if (remainingToWithdraw <= 0) break;
            const deduction = Math.min(plan.current_balance, remainingToWithdraw);

            const type = target === 'bank' ? 'withdrawal' : 'transfer';
            const description = target === 'bank'
                ? `Withdrawal from plan ${plan.plan.name}`
                : target === 'wallet'
                    ? `Transfer from ${plan.plan.name} to Wallet`
                    : `Transfer from ${plan.plan.name} to Plan`;

            const { error } = await supabase.from("transactions").insert({
                user_id: user?.id,
                amount: deduction,
                type: type,
                status: 'completed',
                description: description,
                plan_id: plan.plan.id,
                charge: 0,
                receipt_url: null
            });

            if (!error) {
                const newBalance = plan.current_balance - deduction;
                const updates: any = { current_balance: newBalance };
                if (newBalance === 0) updates.status = 'completed';
                await supabase.from('user_plans').update(updates).eq('id', plan.id);
                remainingToWithdraw -= deduction;
            }
        }

        if (remainingToWithdraw < finalAmount) {
            const actualWithdrawn = finalAmount - remainingToWithdraw;

            if (target === 'wallet') {
                // Credit General Wallet
                await supabase.from("transactions").insert({
                    user_id: user?.id,
                    amount: actualWithdrawn,
                    type: 'transfer',
                    status: 'completed',
                    description: `Funded from matured plans`,
                    plan_id: null,
                    charge: 0
                });
            } else if (target === 'plan') {
                const targetUserPlan = userPlans.find(p => p.plan.id === selectedPlanId);
                if (targetUserPlan) {
                    await supabase.from("transactions").insert({
                        user_id: user?.id,
                        amount: actualWithdrawn,
                        type: 'transfer',
                        status: 'completed',
                        description: `Funded from matured plans`,
                        plan_id: targetUserPlan.plan.id,
                        charge: 0
                    });

                    const newTargetBal = targetUserPlan.current_balance + actualWithdrawn;
                    const updates: any = { current_balance: newTargetBal };
                    if (targetUserPlan.status === 'pending_activation') updates.status = 'active';

                    await supabase.from('user_plans').update(updates).eq('id', targetUserPlan.id);
                }
            }

            toast.success("Transaction processed successfully!");
            setOpen(false);
            setAmount("");
            fetchWalletData();
            fetchUserPlans();
        } else {
            toast.error("Failed to process transaction.");
        }
        setUploading(false);
    }

    const renderWithdrawalDialog = () => (
        <DialogContent className="dark:bg-gray-900 dark:border-gray-800 max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
                <DialogTitle className="capitalize dark:text-white">Manage Matured Funds</DialogTitle>
                <DialogDescription className="dark:text-gray-400">
                    Withdraw or transfer funds from your matured plans.
                </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Available to Withdraw</span>
                    <span className="font-bold dark:text-white">${formatCurrency(withdrawableBalance)}</span>
                </div>

                <Tabs defaultValue="bank" className="w-full">
                    <TabsList className="grid w-full grid-cols-3 mb-4">
                        <TabsTrigger value="bank">To Bank</TabsTrigger>
                        <TabsTrigger value="wallet">To Wallet</TabsTrigger>
                        <TabsTrigger value="plan">To Plan</TabsTrigger>
                    </TabsList>

                    <TabsContent value="bank" className="space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="bank_amount" className="dark:text-gray-300">Amount</Label>
                            <Input
                                id="bank_amount"
                                type="number"
                                placeholder="0.00"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                max={withdrawableBalance}
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
                                            <Milestone className="w-3 h-3 mr-1" /> Go to Profile
                                        </Button>
                                    </Link>
                                </div>
                            ) : (
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
                            )}
                        </div>
                        <Button
                            onClick={() => performWithdrawal('bank')}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                            disabled={uploading || !amount || !selectedBankId || parseFloat(amount) > withdrawableBalance || withdrawableBalance <= 0}
                        >
                            {uploading ? 'Processing...' : 'Withdraw to Bank'}
                        </Button>
                    </TabsContent>

                    <TabsContent value="wallet" className="space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="wallet_amount" className="dark:text-gray-300">Amount to Transfer</Label>
                            <Input
                                id="wallet_amount"
                                type="number"
                                placeholder="0.00"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                max={withdrawableBalance}
                                className="dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                            />
                            <p className="text-xs text-gray-500 dark:text-gray-400">Funds will be moved to your General Wallet.</p>
                        </div>
                        <Button
                            onClick={() => performWithdrawal('wallet')}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                            disabled={uploading || !amount || parseFloat(amount) > withdrawableBalance || withdrawableBalance <= 0}
                        >
                            {uploading ? 'Processing...' : 'Transfer to Wallet'}
                        </Button>
                    </TabsContent>

                    <TabsContent value="plan" className="space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="target_plan" className="dark:text-gray-300">Select Target Plan</Label>
                            <select
                                id="target_plan"
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                                value={selectedPlanId}
                                onChange={(e) => setSelectedPlanId(e.target.value)}
                            >
                                <option value="">Select a plan...</option>
                                {userPlans.filter(p => p.status === 'active' || p.status === 'pending_activation').map(p => (
                                    <option key={p.id} value={p.plan.id}>{p.plan.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="plan_amount" className="dark:text-gray-300">Amount</Label>
                            <Input
                                id="plan_amount"
                                type="number"
                                placeholder="0.00"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                max={withdrawableBalance}
                                className="dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                            />
                        </div>
                        <Button
                            onClick={() => performWithdrawal('plan')}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                            disabled={uploading || !amount || !selectedPlanId || parseFloat(amount) > withdrawableBalance || withdrawableBalance <= 0}
                        >
                            {uploading ? 'Processing...' : 'Fund Plan'}
                        </Button>
                    </TabsContent>
                </Tabs>
            </div>
        </DialogContent>
    );

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
                        {/* ... Deck Header ... */}
                        <div className="flex justify-between items-center px-1 mb-4">
                            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                Cards & Accounts
                            </h3>
                            {/* ... */}
                        </div>

                        <PlansDeck
                            // ...
                            plans={userPlans}
                            loading={loading}
                            walletBalance={balance}
                            onActiveChange={(id, type, name) => {
                                setSelectedPlanId(id === 'wallet' ? "" : id);
                            }}
                        />

                        {/* Withdrawable Balance Display */}
                        <div className="mt-4 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-xl">
                            <p className="text-sm text-emerald-700 dark:text-emerald-400 font-medium mb-1">Withdrawable Balance</p>
                            <p className="text-2xl font-bold text-emerald-800 dark:text-emerald-300">${formatCurrency(withdrawableBalance)}</p>
                            <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70 mt-1">Funds from matured plans available for payout.</p>
                        </div>
                    </div>

                    {/* Contextual Actions */}
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

                                    {type === 'deposit' ? (
                                        <DepositModal
                                            onSuccess={() => {
                                                fetchWalletData();
                                                fetchUserPlans(); // Refresh plans too
                                            }}
                                            defaultPlanId={selectedPlanId}
                                            onClose={() => setOpen(false)}
                                        />
                                    ) : renderWithdrawalDialog()}
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
                                                            <TableCell className="dark:text-gray-300 text-sm whitespace-normal break-words" title={tx.description}>{tx.description}</TableCell>
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
