import { useState, useEffect } from "react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/app/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { CreditCard, Copy, Upload, Trash2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/app/context/AuthContext";
import { logActivity } from "@/lib/activity";

interface DepositModalProps {
    onSuccess: () => void;
    defaultPlanId?: string;
    onClose: () => void;
}

export function DepositModal({ onSuccess, defaultPlanId, onClose }: DepositModalProps) {
    const { user } = useAuth();
    const [amount, setAmount] = useState("");
    const [selectedPlanId, setSelectedPlanId] = useState<string>(defaultPlanId || "");
    const [receiptFile, setReceiptFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [myPlans, setMyPlans] = useState<any[]>([]);

    // Wallet Payment State
    const [generalBalance, setGeneralBalance] = useState(0);
    const [loadingBalance, setLoadingBalance] = useState(true);

    useEffect(() => {
        if (user) {
            fetchPlans();
            fetchGeneralBalance();
        }
    }, [user]);

    useEffect(() => {
        if (defaultPlanId) {
            setSelectedPlanId(defaultPlanId);
            fetchPlans(); // Refresh plans to ensure the newly joined plan is found
        }
    }, [defaultPlanId]);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'decimal',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(value);
    };

    async function fetchPlans() {
        let query = supabase
            .from("user_plans")
            .select("*, plan:plans(*)")
            .eq("user_id", user?.id);

        if (defaultPlanId) {
            // Contextual Mode (Join Plan or Specific Plan Deposit)
            // Show ONLY the specifically targeted plan (whether pending or active)
            query = query.eq("plan_id", defaultPlanId);
        } else {
            // General Mode (Wallet Add Funds)
            // Show ONLY Active plans. Pending plans should not appear here.
            query = query.eq("status", "active");
        }

        const { data: userPlansData } = await query;

        if (userPlansData) {
            // Filter duplicates visually (just in case DB has them)
            const uniquePlansMap = new Map();
            userPlansData.forEach((up: any) => {
                // We map by PLAN ID (Generic) but store the USER PLAN object
                // ensuring we have access to metadata
                if (!uniquePlansMap.has(up.plan.id)) {
                    uniquePlansMap.set(up.plan.id, up);
                }
            });
            setMyPlans(Array.from(uniquePlansMap.values()));
        }
    }

    async function fetchGeneralBalance() {
        setLoadingBalance(true);
        const { data: txData } = await supabase
            .from("transactions")
            .select("*")
            .eq("user_id", user?.id)
            .is("plan_id", null); // Only fetch general wallet transactions

        if (txData) {
            const bal = txData.reduce((acc, curr) => {
                const amt = Number(curr.amount);
                const chg = Number(curr.charge || 0);

                // Income types
                // Income types - Only if COMPLETED
                if ((curr.type === 'deposit' || curr.type === 'loan_disbursement' || curr.type === 'limit_transfer') && curr.status === 'completed') {
                    return acc + amt - chg;
                }

                // Expense types - Deduct if COMPLETED or PENDING
                if ((curr.type === 'withdrawal' || curr.type === 'loan_repayment') && (curr.status === 'completed' || curr.status === 'pending')) {
                    return acc - amt - chg;
                }

                // Transfer Logic for General Wallet (plan_id is null) - Only if COMPLETED
                if (curr.type === 'transfer' && curr.status === 'completed') {
                    return acc - amt - chg;
                }

                return acc;
            }, 0);
            setGeneralBalance(bal);
        }
        setLoadingBalance(false);
    }

    const handleFileChange = (file: File | null) => {
        if (file) {
            setReceiptFile(file);
            const objectUrl = URL.createObjectURL(file);
            setPreviewUrl(objectUrl);
        }
    };

    const removeFile = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        setReceiptFile(null);
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
            setPreviewUrl(null);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success("Account copied");
    };

    async function handleDeposit(method: 'external' | 'wallet') {
        if (!user || !amount) return;

        const finalAmount = parseFloat(amount);
        if (isNaN(finalAmount) || finalAmount <= 0) {
            toast.error("Invalid amount");
            return;
        }

        if (method === 'external' && !receiptFile) {
            toast.error("Please upload payment receipt");
            return;
        }

        if (method === 'wallet') {
            if (finalAmount > generalBalance) {
                toast.error("Insufficient wallet balance");
                return;
            }
            if (!selectedPlanId) {
                toast.error("Please select a target plan for wallet transfer");
                return;
            }
        }

        setUploading(true);
        let receiptUrl = null;

        if (receiptFile) {
            // Mock upload
            receiptUrl = `https://mock-storage.com/${receiptFile.name}`;
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        if (method === 'external') {
            // Standard Deposit - REQUIRES ADMIN APPROVAL
            // TODO: If this is Marathon, Admin approval must trigger process_marathon_deposit
            const { error } = await supabase.from("transactions").insert({
                user_id: user.id,
                amount: finalAmount,
                type: 'deposit',
                status: 'pending',
                description: selectedPlanId ? `Deposit to ${selectedPlanObj?.name}` : 'Wallet Top Up',
                plan_id: selectedPlanId || null,
                charge: 0,
                receipt_url: receiptUrl
            });

            if (error) {
                toast.error(`Deposit failed: ${error.message}`);
                console.error(error);
            } else {
                logActivity({
                    userId: user.id,
                    action: 'DEPOSIT',
                    details: {
                        amount: finalAmount,
                        plan_name: selectedPlanId ? selectedPlanObj?.name : 'Wallet',
                        display_name: user.user_metadata?.full_name?.split(' ')[0] || 'A user'
                    }
                });
                finishSuccess("Deposit submitted for Admin Approval.");
            }
        } else {
            // Wallet Transfer

            // Special Handling for Marathon/Sprint/Anchor Plans: Use RPC Logic
            const planType = selectedPlanObj?.plan?.type || selectedPlanObj?.type; // Safe access

            if (planType === 'marathon' || planType === 'sprint' || planType === 'anchor' || planType === 'step_up' || planType === 'monthly_bloom' || planType === 'ajo_circle') {
                // 1. Deduct from General Wallet
                const { error: deductError } = await supabase.from("transactions").insert({
                    user_id: user.id,
                    amount: finalAmount,
                    type: 'transfer',
                    status: 'completed',
                    description: `Transfer to ${selectedPlanObj?.plan?.name || 'Savings Plan'}`,
                    plan_id: null,
                    charge: 0
                });

                if (deductError) {
                    toast.error("Transfer failed at source.");
                    setUploading(false);
                    return;
                }

                // 2. Process Deposit via RPC
                let rpcName = '';
                if (planType === 'marathon') rpcName = 'process_marathon_deposit';
                else if (planType === 'sprint') rpcName = 'process_sprint_deposit';
                else if (planType === 'anchor') rpcName = 'process_anchor_deposit';
                else if (planType === 'step_up') rpcName = 'process_step_up_deposit';
                else if (planType === 'step_up') rpcName = 'process_step_up_deposit';
                else if (planType === 'monthly_bloom') rpcName = 'process_monthly_bloom_deposit';
                else if (planType === 'ajo_circle') rpcName = 'process_ajo_circle_deposit';
                else rpcName = 'process_daily_drop_deposit';

                const { data: rpcData, error: rpcError } = await supabase.rpc(rpcName, {
                    p_user_id: user.id,
                    p_plan_id: selectedPlanId,
                    p_amount: finalAmount
                });

                if (rpcError) {
                    console.error(`${planType} RPC Error:`, rpcError);
                    toast.error(`Transfer deducted but plan update failed: ${rpcError.message}. Please contact support.`);
                } else {
                    let msg = "Deposit Successful!";
                    if (planType === 'marathon') msg = `Marathon Contribution Successful! Week ${rpcData.week_paid} paid.`;
                    else if (planType === 'sprint') msg = `Sprint Goal Updated! Week Progress: ${formatCurrency(rpcData.week_total)}`;
                    else if (planType === 'anchor') msg = `Anchor Goal Updated! Week Progress: ${formatCurrency(rpcData.week_total)}`;
                    else if (planType === 'step_up') msg = `Step-Up Deposit Successful! Weekly Target Progress Updated.`;
                    else if (planType === 'monthly_bloom') msg = `Monthly Bloom Deposit Successful! Progress Updated.`;
                    else if (planType === 'ajo_circle') msg = `Ajo Circle Deposit Successful! Week ${rpcData.week} Paid.`;
                    else if (planType === 'daily_drop') msg = `Daily Drop Successful! ${rpcData.days_advanced} Days Advanced.`;

                    logActivity({
                        userId: user.id,
                        action: 'DEPOSIT',
                        details: {
                            amount: finalAmount,
                            plan_name: selectedPlanObj?.plan?.name || selectedPlanObj?.name || 'Savings Plan',
                            display_name: user.user_metadata?.full_name?.split(' ')[0] || 'A user'
                        }
                    });
                    finishSuccess(msg);
                }
                setUploading(false);
                return;
            }

            // Standard Plan Logic (Double Insert + Manual Update)
            const { error: txError } = await supabase.from("transactions").insert([
                {
                    user_id: user.id,
                    amount: finalAmount,
                    type: 'transfer',
                    status: 'completed',
                    description: `Transfer to ${selectedPlanObj?.name}`,
                    plan_id: null, // From General
                    charge: 0
                },
                {
                    user_id: user.id,
                    amount: finalAmount, // Positive amount
                    type: 'transfer',
                    status: 'completed',
                    description: `Transfer from Wallet`,
                    plan_id: selectedPlanId, // To Plan
                    charge: 0
                }
            ]);

            if (txError) {
                toast.error(`Transfer failed: ${txError.message}`);
                console.error(txError);
            } else {
                const updateSuccess = await updatePlanBalance(selectedPlanId);
                if (updateSuccess) {
                    logActivity({
                        userId: user.id,
                        action: 'DEPOSIT',
                        details: {
                            amount: finalAmount,
                            plan_name: selectedPlanObj?.name || 'Savings Plan',
                            display_name: user.user_metadata?.full_name?.split(' ')[0] || 'A user'
                        }
                    });
                    finishSuccess("Transfer successful!");
                }
            }
        }
        setUploading(false);
    }

    async function updatePlanBalance(planId: string) {
        try {
            // Recalculate balance from transaction history for accuracy
            const { data: txs, error: txError } = await supabase
                .from('transactions')
                .select('amount, charge, type')
                .eq('plan_id', planId)
                .eq('status', 'completed');

            if (txError) {
                console.error("Error fetching transactions for balance update:", txError);
                return false;
            }

            let calculatedBalance = 0;
            if (txs) {
                calculatedBalance = txs.reduce((acc, tx) => {
                    const amt = Number(tx.amount || 0);
                    const chg = Number(tx.charge || 0);
                    // Assume additive for plan deposits/transfers
                    return acc + amt - chg;
                }, 0);
            }

            // Prepare update object
            const updates: any = { current_balance: calculatedBalance };

            // Check if we should activate the plan (if it has funds)
            if (calculatedBalance > 0) {
                // We could check current status first, but setting 'active' blindly if balance > 0 is safe for now
                // or we can fetch current status.
                updates.status = 'active';
            }

            const { error: updateError } = await supabase
                .from('user_plans')
                .update(updates)
                .eq('user_id', user?.id)
                .eq('plan_id', planId);

            if (updateError) {
                console.error("Error updating plan balance/status:", updateError);
                return false;
            }
            return true;
        } catch (err) {
            console.error("Unexpected error updating balance:", err);
            return false;
        }
    }

    function finishSuccess(msg: string) {
        toast.success(msg);
        setAmount("");
        setReceiptFile(null);
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
            setPreviewUrl(null);
        }
        if (!defaultPlanId) {
            setSelectedPlanId("");
        }
        onSuccess();
        onClose();
    }

    // Derived state for the currently selected plan
    // myPlans now contains UserPlan objects. 
    // We try to match by Generic Plan ID (p.plan.id) OR UserPlan ID (p.id)
    const selectedPlanObj = myPlans.find(p => p.plan.id === selectedPlanId || p.id === selectedPlanId);

    // Helper to get the mandated fixed amount (if any)
    const getMandatedAmount = (userPlan: any) => {
        if (!userPlan) return 0;

        let amount: any = 0;

        // 1. Ajo Circle (Priority: User Metadata)
        if (userPlan.plan?.type === 'ajo_circle' || userPlan.type === 'ajo_circle') {
            amount = userPlan.plan_metadata?.fixed_amount;
        }
        // 2. Standard Fixed Plan
        else if (userPlan.plan?.contribution_type === 'fixed') {
            amount = userPlan.plan.fixed_amount;
        }

        // Ensure it's a number
        const num = parseFloat(amount);
        return isNaN(num) ? 0 : num;
    };

    const mandatedAmount = getMandatedAmount(selectedPlanObj);
    const isFixedAmount = mandatedAmount > 0;

    useEffect(() => {
        if (selectedPlanObj) {
            const amt = getMandatedAmount(selectedPlanObj);
            if (amt > 0) {
                setAmount(amt.toString());
            }
        }
    }, [selectedPlanObj]);

    // Fee Logic for Ajo Circle
    const getFee = () => {
        if (selectedPlanObj?.plan?.type === 'ajo_circle' || selectedPlanObj?.type === 'ajo_circle') {
            const config = selectedPlanObj?.plan?.config || selectedPlanObj?.config || {};
            const fees = config.fees || {};
            // For Ajo, the amount is the fixed amount (mandatedAmount) or the input amount
            const amt = Number(amount) || mandatedAmount || 0;
            return Number(fees[amt.toString()] || 0);
        }
        return 0;
    };
    const fee = getFee();
    const totalDeduction = (Number(amount) || 0) + fee;

    return (
        <DialogContent className="dark:bg-gray-900 dark:border-gray-800 max-w-md max-h-[90vh] overflow-y-auto">
            {/* Headers ... */}
            <DialogHeader>
                <DialogTitle className="dark:text-white">Add Funds</DialogTitle>
                <DialogDescription className="dark:text-gray-400">
                    Choose a payment method to add funds.
                </DialogDescription>
            </DialogHeader>

            <Tabs defaultValue="external" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-4 dark:bg-gray-800">
                    <TabsTrigger value="external" className="dark:data-[state=active]:bg-gray-700 dark:text-gray-400 dark:data-[state=active]:text-white">External Deposit</TabsTrigger>
                    <TabsTrigger value="wallet" className="dark:data-[state=active]:bg-gray-700 dark:text-gray-400 dark:data-[state=active]:text-white">Pay from Wallet</TabsTrigger>
                </TabsList>

                <TabsContent value="external" className="space-y-4">
                    {/* ... Card UI ... */}
                    <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-indigo-900 via-indigo-800 to-emerald-900 p-6 text-white shadow-xl">
                        {/* ... */}
                        <div className="absolute right-0 top-0 h-32 w-32 -translate-y-8 translate-x-8 rounded-full bg-white/5 blur-2xl"></div>
                        <div className="mb-8 flex justify-between items-start">
                            <div>
                                <p className="text-xs text-indigo-200 uppercase tracking-wider mb-1">Payable ONLY TO</p>
                                <h3 className="tex-lg font-bold">HachStacks Technologies</h3>
                            </div>
                            <CreditCard className="h-8 w-8 text-white/80" />
                        </div>
                        {/* ... */}
                        <div className="space-y-4">
                            <div>
                                <p className="text-xs text-indigo-200">Bank Name</p>
                                <p className="font-semibold tracking-wide">Moniepoint</p>
                            </div>
                            <div>
                                <p className="text-xs text-indigo-200">Account Number</p>
                                <div className="flex items-center gap-2">
                                    <p className="font-mono text-xl tracking-widest">7049898962</p>
                                    <button
                                        onClick={() => copyToClipboard("7049898962")}
                                        className="rounded-full bg-white/10 p-1.5 hover:bg-white/20 transition-colors"
                                    >
                                        <Copy className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="plan" className="dark:text-gray-300">Target Plan</Label>
                        <select
                            id="plan"
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                            value={selectedPlanId}
                            onChange={(e) => setSelectedPlanId(e.target.value)}
                        >
                            <option value="">General Wallet (Top Up)</option>
                            {myPlans.map(up => (
                                <option key={up.plan.id} value={up.plan.id}>{up.plan.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="amount-ex" className="dark:text-gray-300">Amount</Label>
                        <Input
                            id="amount-ex"
                            type="number"
                            placeholder="0.00"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            disabled={isFixedAmount} // Disable if fixed
                            className="dark:bg-gray-800 dark:border-gray-700 dark:text-white disabled:opacity-70 disabled:cursor-not-allowed"
                        />
                        {(isFixedAmount || fee > 0) && (
                            <div className="mt-2 rounded-lg bg-gray-50 dark:bg-gray-800 p-3 border border-gray-100 dark:border-gray-700 space-y-2">
                                {isFixedAmount && (
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-gray-500 dark:text-gray-400">Fixed Contribution</span>
                                        <span className="font-medium text-gray-900 dark:text-white">₦{formatCurrency(mandatedAmount)}</span>
                                    </div>
                                )}
                                {fee > 0 && (
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-gray-500 dark:text-gray-400">Service Charge</span>
                                        <span className="font-medium text-gray-900 dark:text-white">₦{formatCurrency(fee)}</span>
                                    </div>
                                )}
                                <div className="pt-2 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center text-sm font-bold">
                                    <span className="text-gray-700 dark:text-gray-300">Total Deduction</span>
                                    <span className="text-emerald-600 dark:text-emerald-400">₦{formatCurrency(totalDeduction)}</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Receipt Upload ... */}
                    <div className="grid gap-2">
                        <Label className="dark:text-gray-300">Payment Receipt</Label>
                        <div className="flex items-center justify-center w-full">
                            <label htmlFor="dropzone-file-ex" className={`relative flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-lg cursor-pointer transition-colors overflow-hidden ${receiptFile ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/10' : 'border-gray-300 bg-gray-50 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-700 dark:hover:border-gray-500 dark:hover:bg-gray-600'}`}>
                                {previewUrl ? (
                                    <div className="relative w-full h-full flex items-center justify-center group">
                                        <img src={previewUrl} alt="Receipt preview" className="w-full h-full object-contain p-2" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <div className="bg-white/90 rounded-full p-2">
                                                <Upload className="w-6 h-6 text-gray-700" />
                                            </div>
                                        </div>
                                        <div className="absolute bottom-2 left-0 right-0 text-center">
                                            <span className="text-xs text-white bg-black/50 px-2 py-1 rounded">{receiptFile?.name}</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center">
                                        <Upload className="w-8 h-8 mb-3 text-gray-400" />
                                        <p className="mb-2 text-sm text-gray-500 dark:text-gray-400"><span className="font-semibold">Click to upload</span> receipt</p>
                                    </div>
                                )}
                                <Input
                                    id="dropzone-file-ex"
                                    type="file"
                                    className="hidden"
                                    accept="image/*,application/pdf"
                                    onChange={(e) => {
                                        if (e.target.files && e.target.files[0]) {
                                            handleFileChange(e.target.files[0]);
                                        }
                                    }}
                                />
                            </label>
                            {previewUrl && (
                                <div className="flex justify-end">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={removeFile}
                                        className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 px-2 h-8"
                                    >
                                        <Trash2 className="w-3 h-3 mr-1.5" /> Remove File
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>

                    <Button onClick={() => handleDeposit('external')} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" disabled={uploading || !amount || !receiptFile}>
                        {uploading ? 'Processing...' : 'Confirm External Deposit'}
                    </Button>
                </TabsContent>

                <TabsContent value="wallet" className="space-y-4">
                    {/* Wallet UI ... */}
                    <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-full">
                                <Wallet className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Available General Balance</p>
                                <p className="text-xl font-bold dark:text-white">
                                    {loadingBalance ? "Loading..." : `$${formatCurrency(generalBalance)}`}
                                </p>
                            </div>
                        </div>
                    </div>

                    {generalBalance <= 0 && !loadingBalance && (
                        <div className="text-sm text-amber-600 bg-amber-50 p-2 rounded dark:bg-amber-900/20 dark:text-amber-400">
                            You need funds in your General Wallet to perform a transfer. Deposit externally first.
                        </div>
                    )}

                    <div className="grid gap-2">
                        <Label htmlFor="plan-w" className="dark:text-gray-300">Target Plan</Label>
                        <select
                            id="plan-w"
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                            value={selectedPlanId}
                            onChange={(e) => setSelectedPlanId(e.target.value)}
                        >
                            <option value="" disabled>Select a Plan</option>
                            {myPlans.map(up => (
                                <option key={up.plan.id} value={up.plan.id}>{up.plan.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="amount-w" className="dark:text-gray-300">Amount to Transfer</Label>
                        <Input
                            id="amount-w"
                            type="number"
                            placeholder="0.00"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            max={generalBalance}
                            disabled={isFixedAmount} // Disable if fixed
                            className="dark:bg-gray-800 dark:border-gray-700 dark:text-white disabled:opacity-70 disabled:cursor-not-allowed"
                        />
                        {(isFixedAmount || fee > 0) && (
                            <div className="mt-2 rounded-lg bg-gray-50 dark:bg-gray-800 p-3 border border-gray-100 dark:border-gray-700 space-y-2">
                                {isFixedAmount && (
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-gray-500 dark:text-gray-400">Fixed Contribution</span>
                                        <span className="font-medium text-gray-900 dark:text-white">₦{formatCurrency(mandatedAmount)}</span>
                                    </div>
                                )}
                                {fee > 0 && (
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-gray-500 dark:text-gray-400">Service Charge</span>
                                        <span className="font-medium text-gray-900 dark:text-white">₦{formatCurrency(fee)}</span>
                                    </div>
                                )}
                                <div className="pt-2 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center text-sm font-bold">
                                    <span className="text-gray-700 dark:text-gray-300">Total Deduction</span>
                                    <span className="text-emerald-600 dark:text-emerald-400">₦{formatCurrency(totalDeduction)}</span>
                                </div>
                            </div>
                        )}
                    </div>
                    {/* ... */}


                    <Button
                        onClick={() => handleDeposit('wallet')}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                        disabled={uploading || !amount || !selectedPlanId || generalBalance < parseFloat(amount || '0')}
                    >
                        {uploading ? 'Processing...' : 'Confirm Transfer'}
                    </Button>
                </TabsContent>
            </Tabs>
        </DialogContent>
    );
}
