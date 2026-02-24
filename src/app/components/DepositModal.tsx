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
import { validateFile } from "@/lib/validation";
import { calculateBalance } from "@/lib/walletUtils";

interface DepositModalProps {
    onSuccess: () => void;
    defaultPlanId?: string;
    onClose: () => void;
    initialAdvanceMode?: boolean;
}

export function DepositModal({ onSuccess, defaultPlanId, onClose, initialAdvanceMode }: DepositModalProps) {
    const { user } = useAuth();
    const [amount, setAmount] = useState("");
    const [selectedPlanId, setSelectedPlanId] = useState<string>(defaultPlanId || "");
    const [receiptFile, setReceiptFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [myPlans, setMyPlans] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<string>(defaultPlanId ? "wallet" : "external");

    // Wallet Payment State
    const [generalBalance, setGeneralBalance] = useState(0);
    const [loadingBalance, setLoadingBalance] = useState(true);
    const [isAdvanceMode] = useState(initialAdvanceMode || false);

    useEffect(() => {
        if (user) {
            fetchPlans();
            fetchGeneralBalance();
        }
    }, [user]);

    useEffect(() => {
        if (defaultPlanId) {
            setSelectedPlanId(defaultPlanId);
            setActiveTab("wallet"); // Automatically switch to wallet if a plan is targeted
            fetchPlans(); // Refresh plans to ensure the newly joined plan is found
        } else {
            setActiveTab("external");
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
            // Filter out cancelled or Archived ones to prevent duplicates/confusion
            query = query.eq("plan_id", defaultPlanId).in("status", ["active", "pending_activation"]);
        } else {
            // General Mode (Wallet Add Funds)
            // Show ONLY Active plans. Pending plans should not appear here.
            query = query.eq("status", "active");
        }

        const { data: userPlansData } = await query;

        if (userPlansData) {
            setMyPlans(userPlansData);
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
            const bal = calculateBalance(txData as any, null);
            setGeneralBalance(bal);
        }
        setLoadingBalance(false);
    }

    const handleFileChange = (file: File | null) => {
        if (file) {
            // Security: Strict File Validation
            const validation = validateFile(file, {
                maxSizeMB: 5,
                allowedTypes: ["image/jpeg", "image/png", "application/pdf"]
            });

            if (!validation.isValid) {
                toast.error(validation.error);
                return;
            }

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
        const isFlexibleGoalPlan = activeTab === 'wallet' && ['anchor', 'sprint', 'marathon', 'monthly_bloom'].includes(selectedPlanObj?.plan?.type || selectedPlanObj?.type);
        const effectiveMin = (isFlexibleGoalPlan && mandatedAmount === 0) ? 1 : (activeTab === 'wallet' && selectedPlanObj?.plan?.min_amount ? selectedPlanObj.plan.min_amount : 500);

        if (isNaN(finalAmount) || finalAmount < effectiveMin) {
            toast.error(mandatedAmount > 0
                ? `Minimum contribution is ₦${formatCurrency(mandatedAmount)}`
                : `Minimum amount for this ${activeTab === 'external' ? 'deposit' : 'transfer'} is ₦${formatCurrency(effectiveMin)}`
            );
            return;
        }

        // Real-time compliance check for flexible plans (Anchor, Sprint, Marathon, Monthly Bloom)
        if (!isAdvanceMode && finalAmount < mandatedAmount) {
            toast.error(`Initial payment for this period must be at least ₦${formatCurrency(mandatedAmount)}`);
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
            try {
                const fileExt = receiptFile.name.split('.').pop();
                const fileName = `${user.id}-${Math.random()}.${fileExt}`;

                const { error: uploadError } = await supabase.storage
                    .from('receipts')
                    .upload(fileName, receiptFile);

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('receipts')
                    .getPublicUrl(fileName);

                receiptUrl = publicUrl;
            } catch (error: any) {
                console.error("Receipt Upload Error:", error);
                toast.error("Failed to upload receipt. Please try again.");
                setUploading(false);
                return;
            }
        }

        if (method === 'external') {
            // Standard Deposit - REQUIRES ADMIN APPROVAL
            const { error } = await supabase.from("transactions").insert({
                user_id: user.id,
                amount: finalAmount,
                type: 'deposit',
                status: 'pending',
                description: 'Wallet Top Up via External Deposit',
                plan_id: null,
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
    const selectedPlanObj = myPlans.find(p => p.id === selectedPlanId || p.plan.id === selectedPlanId);

    // Basic plan info
    const planType = selectedPlanObj?.plan?.type || selectedPlanObj?.type;

    // Helper to get the mandated fixed amount (if any)
    const getMandatedAmount = (userPlan: any) => {
        if (!userPlan) return 0;
        // Advance mode resets mandated amount to 0 (user chooses any amount)
        // Wait, for Daily Drop, user says: "it's auto-calculated and allocated to days... based on their selected amount or duration."
        // So for advance mode, we don't MANDATE, but we ALLOW anything.

        const planType = userPlan.plan?.type || userPlan.type;
        const meta = userPlan.plan_metadata || {};

        let amount: any = 0;

        // 1. Monthly Bloom - Goal based flexible (CHECK THIS FIRST BECAUSE DB MIGHT BE MARKED AS FIXED)
        if (planType === 'monthly_bloom' || userPlan.plan?.type === 'monthly_bloom') {
            const currentMonthTotal = parseFloat(meta.month_paid_so_far || 0);
            const target = parseFloat(meta.target_amount || 20000);
            if (currentMonthTotal < target) {
                amount = target - currentMonthTotal;
            } else {
                amount = 0;
            }
        }
        // 2. Ajo Circle, Daily Drop, Rapid Fixed (Strictly Fixed ALWAYS)
        else if (planType === 'ajo_circle' || planType === 'daily_drop' || planType === 'step_up' || userPlan.plan?.contribution_type === 'fixed') {
            amount = meta?.fixed_amount || userPlan.plan?.fixed_amount || 0;
        }
        // 3. Marathon, Sprint, Anchor (Flexible Weekly min ₦3k)
        else if (['marathon', 'sprint', 'anchor'].includes(planType)) {
            const currentWeekTotal = meta.current_week_total || 0;
            const target = 3000;
            if (currentWeekTotal < target) {
                amount = target - currentWeekTotal;
            } else {
                amount = 0; // Met, flexible
            }
        }

        // Ensure it's a number
        const num = parseFloat(amount);
        return isNaN(num) ? 0 : num;
    };

    const mandatedAmount = activeTab === 'wallet' ? getMandatedAmount(selectedPlanObj) : 0;

    // Logic for determining if the input should be disabled
    const isInputLocked = () => {
        if (activeTab === 'external') return false; // External target is always General Wallet, which is flexible
        if (!selectedPlanObj) return false;
        if (isAdvanceMode) return false; // Advance mode overrides everything

        const plan = selectedPlanObj.plan || selectedPlanObj; // Get the actual plan object
        const userPlan = selectedPlanObj; // The user_plan object
        const planType = plan.type;
        const meta = userPlan.plan_metadata || {};

        // Strictly Fixed ALWAYS (Except Monthly Bloom which is flexible even if DB says fixed)
        if ((planType === 'ajo_circle' || planType === 'step_up' || plan.contribution_type === 'fixed') && planType !== 'monthly_bloom') return true;

        if (planType === 'daily_drop') {
            // Check if they can change amount: After 1 month or initial duration
            const startDate = new Date(userPlan.start_date || meta.start_date || userPlan.created_at);
            const durationDays = meta.selected_duration || 31;

            const oneMonthAgo = new Date();
            oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

            const durationEndDate = new Date(startDate);
            durationEndDate.setDate(durationEndDate.getDate() + durationDays);

            const now = new Date();
            const hasPassedOneMonth = startDate <= oneMonthAgo;
            const hasPassedDuration = now >= durationEndDate;

            if (hasPassedOneMonth || hasPassedDuration) {
                return false; // Unlockable for changing amount
            }
            return true;
        }

        // For plans that are flexible but have a goal (Anchor, Sprint, Marathon, Monthly Bloom)
        const isFlexibleGoalPlan = ['anchor', 'sprint', 'marathon', 'monthly_bloom'].includes(plan.type || planType);
        if (isFlexibleGoalPlan) {
            // Point 1: If goal is not met, lock input (must pay mandated amount)
            // Point 2: Monthly Bloom is EXEMPT from locking by user request - allow manual input >= target
            if (planType === 'monthly_bloom') return false;

            return !isAdvanceMode && mandatedAmount > 0;
        }

        return false;
    };

    const getPeriodsCovered = () => {
        if (!selectedPlanObj || !amount || parseFloat(amount) <= 0) return 0;
        const planType = selectedPlanObj.plan?.type || selectedPlanObj.type;
        const amt = parseFloat(amount);

        if (['marathon', 'sprint', 'anchor'].includes(planType)) {
            return Math.floor(amt / 3000);
        }
        if (planType === 'monthly_bloom') {
            const target = parseFloat(selectedPlanObj?.plan_metadata?.target_amount || 20000);
            return Math.floor(amt / target);
        }
        if (planType === 'daily_drop') {
            const meta = selectedPlanObj.plan_metadata || {};
            const fixedAmt = meta.fixed_amount || selectedPlanObj.plan?.fixed_amount || 0;
            return fixedAmt > 0 ? Math.floor(amt / fixedAmt) : 0;
        }
        return 0;
    };

    const periodsCovered = getPeriodsCovered();
    const periodLabel = selectedPlanObj?.plan?.type === 'monthly_bloom' ? 'Month' : (selectedPlanObj?.plan?.type === 'daily_drop' ? 'Day' : 'Week');


    useEffect(() => {
        if (selectedPlanObj) {
            const amt = getMandatedAmount(selectedPlanObj);
            if (amt > 0) {
                setAmount(amt.toString());
            } else {
                // If no mandated amount, reset to empty to avoid stale values from previous plans
                setAmount("");
            }
        }
    }, [selectedPlanId, selectedPlanObj]);

    // Fee Logic for Ajo Circle - Specific table from User Review
    const getFee = () => {
        if (selectedPlanObj?.plan?.type === 'ajo_circle' || selectedPlanObj?.type === 'ajo_circle') {
            const amt = Number(amount) || mandatedAmount || 0;

            // Explicit Ajo Fee Table
            if (amt >= 100000) return 1000;
            if (amt >= 50000) return 500;
            if (amt >= 30000) return 500;
            if (amt >= 25000) return 500;
            if (amt >= 20000) return 500;
            if (amt >= 15000) return 300;
            if (amt >= 10000) return 200;

            return 0;
        }
        return 0;
    };
    const fee = getFee();
    const totalDeduction = (Number(amount) || 0) + fee;

    return (
        <DialogContent className="dark:bg-gray-900 dark:border-gray-800 max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
                <DialogTitle className="dark:text-white">Add Funds</DialogTitle>
                <DialogDescription className="dark:text-gray-400">
                    Choose a payment method to add funds.
                </DialogDescription>
            </DialogHeader>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-4 dark:bg-gray-800">
                    <TabsTrigger value="external" className="dark:data-[state=active]:bg-gray-700 dark:text-gray-400 dark:data-[state=active]:text-white">External Deposit</TabsTrigger>
                    <TabsTrigger value="wallet" className="dark:data-[state=active]:bg-gray-700 dark:text-gray-400 dark:data-[state=active]:text-white">Pay from Wallet</TabsTrigger>
                </TabsList>

                <TabsContent value="external" className="space-y-4">
                    <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-indigo-900 via-indigo-800 to-emerald-900 p-6 text-white shadow-xl">
                        <div className="absolute right-0 top-0 h-32 w-32 -translate-y-8 translate-x-8 rounded-full bg-white/5 blur-2xl"></div>
                        <div className="mb-8 flex justify-between items-start">
                            <div>
                                <p className="text-xs text-indigo-200 uppercase tracking-wider mb-1">Payable ONLY TO</p>
                                <h3 className="tex-lg font-bold">HachStacks Technologies</h3>
                            </div>
                            <CreditCard className="h-8 w-8 text-white/80" />
                        </div>
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
                        <Label className="dark:text-gray-300">Target Destination</Label>
                        <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Wallet className="h-4 w-4 text-emerald-600" />
                                <span className="text-sm font-medium dark:text-white">General Wallet</span>
                            </div>
                            <span className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 px-2 py-0.5 rounded font-bold uppercase">Auto-Selected</span>
                        </div>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400">External deposits are processed into your general wallet. You can fund specific plans from the "Pay from Wallet" tab after approval.</p>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="amount-ex" className="dark:text-gray-300">Amount</Label>
                        <Input
                            id="amount-ex"
                            type="number"
                            placeholder="0.00"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            disabled={isInputLocked()}
                            className={`dark:bg-gray-800 dark:border-gray-700 dark:text-white disabled:opacity-70 disabled:cursor-not-allowed ${!isInputLocked() && !isAdvanceMode && amount && parseFloat(amount) < mandatedAmount ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                        />
                        {isAdvanceMode && periodsCovered > 0 && (
                            <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider">
                                ✨ This covers {periodsCovered} {periodLabel}{periodsCovered > 1 ? 's' : ''} in advance
                            </p>
                        )}
                        {!isInputLocked() && !isAdvanceMode && amount && parseFloat(amount) < mandatedAmount && (
                            <p className="text-[10px] text-red-500 font-medium">
                                Minimum contribution is ₦{formatCurrency(mandatedAmount)}
                            </p>
                        )}
                        {(isInputLocked() || mandatedAmount > 0 || fee > 0) && (
                            <div className="mt-2 rounded-lg bg-gray-50 dark:bg-gray-800 p-3 border border-gray-100 dark:border-gray-700 space-y-2">
                                {(isInputLocked() || mandatedAmount > 0) && (
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-gray-500 dark:text-gray-400">{isInputLocked() ? "Fixed Contribution" : (planType === 'monthly_bloom' ? "Monthly Target" : "Minimum Target")}</span>
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
                    <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-full">
                                <Wallet className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Available General Balance</p>
                                <p className="text-xl font-bold dark:text-white">
                                    {loadingBalance ? "Loading..." : `₦${formatCurrency(generalBalance)}`}
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
                                <option key={up.id} value={up.id}>{up.plan.name}</option>
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
                            disabled={isInputLocked()}
                            className={`dark:bg-gray-800 dark:border-gray-700 dark:text-white disabled:opacity-70 disabled:cursor-not-allowed ${!isInputLocked() && !isAdvanceMode && amount && parseFloat(amount) < mandatedAmount ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                        />
                        {isAdvanceMode && periodsCovered > 0 && (
                            <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider">
                                ✨ This covers {periodsCovered} {periodLabel}{periodsCovered > 1 ? 's' : ''} in advance
                            </p>
                        )}
                        {(isInputLocked() || mandatedAmount > 0 || fee > 0) && (
                            <div className="mt-2 rounded-lg bg-gray-50 dark:bg-gray-800 p-3 border border-gray-100 dark:border-gray-700 space-y-2">
                                {(isInputLocked() || mandatedAmount > 0) && (
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-gray-500 dark:text-gray-400">{isInputLocked() ? "Fixed Contribution" : (planType === 'monthly_bloom' ? "Monthly Target" : "Minimum Target")}</span>
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
