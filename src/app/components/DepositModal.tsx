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
        const { data: userPlansData } = await supabase
            .from("user_plans")
            .select("*, plan:plans(*)")
            .eq("user_id", user?.id)
            .eq("status", "active");

        if (userPlansData) {
            setMyPlans(userPlansData.map((up: any) => up.plan));
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
                if (curr.type === 'deposit') return acc + amt - chg;
                if (curr.type === 'loan_disbursement') return acc + amt - chg;
                if (curr.type === 'limit_transfer') return acc + amt - chg; // Keeping legacy

                // Expense types
                if (curr.type === 'withdrawal') return acc - amt - chg;
                if (curr.type === 'loan_repayment') return acc - amt - chg;

                // Transfer Logic for General Wallet (plan_id is null)
                // If it is a transfer and we are in General Wallet context, it is OUTGOING to a plan.
                if (curr.type === 'transfer') return acc - amt - chg;

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
            // Standard Deposit
            const { error } = await supabase.from("transactions").insert({
                user_id: user.id,
                amount: finalAmount,
                type: 'deposit',
                status: 'completed', // Admin would review receipts in real app
                description: selectedPlanId ? `Deposit to ${myPlans.find(p => p.id === selectedPlanId)?.name}` : 'Wallet Top Up',
                plan_id: selectedPlanId || null,
                charge: 0,
                receipt_url: receiptUrl
            });

            if (error) {
                toast.error("Deposit failed");
                console.error(error);
            } else {
                // Update Plan Balance if applicable
                if (selectedPlanId) {
                    const updateSuccess = await updatePlanBalance(selectedPlanId);
                    if (updateSuccess) {
                        finishSuccess("Deposit successful!");
                    }
                } else {
                    finishSuccess("Deposit successful!");
                }
            }
        } else {
            // Wallet Transfer
            // 1. Deduct from General (Create negative transaction or transfer type)
            // We use 'transfer' type. In General (plan_id null), it's money leaving.

            const { error: txError } = await supabase.from("transactions").insert([
                {
                    user_id: user.id,
                    amount: finalAmount,
                    type: 'transfer',
                    status: 'completed',
                    description: `Transfer to ${myPlans.find(p => p.id === selectedPlanId)?.name}`,
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
                toast.error("Transfer failed");
                console.error(txError);
            } else {
                const updateSuccess = await updatePlanBalance(selectedPlanId);
                if (updateSuccess) {
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

            const { error: updateError } = await supabase
                .from('user_plans')
                .update({ current_balance: calculatedBalance })
                .eq('user_id', user?.id)
                .eq('plan_id', planId);

            if (updateError) {
                console.error("Error updating plan balance:", updateError);
                // Even if update fails (e.g. RLS), we tried. 
                // With RLS fixed, this should work.
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
        onSuccess();
        onClose();
    }

    return (
        <DialogContent className="dark:bg-gray-900 dark:border-gray-800 max-w-md max-h-[90vh] overflow-y-auto">
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
                        <Label htmlFor="amount-ex" className="dark:text-gray-300">Amount</Label>
                        <Input
                            id="amount-ex"
                            type="number"
                            placeholder="0.00"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                        />
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
                            {myPlans.map(plan => (
                                <option key={plan.id} value={plan.id}>{plan.name}</option>
                            ))}
                        </select>
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
                            {myPlans.map(plan => (
                                <option key={plan.id} value={plan.id}>{plan.name}</option>
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
                            className="dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                        />
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
