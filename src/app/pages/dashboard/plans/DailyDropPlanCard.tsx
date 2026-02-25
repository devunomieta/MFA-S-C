import { useState } from "react";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Plan, UserPlan } from "@/types";
import { Link } from "react-router-dom";
import { Droplets, AlertTriangle, CheckCircle, RefreshCw, Trophy } from "lucide-react";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/app/components/ui/alert-dialog";

interface DailyDropPlanCardProps {
    plan: Plan;
    userPlan?: UserPlan;
    onJoin: () => void; // Used to refresh parent list and potentially open deposit
    onRefresh: () => void; // Silent refresh
    onDeposit: () => void;
    onAdvanceDeposit?: () => void;
    onLeave?: () => void;
}

export function DailyDropPlanCard({ plan, userPlan, onJoin, onRefresh, onDeposit, onAdvanceDeposit, onLeave }: DailyDropPlanCardProps) {
    const isJoined = !!userPlan;
    const metadata = (userPlan?.plan_metadata as any) || {};

    const daysPaid = metadata.total_days_paid || 0;
    const selectedDuration = metadata.selected_duration || 31; // Default fallback
    const fixedAmount = metadata.fixed_amount || 0;

    // Join State
    const [joinAmount, setJoinAmount] = useState<string>(plan.min_amount?.toString() || plan.fixed_amount?.toString() || "500");
    const [joinDuration, setJoinDuration] = useState<string>("31");
    const [joining, setJoining] = useState(false);
    const [showJoinConfirm, setShowJoinConfirm] = useState(false);
    const [showRejoinConfirm, setShowRejoinConfirm] = useState(false);
    const [isChangingAmount, setIsChangingAmount] = useState(false);
    const [newDailyAmount, setNewDailyAmount] = useState<string>(fixedAmount.toString());

    const totalSaved = userPlan?.current_balance || 0;
    const totalTarget = fixedAmount * (selectedDuration === -1 ? 0 : selectedDuration);

    const effectiveDaysPaid = fixedAmount > 0
        ? Math.max(daysPaid, Math.floor(totalSaved / fixedAmount))
        : daysPaid;

    const isFinished = userPlan?.status === 'completed' || (selectedDuration !== -1 && effectiveDaysPaid >= selectedDuration);

    const formatCurrency = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'NGN' }).format(val);

    const getNextDue = () => {
        const startDateStr = userPlan?.start_date || metadata.start_date || userPlan?.created_at;
        if (!startDateStr) return "Today 11:59PM";

        const start = new Date(startDateStr);
        start.setHours(0, 0, 0, 0);

        const coverageEndDate = new Date(start);
        coverageEndDate.setDate(start.getDate() + effectiveDaysPaid);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const diffDays = Math.ceil((coverageEndDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return "Today 11:59PM";
        if (diffDays === 1) return "Tomorrow 11:59PM";
        if (diffDays < 0) return "Overdue";

        return coverageEndDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    const nextDue = getNextDue();

    const coverageEndDate = (() => {
        const startDateStr = userPlan?.start_date || metadata.start_date || userPlan?.created_at;
        if (!startDateStr) return new Date();
        const d = new Date(startDateStr);
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() + effectiveDaysPaid);
        return d;
    })();

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((coverageEndDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    const handleJoin = async () => {
        const amt = parseFloat(joinAmount);
        if (isNaN(amt) || amt < 500) {
            toast.error("Minimum daily amount is ₦500");
            return;
        }

        setShowJoinConfirm(true);
    };

    const confirmJoin = async () => {
        const amt = parseFloat(joinAmount);
        setJoining(true);

        try {
            const { error } = await supabase.from('user_plans').insert({
                user_id: (await supabase.auth.getUser()).data.user?.id,
                plan_id: plan.id,
                status: 'pending_activation',
                plan_metadata: {
                    fixed_amount: amt,
                    selected_duration: parseInt(joinDuration),
                    total_days_paid: 0,
                    last_payment_date: null
                },
                current_balance: 0
            });

            if (error) throw error;
            toast.success("Welcome to Daily Drop!");
            setShowJoinConfirm(false);
            onJoin(); // Refresh
        } catch (error: any) {
            toast.error(error.message || "Failed to join plan");
        } finally {
            setJoining(false);
        }
    };

    const confirmRejoin = async () => {
        if (!userPlan) return;
        setJoining(true);

        try {
            // Update existing plan to cleared state with NEW chosen settings
            const { error } = await supabase
                .from('user_plans')
                .update({
                    status: 'active',
                    current_balance: 0,
                    start_date: new Date().toISOString(),
                    plan_metadata: {
                        ...metadata,
                        fixed_amount: parseFloat(joinAmount),
                        selected_duration: parseInt(joinDuration),
                        total_days_paid: 0,
                        last_payment_date: null,
                        last_fee_date: null,
                        withdrawn: false,
                        withdrawn_amount: 0
                    },
                    updated_at: new Date().toISOString()
                })
                .eq('id', userPlan.id);

            if (error) throw error;
            toast.success("Started a fresh Daily Drop cycle!");
            setShowRejoinConfirm(false);
            onJoin(); // Refresh
        } catch (error: any) {
            toast.error(error.message || "Failed to restart plan");
        } finally {
            setJoining(false);
        }
    };

    const handleChangeAmount = async () => {
        const amt = parseFloat(newDailyAmount);
        if (isNaN(amt) || amt < 500) {
            toast.error("Minimum daily amount is ₦500");
            return;
        }

        try {
            const { error } = await supabase
                .from('user_plans')
                .update({
                    plan_metadata: {
                        ...metadata,
                        fixed_amount: amt
                    }
                })
                .eq('id', userPlan?.id);

            if (error) throw error;
            toast.success("Daily commitment updated!");
            setIsChangingAmount(false);
            onJoin(); // Refresh
        } catch (error: any) {
            toast.error(error.message || "Failed to update amount");
        }
    };

    const [withdrawing, setWithdrawing] = useState(false);

    const handleWithdraw = async () => {
        if (!userPlan) return;
        setWithdrawing(true);

        try {
            const { error } = await supabase.rpc('withdraw_daily_drop_payout', {
                p_user_id: userPlan.user_id,
                p_user_plan_id: userPlan.id
            });

            if (error) throw error;

            toast.success("Savings withdrawn to your wallet!");
            onRefresh(); // Refresh silently
        } catch (error: any) {
            toast.error(error.message || "Failed to withdraw funds");
        } finally {
            setWithdrawing(false);
        }
    };

    // Active State - Minimalist
    if (isJoined) {
        return (
            <Card className="flex flex-col relative overflow-hidden bg-white dark:bg-gray-900 border-l-4 border-l-cyan-500 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <Badge variant="outline" className="text-cyan-700 border-cyan-200 bg-cyan-50">{plan.name}</Badge>
                                <Badge className={
                                    userPlan.status === 'pending_activation'
                                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200'
                                        : `border-0 ${isFinished ? 'bg-emerald-600' : 'bg-cyan-600 text-white'}`
                                }>
                                    {userPlan.status === 'pending_activation' ? 'PENDING ACTIVATION' : (isFinished ? 'Completed' : 'Active')}
                                </Badge>
                            </div>
                            <CardTitle className="text-xl font-bold text-gray-900 dark:text-gray-100">{plan.name}</CardTitle>
                        </div>
                        <div className="text-right">
                            <div className="text-xs text-gray-500 uppercase font-bold tracking-wider">Total Saved</div>
                            <div className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(userPlan?.current_balance || 0)}</div>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="space-y-6 flex-1 pt-4 overflow-y-auto max-h-[60vh] custom-scrollbar">
                    {isFinished ? (
                        <div className="space-y-6">
                            <div className="text-center py-6 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-100 dark:border-emerald-800">
                                <Trophy className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
                                <h3 className="font-bold text-emerald-700 dark:text-emerald-400 text-lg">Goal Achieved! 🎉</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    You have successfully completed your {selectedDuration} day cycle.
                                </p>
                            </div>

                            <div className="bg-cyan-50 dark:bg-cyan-900/20 p-4 rounded-xl border border-cyan-100 dark:border-cyan-800 space-y-3">
                                <div className="flex items-center gap-2 text-cyan-800 dark:text-cyan-400 font-bold text-sm">
                                    <RefreshCw className="w-4 h-4" />
                                    {metadata.withdrawn ? "Withdrawal Complete" : "Withdraw Your Savings"}
                                </div>
                                <p className="text-xs text-cyan-600 dark:text-cyan-500">
                                    {metadata.withdrawn
                                        ? `You have successfully withdrawn ${formatCurrency(metadata.withdrawn_amount || totalSaved)} to your withdrawable wallet.`
                                        : `Your target is met! Withdraw your ${formatCurrency(totalSaved)} to your wallet to enable the next cycle.`
                                    }
                                </p>
                                <Button
                                    onClick={handleWithdraw}
                                    disabled={withdrawing || metadata.withdrawn}
                                    className={`w-full font-bold h-10 shadow-sm ${metadata.withdrawn ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100' : 'bg-cyan-600 hover:bg-cyan-700 text-white'}`}
                                    variant={metadata.withdrawn ? 'outline' : 'default'}
                                >
                                    {withdrawing ? "Withdrawing..." :
                                        metadata.withdrawn ? `Withdrawn ${formatCurrency(metadata.withdrawn_amount || (fixedAmount * selectedDuration))}` :
                                            "Withdraw to Wallet"}
                                </Button>
                            </div>

                            <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-100 dark:border-gray-800 space-y-4 shadow-sm opacity-100">
                                <h4 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    <RefreshCw className="w-4 h-4 text-cyan-600" />
                                    Configure Next Cycle
                                </h4>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] font-bold text-gray-500 uppercase">Daily Amount</Label>
                                        <Input
                                            type="number"
                                            value={joinAmount}
                                            onChange={(e) => setJoinAmount(e.target.value)}
                                            className="h-8 text-sm"
                                            disabled={!metadata.withdrawn}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] font-bold text-gray-500 uppercase">Duration</Label>
                                        <Select value={joinDuration} onValueChange={setJoinDuration} disabled={!metadata.withdrawn}>
                                            <SelectTrigger className="h-8 text-sm">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="31">31 Days</SelectItem>
                                                <SelectItem value="62">62 Days</SelectItem>
                                                <SelectItem value="93">93 Days</SelectItem>
                                                <SelectItem value="-1">Continuous</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <Button
                                    onClick={() => setShowRejoinConfirm(true)}
                                    disabled={!metadata.withdrawn || joining}
                                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-10"
                                >
                                    {joining ? "Starting..." : "Start Fresh Cycle"}
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex flex-col gap-2">
                                {nextDue === 'Overdue' ? (
                                    <div className="bg-red-50 p-2 rounded border border-red-100 flex items-center gap-2 text-xs text-red-700 font-medium animate-pulse">
                                        <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                                        Deposit Due: {formatCurrency(fixedAmount)}
                                    </div>
                                ) : (diffDays >= 1) ? (
                                    <div className="flex items-center gap-2 p-2 bg-emerald-50 text-emerald-700 rounded-md text-xs border border-emerald-100 font-bold">
                                        <CheckCircle className="w-3.5 h-3.5" />
                                        <span>Paid for Today!</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 p-2 bg-amber-50 text-amber-700 rounded-md text-xs border border-amber-100 font-bold">
                                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                                        <span>Awaiting Deposit</span>
                                    </div>
                                )}

                                {effectiveDaysPaid > 0 && !isFinished && (
                                    <div className="flex items-center gap-2 p-2 bg-blue-50 text-blue-700 rounded-md text-[10px] border border-blue-100 font-bold leading-tight">
                                        <RefreshCw className="w-3 h-3 text-blue-500" />
                                        <span>Advance Payment: {effectiveDaysPaid} Day{effectiveDaysPaid === 1 ? '' : 's'} Covered</span>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600 dark:text-gray-400 font-medium">Streak Progress</span>
                                    <span className="font-bold text-gray-900 dark:text-gray-200">{effectiveDaysPaid} / {selectedDuration === -1 ? '∞' : selectedDuration} Days</span>
                                </div>
                                <div className="h-2 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-cyan-500 rounded-full transition-all duration-500"
                                        style={{ width: `${selectedDuration === -1 ? 100 : Math.min((effectiveDaysPaid / selectedDuration) * 100, 100)}%` }}
                                    />
                                </div>
                                <div className="flex justify-between text-[10px] text-gray-400 font-medium">
                                    <span>{Math.round(selectedDuration === -1 ? 100 : Math.min((effectiveDaysPaid / selectedDuration) * 100, 100))}% of Cycle</span>
                                    {effectiveDaysPaid > 0 && !isFinished && <span>Advanced {effectiveDaysPaid} Days</span>}
                                </div>
                            </div>

                            {/* Overall Progress (Visible if not continuous) */}
                            {selectedDuration !== -1 && (
                                <div className="space-y-2 pt-2 border-t border-gray-50 dark:border-gray-800">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600 dark:text-gray-400 font-medium">Overall Plan Progress</span>
                                        <span className="font-bold text-gray-900 dark:text-gray-200">
                                            {formatCurrency(totalSaved)} / {formatCurrency(totalTarget)}
                                        </span>
                                    </div>
                                    <div className="h-2 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-cyan-600 rounded-full transition-all duration-500"
                                            style={{ width: `${Math.min((totalSaved / totalTarget) * 100, 100)}%` }}
                                        />
                                    </div>
                                    <div className="text-[10px] text-gray-400 font-medium">
                                        {Math.round(Math.min((totalSaved / totalTarget) * 100, 100))}% of Total Target
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-800">
                                    <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1 flex items-center gap-1">
                                        <Droplets className="w-3 h-3" /> Daily Commit
                                    </div>
                                    <div className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center justify-between">
                                        {formatCurrency(fixedAmount)}
                                        {daysPaid >= 31 && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 text-[10px] text-cyan-600 hover:text-cyan-700 p-1"
                                                onClick={() => {
                                                    setNewDailyAmount(fixedAmount.toString());
                                                    setIsChangingAmount(true);
                                                }}
                                            >
                                                Change
                                            </Button>
                                        )}
                                    </div>
                                </div>
                                <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-800">
                                    <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1 flex items-center gap-1">
                                        <AlertTriangle className={`w-3 h-3 ${nextDue.includes('Tomorrow') ? 'text-emerald-500' : 'text-amber-500'}`} /> Next Due
                                    </div>
                                    <div className={`text-sm font-bold mt-1 ${nextDue.includes('Tomorrow') ? 'text-emerald-600' : 'text-gray-900 dark:text-gray-100'}`}>
                                        {nextDue}
                                    </div>
                                </div>
                            </div>

                            {isChangingAmount && (
                                <div className="p-4 bg-cyan-50 dark:bg-cyan-900/20 rounded-lg border border-cyan-100 dark:border-cyan-800 space-y-3 animate-in fade-in slide-in-from-top-2">
                                    <Label className="text-xs font-bold text-cyan-800">New Daily Amount</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            type="number"
                                            value={newDailyAmount}
                                            onChange={(e) => setNewDailyAmount(e.target.value)}
                                            className="h-8 text-sm bg-white dark:bg-gray-800"
                                        />
                                        <Button size="sm" className="h-8 bg-cyan-600" onClick={handleChangeAmount}>Save</Button>
                                        <Button size="sm" variant="ghost" className="h-8" onClick={() => setIsChangingAmount(false)}>Cancel</Button>
                                    </div>
                                    <p className="text-[10px] text-cyan-600">This will be your new fixed daily commitment until changed again.</p>
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>

                <CardFooter className="flex flex-col gap-3 pt-2 pb-6">
                    <div className="grid grid-cols-2 gap-3 w-full">
                        <Button
                            className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-semibold"
                            onClick={onDeposit}
                            disabled={isFinished && !metadata.withdrawn}
                        >
                            Drop Funds
                        </Button>
                        <Button variant="outline" asChild className="w-full">
                            <Link to={`/dashboard/wallet?planId=${userPlan?.plan.id}`}>Details</Link>
                        </Button>
                    </div>
                    {!isFinished && onAdvanceDeposit && (
                        <Button
                            variant="secondary"
                            className="w-full bg-cyan-50 text-cyan-700 hover:bg-cyan-100 border border-cyan-200 font-bold"
                            onClick={onAdvanceDeposit}
                        >
                            Pay in Advance
                        </Button>
                    )}
                    {((userPlan.status === 'pending_activation') || (userPlan.status === 'completed' && metadata.withdrawn) || (isFinished && metadata.withdrawn)) && onLeave && (
                        <Button
                            variant="ghost"
                            className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 text-xs font-bold mt-1"
                            onClick={onLeave}
                        >
                            Leave Plan
                        </Button>
                    )}
                </CardFooter>
            </Card>
        );
    }

    // Available State (Minimalist Redesign)
    return (
        <Card className="flex flex-col relative overflow-hidden bg-white dark:bg-gray-900 border-l-4 border-l-cyan-500 shadow-sm hover:shadow-md transition-shadow group">
            <CardHeader className="pb-4">
                <div className="flex justify-between items-start">
                    <div>
                        <Badge variant="secondary" className="mb-2 bg-cyan-50 text-cyan-700 border-cyan-100 hover:bg-cyan-100">
                            Daily Savings
                        </Badge>
                        <CardTitle className="text-xl font-bold text-gray-900 dark:text-white">
                            {plan.name}
                        </CardTitle>
                    </div>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium leading-relaxed mt-1 line-clamp-2">
                    Save small, fixed amounts every day and watch it grow effortlessly.
                </p>
            </CardHeader>

            <CardContent className="flex-1 space-y-6 pt-2">
                {/* Input Section - Minimalist UI */}
                <div className="space-y-4 pt-2">
                    <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Fixed Daily Amount</Label>
                        <Input
                            type="number"
                            className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 h-9 font-semibold text-sm focus-visible:ring-cyan-500"
                            value={joinAmount}
                            onChange={(e) => setJoinAmount(e.target.value)}
                            min={500}
                            placeholder="Min ₦500"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Duration</Label>
                        <Select value={joinDuration} onValueChange={setJoinDuration}>
                            <SelectTrigger className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 h-9 font-medium text-sm focus:ring-cyan-500">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="31">31 Days (1 Month)</SelectItem>
                                <SelectItem value="62">62 Days (2 Months)</SelectItem>
                                <SelectItem value="93">93 Days (3 Months)</SelectItem>
                                <SelectItem value="-1">No End Date (Continuous)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="space-y-4 pt-2">
                    <div className="p-3 bg-cyan-50 dark:bg-cyan-900/20 rounded-lg border border-cyan-100 dark:border-cyan-800">
                        <h4 className="text-[10px] font-bold text-cyan-800 dark:text-cyan-400 uppercase tracking-wider mb-2">Rules & Features</h4>
                        <ul className="space-y-1.5">
                            <li className="flex items-center gap-2 text-xs text-cyan-700 dark:text-cyan-400">
                                <div className="w-1 h-1 rounded-full bg-cyan-500" />
                                Save small, fixed amounts every day
                            </li>
                            <li className="flex items-center gap-2 text-xs text-cyan-700 dark:text-cyan-400">
                                <div className="w-1 h-1 rounded-full bg-cyan-500" />
                                1st payment & subsequent monthly drops serve as service fees
                            </li>
                            <li className="flex items-center gap-2 text-xs text-cyan-700 dark:text-cyan-400">
                                <div className="w-1 h-1 rounded-full bg-cyan-500" />
                                Consistent daily drops; No penalties
                            </li>
                            <li className="flex items-center gap-2 text-xs text-cyan-700 dark:text-cyan-400">
                                <div className="w-1 h-1 rounded-full bg-cyan-500" />
                                Auto-debit from wallet if daily goal missed
                            </li>
                        </ul>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 font-medium">
                        <CheckCircle className="w-3.5 h-3.5 text-cyan-600" />
                        <span>Consistent daily drops. No penalties.</span>
                    </div>
                </div>
            </CardContent>

            <CardFooter className="pt-2">
                <Button
                    className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-semibold"
                    onClick={handleJoin}
                    disabled={joining}
                >
                    {joining ? 'Setting up...' : 'Start Daily Drop'}
                </Button>
            </CardFooter>

            {/* Confirmation Dialogs */}
            <AlertDialog open={showJoinConfirm} onOpenChange={setShowJoinConfirm}>
                <AlertDialogContent className="rounded-2xl border-cyan-100 dark:border-gray-800">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <Droplets className="w-6 h-6 text-cyan-600" />
                            Confirm Plan Setup
                        </AlertDialogTitle>
                        <AlertDialogDescription className="space-y-4 pt-4">
                            <div className="p-4 bg-cyan-50/50 dark:bg-cyan-900/10 rounded-xl border border-cyan-100 dark:border-cyan-800/50">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-[10px] uppercase font-bold text-cyan-600 tracking-wider">Daily Amount</p>
                                        <p className="text-lg font-black text-gray-900 dark:text-white">{formatCurrency(parseFloat(joinAmount))}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] uppercase font-bold text-cyan-600 tracking-wider">Duration</p>
                                        <p className="text-lg font-black text-gray-900 dark:text-white">
                                            {joinDuration === '-1' ? 'Continuous' : `${joinDuration} Days`}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-900/10 rounded-lg border border-amber-100 dark:border-amber-800/50">
                                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                                <p className="text-xs text-amber-800 dark:text-amber-400 leading-relaxed">
                                    <span className="font-bold uppercase tracking-tighter block mb-1">Monthly Service Fee</span>
                                    Your first payment of <span className="font-bold">{formatCurrency(parseFloat(joinAmount))}</span> and subsequent monthly drops will be charged as service fees.
                                </p>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="gap-2 pt-4">
                        <AlertDialogCancel className="rounded-xl border-gray-200">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmJoin}
                            className="bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl px-8 font-bold"
                        >
                            Complete Setup
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={showRejoinConfirm} onOpenChange={setShowRejoinConfirm}>
                <AlertDialogContent className="rounded-2xl border-emerald-100 dark:border-gray-800">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <RefreshCw className="w-6 h-6 text-emerald-600" />
                            Start New Cycle?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="pt-2">
                            This will archive your current {plan.name} record and let you start a fresh cycle. Your current balance will be preserved in your history.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="gap-2 pt-4">
                        <AlertDialogCancel className="rounded-xl border-gray-200">Wait, Go Back</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmRejoin}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-8 font-bold"
                        >
                            Yes, Start Fresh
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Card>
    );
}
