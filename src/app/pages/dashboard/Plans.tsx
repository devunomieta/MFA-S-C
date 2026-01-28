import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { toast } from "sonner";
import { useAuth } from "@/app/context/AuthContext";
import { Link } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/app/components/ui/dialog";
import { DepositModal } from "@/app/components/DepositModal";
import { calculateMaturity, checkAndProcessMaturity } from "@/lib/planUtils";

interface Plan {
    id: string;
    name: string;
    description: string;
    service_charge: number;
    duration_weeks: number;
    min_amount: number;
    contribution_type: 'fixed' | 'flexible';
    fixed_amount: number;
    whatsapp_link?: string;
    start_date?: string;
}
// ...


interface UserPlan {
    id: string;
    plan: Plan;
    current_balance: number;
    status: string;
    start_date: string;
}

export function Plans() {
    const { user } = useAuth();
    const [availablePlans, setAvailablePlans] = useState<Plan[]>([]);
    const [myPlans, setMyPlans] = useState<UserPlan[]>([]);
    const [selectedPlanForDeposit, setSelectedPlanForDeposit] = useState<string | null>(null);
    const [breakingPlan, setBreakingPlan] = useState<UserPlan | null>(null);
    const [processingAction, setProcessingAction] = useState(false);

    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Fetch initially
        fetchPlans();
        fetchMyPlans();

        // Subscribe to real-time changes for user_plans
        const channel = supabase
            .channel('user_plans_changes')
            .on(
                'postgres_changes',
                {
                    event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
                    schema: 'public',
                    table: 'user_plans',
                    filter: `user_id=eq.${user?.id}`
                },
                (payload) => {
                    console.log('Real-time update:', payload);
                    fetchMyPlans();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user]);

    async function fetchPlans() {
        // Fetch all plans that exist in the system
        const { data, error } = await supabase.from("plans").select("*").eq('is_active', true);
        if (!error && data) setAvailablePlans(data);
    }

    async function fetchMyPlans() {
        if (!user) return;
        // Fetch ALL user plans (active and pending) to determine UI state
        const { data, error } = await supabase
            .from("user_plans")
            .select(`*, plan:plans(*)`)
            .eq("user_id", user.id);

        if (!error && data) {
            setMyPlans(data as any);
            await checkAndProcessMaturity(supabase, data);
        }
        setLoading(false);
    }

    async function joinPlan(plan: Plan) {
        if (!user) return;

        // Create pending plan first
        const { error } = await supabase.from("user_plans").insert({
            user_id: user.id,
            plan_id: plan.id,
            current_balance: 0,
            status: 'pending_activation'
        });

        if (error) {
            toast.error("Failed to initiate joining plan");
        } else {
            toast.success(`Plan initiated! Please make a deposit to activate.`);
            // Immediately prompt for deposit
            setSelectedPlanForDeposit(plan.id);
            // Refresh logic handled by real-time subscription or modal success
        }
    }

    async function handleBreakSavings() {
        if (!user || !breakingPlan) return;
        setProcessingAction(true);

        const fee = breakingPlan.current_balance * 0.05;
        const refundAmount = breakingPlan.current_balance - fee;

        // 1. Fee Transaction
        const { error: feeError } = await supabase.from("transactions").insert({
            user_id: user.id,
            amount: fee,
            type: 'service_charge', // or 'fee' if available, using service_charge for now
            status: 'completed',
            description: `Break Savings Fee (5%) for ${breakingPlan.plan.name}`,
            plan_id: breakingPlan.plan.id,
            charge: 0
        });

        if (feeError) {
            toast.error("Failed to process fee transaction");
            setProcessingAction(false);
            return;
        }

        // 2. Refund Transaction (Transfer to General Wallet)
        const { error: refundError } = await supabase.from("transactions").insert({
            user_id: user.id,
            amount: refundAmount,
            type: 'transfer',
            status: 'completed',
            description: `Break Savings Refund from ${breakingPlan.plan.name}`,
            plan_id: null, // To General Wallet
            charge: 0
        });

        if (refundError) {
            toast.error("Failed to process refund transaction");
            setProcessingAction(false);
            return;
        }

        // 3. Update User Plan Status
        const { error: planError } = await supabase
            .from("user_plans")
            .update({ status: 'cancelled', current_balance: 0 })
            .eq('id', breakingPlan.id);

        if (planError) {
            toast.error("Failed to update plan status");
        } else {
            toast.success("Savings broken successfully. Funds transferred to General Wallet.");
            setBreakingPlan(null);
        }
        setProcessingAction(false);
    }

    async function leavePlan(userPlan: UserPlan) {
        if (!user) return;
        if (!confirm("Are you sure you want to leave this plan? Matured funds will be transferred to your General Wallet.")) return;
        setProcessingAction(true);

        // Transfer all to General Wallet
        const { error: txError } = await supabase.from("transactions").insert({
            user_id: user.id,
            amount: userPlan.current_balance,
            type: 'transfer',
            status: 'completed',
            description: `Left Plan ${userPlan.plan.name} - Matured Funds`,
            plan_id: null,
            charge: 0
        });

        if (txError) {
            toast.error("Failed to transfer funds");
            setProcessingAction(false);
            return;
        }

        const { error: updateError } = await supabase
            .from("user_plans")
            .update({ status: 'completed', current_balance: 0 })
            .eq('id', userPlan.id);

        if (updateError) {
            toast.error("Failed to update plan status");
        } else {
            toast.success("Successfully left plan.");
        }
        setProcessingAction(false);
    }

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'decimal',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(value);
    };

    // Filter Logic
    const activePlans = myPlans.filter(p => p.status === 'active' || p.status === 'matured');
    // Pending activePlans are those in myPlans but status is NOT active OR matured
    const pendingPlanIds = myPlans.filter(p => p.status !== 'active' && p.status !== 'matured').map(p => p.plan.id);

    // Available to join: Plans I don't have at all (or maybe I can have multiples? Assuming 1 for now)
    // Actually, user might want multiple, but let's stick to "Join" if not currently tracking.
    // If I have a pending plan, it should probably show in "Available" but with "Resume Activation" button.
    // Or if I have an active plan, maybe I can't join again? "isJoined" logic.

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Savings Plans</h1>
                <p className="text-gray-500 dark:text-gray-400">Choose a plan that suits your financial goals.</p>
            </div>

            <Tabs defaultValue="available">
                <TabsList className="dark:bg-gray-800">
                    <TabsTrigger value="available" className="dark:data-[state=active]:bg-gray-700 dark:text-gray-300 dark:data-[state=active]:text-white">Available Plans</TabsTrigger>
                    <TabsTrigger value="my-plans" className="dark:data-[state=active]:bg-gray-700 dark:text-gray-300 dark:data-[state=active]:text-white">My Active Plans</TabsTrigger>
                </TabsList>

                <TabsContent value="available" className="space-y-4 pt-4">
                    {availablePlans.length === 0 && !loading && (
                        <div className="text-center py-10 text-gray-500 dark:text-gray-400">
                            No plans available at the moment.
                        </div>
                    )}
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {availablePlans.map((plan) => {
                            const isActive = activePlans.some(p => p.plan.id === plan.id);
                            const isPending = pendingPlanIds.includes(plan.id);

                            return (
                                <Card key={plan.id} className="flex flex-col dark:bg-gray-800 dark:border-gray-700 relative overflow-hidden hover:shadow-lg transition-all duration-300 group ring-1 ring-gray-200 dark:ring-gray-700 hover:ring-emerald-500/50 dark:hover:ring-emerald-500/50">
                                    {/* Decorative Gradient Background */}
                                    <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-emerald-500/5 pointer-events-none" />

                                    <CardHeader className="relative z-10 pb-2">
                                        <div className="flex justify-between items-start gap-4">
                                            <div className="space-y-1">
                                                <CardTitle className="text-xl font-bold text-gray-900 dark:text-white leading-tight">{plan.name}</CardTitle>
                                                <CardDescription className="dark:text-gray-400 flex items-center gap-2 text-xs">
                                                    <span className="inline-flex items-center gap-1 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-600 dark:text-gray-300">
                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                                                        {plan.duration_weeks ? `${plan.duration_weeks} Weeks` : 'Flexible'}
                                                    </span>
                                                </CardDescription>
                                            </div>

                                            {/* Badges Stack */}
                                            <div className="flex flex-col items-end gap-1 shrink-0">
                                                {isActive && (
                                                    <span className="bg-emerald-500 text-white text-[10px] uppercase font-bold px-2 py-0.5 rounded-full shadow-sm">
                                                        Active
                                                    </span>
                                                )}
                                                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border shadow-sm whitespace-nowrap ${plan.contribution_type === 'fixed'
                                                    ? 'bg-indigo-50 border-indigo-200 text-indigo-600 dark:bg-indigo-900/20 dark:border-indigo-800 dark:text-indigo-300'
                                                    : 'bg-gray-50 border-gray-200 text-gray-600 dark:bg-gray-800/50 dark:border-gray-700 dark:text-gray-400'
                                                    }`}>
                                                    {plan.contribution_type === 'fixed'
                                                        ? `Fixed: $${plan.fixed_amount}`
                                                        : 'Flexible Amount'}
                                                </span>
                                            </div>
                                        </div>
                                    </CardHeader>

                                    <CardContent className="flex-1 relative z-10 space-y-4">
                                        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed min-h-[3rem]">
                                            {plan.description}
                                        </p>

                                        <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50/50 dark:bg-gray-900/50 rounded-lg border dark:border-gray-800">
                                            <div>
                                                <div className="text-[10px] text-gray-500 uppercase tracking-wider">Service Charge</div>
                                                <div className="text-lg font-bold text-emerald-600 dark:text-emerald-500">
                                                    ${formatCurrency(plan.service_charge)}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-[10px] text-gray-500 uppercase tracking-wider">Min. Deposit</div>
                                                <div className="text-lg font-bold text-gray-700 dark:text-gray-300">
                                                    ${formatCurrency(plan.min_amount)}
                                                </div>
                                            </div>
                                        </div>

                                        {plan.start_date && (
                                            <div className="text-xs text-indigo-500 dark:text-indigo-400 font-medium flex items-center gap-1 justify-center bg-indigo-50 dark:bg-indigo-900/10 p-1.5 rounded">
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                                                Next Cycle: {new Date(plan.start_date).toLocaleDateString()}
                                            </div>
                                        )}
                                    </CardContent>

                                    <CardFooter className="relative z-10 pt-2">
                                        {isActive ? (
                                            <Button className="w-full bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500" disabled variant="outline">
                                                Currently Active
                                            </Button>
                                        ) : isPending ? (
                                            <Button
                                                className="w-full bg-amber-600 hover:bg-amber-700 text-white shadow-sm hover:shadow-md transition-all"
                                                onClick={() => setSelectedPlanForDeposit(plan.id)}
                                            >
                                                Complete Activation
                                            </Button>
                                        ) : (
                                            <Button
                                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5"
                                                onClick={() => joinPlan(plan)}
                                            >
                                                Join Plan
                                            </Button>
                                        )}
                                    </CardFooter>
                                </Card>
                            );
                        })}
                    </div>
                </TabsContent>

                <TabsContent value="my-plans" className="space-y-4 pt-4">
                    {activePlans.length === 0 && !loading && (
                        <div className="text-center py-10 text-gray-500 dark:text-gray-400">
                            You haven't joined any plans yet. Check "Available Plans" to get started!
                        </div>
                    )}
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {activePlans.map((userPlan) => {
                            // Calculate maturity for display
                            const { isDueSoon, daysRemaining } = calculateMaturity(userPlan.start_date, userPlan.plan.duration_weeks || 0);
                            const isMatured = userPlan.status === 'matured';

                            // Calculate dates
                            const startDate = new Date(userPlan.start_date);
                            const endDate = new Date(startDate);
                            endDate.setDate(endDate.getDate() + (userPlan.plan.duration_weeks * 7));

                            return (
                                <Card key={userPlan.id} className="dark:bg-gray-800 dark:border-gray-700 relative overflow-hidden flex flex-col hover:shadow-lg transition-all duration-300 group ring-1 ring-gray-200 dark:ring-gray-700 hover:ring-emerald-500/50 dark:hover:ring-emerald-500/50">
                                    {/* Decorative Gradient Background (Subtle) */}
                                    <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-emerald-500/5 pointer-events-none" />

                                    <CardHeader className="pb-2 relative z-10">
                                        <div className="flex justify-between items-start gap-4 mb-2">
                                            <CardTitle className="dark:text-white text-lg font-bold leading-tight" title={userPlan.plan.name}>
                                                {userPlan.plan.name}
                                            </CardTitle>
                                            {/* Badges Container - Top Right */}
                                            <div className="flex flex-col items-end gap-1 shrink-0">
                                                {isMatured ? (
                                                    <span className="bg-emerald-600 text-white text-[10px] uppercase font-bold px-2 py-0.5 rounded-full shadow-sm">
                                                        Matured
                                                    </span>
                                                ) : (
                                                    <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full">
                                                        Active
                                                    </span>
                                                )}
                                                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${userPlan.plan.contribution_type === 'fixed'
                                                    ? 'bg-indigo-50 border-indigo-200 text-indigo-600 dark:bg-indigo-900/20 dark:border-indigo-800 dark:text-indigo-300'
                                                    : 'bg-gray-50 border-gray-200 text-gray-600 dark:bg-gray-800/50 dark:border-gray-700 dark:text-gray-400'
                                                    }`}>
                                                    {userPlan.plan.contribution_type === 'fixed' ? 'Fixed' : 'Flexible'}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Dates with Icons */}
                                        <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 dark:text-gray-400 mt-1 bg-gray-50/50 dark:bg-gray-900/50 p-2 rounded-md">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] uppercase tracking-wider text-gray-400">Start Date</span>
                                                <span className="font-medium dark:text-gray-300">{startDate.toLocaleDateString()}</span>
                                            </div>
                                            <div className="flex flex-col text-right">
                                                <span className="text-[10px] uppercase tracking-wider text-gray-400">Target End</span>
                                                <span className="font-medium dark:text-gray-300">{endDate.toLocaleDateString()}</span>
                                            </div>
                                        </div>

                                        {isDueSoon && !isMatured && (
                                            <div className="mt-2 text-xs font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1 animate-pulse">
                                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                                Maturing in {daysRemaining} days
                                            </div>
                                        )}
                                    </CardHeader>

                                    <CardContent className="flex-1 space-y-5 relative z-10 pt-2">
                                        {/* Balance Display */}
                                        <div className="text-center">
                                            <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Current Balance</div>
                                            <div className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                                                ${formatCurrency(userPlan.current_balance)}
                                            </div>
                                        </div>

                                        {/* WhatsApp Button */}
                                        {userPlan.plan.whatsapp_link && (
                                            <a
                                                href={userPlan.plan.whatsapp_link}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center justify-center w-full p-2.5 text-sm font-medium text-white bg-[#25D366] hover:bg-[#128C7E] rounded-lg transition-colors gap-2 shadow-sm hover:shadow-md"
                                            >
                                                <svg width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
                                                    <path d="M13.601 2.326A7.854 7.854 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.933 7.933 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.898 7.898 0 0 0 13.6 2.326zM7.994 14.521a6.573 6.573 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.557 6.557 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592zm3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.729.729 0 0 0-.529.247c-.182.198-.691.677-.691 1.654 0 .977.71 1.916.81 2.049.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232z" />
                                                </svg>
                                                Join Community
                                            </a>
                                        )}
                                    </CardContent>

                                    <CardFooter className="flex-col gap-3 pt-2 pb-5 px-5 relative z-10">
                                        {isMatured ? (
                                            <div className="w-full space-y-3">
                                                <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-md hover:shadow-lg transition-all" size="lg" asChild>
                                                    <Link to={`/dashboard/wallet?planId=${userPlan.plan.id}&action=withdraw`}>Manage Matured Funds</Link>
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    className="w-full text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-900/10 dark:border-red-900"
                                                    onClick={() => leavePlan(userPlan)}
                                                    disabled={processingAction}
                                                >
                                                    Dismiss & Leave Plan
                                                </Button>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="grid grid-cols-2 gap-3 w-full">
                                                    <Button
                                                        className="bg-gray-900 text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
                                                        onClick={() => setSelectedPlanForDeposit(userPlan.plan.id)}
                                                    >
                                                        Add Funds
                                                    </Button>
                                                    <Button variant="outline" className="dark:bg-transparent dark:text-white dark:border-gray-600 dark:hover:bg-gray-800" asChild>
                                                        <Link to={`/dashboard/wallet?planId=${userPlan.plan.id}`}>View Details</Link>
                                                    </Button>
                                                </div>

                                                {/* Hidden / Subtle Break Option */}
                                                <div className="w-full pt-2 border-t dark:border-gray-800 mt-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="w-full text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/10 text-xs font-normal opacity-80 hover:opacity-100"
                                                        onClick={() => setBreakingPlan(userPlan)}
                                                    >
                                                        Emergency? Break Me (5% Fee)
                                                    </Button>
                                                </div>
                                            </>
                                        )}
                                    </CardFooter>
                                </Card>
                            );
                        })}
                    </div>
                </TabsContent>
            </Tabs>

            {/* Controlled Dialog for Deposits */}
            <Dialog open={!!selectedPlanForDeposit} onOpenChange={(open) => !open && setSelectedPlanForDeposit(null)}>
                <DepositModal
                    defaultPlanId={selectedPlanForDeposit || ""}
                    onSuccess={() => {
                        // fetchMyPlans is handled by realtime subscription now, 
                        // but calling it explicitly doesn't hurt.
                        fetchMyPlans();
                    }}
                    onClose={() => setSelectedPlanForDeposit(null)}
                />
            </Dialog>

            <Dialog open={!!breakingPlan} onOpenChange={(open) => !open && setBreakingPlan(null)}>
                <DialogContent className="dark:bg-gray-900 dark:border-gray-800">
                    <DialogHeader>
                        <DialogTitle className="dark:text-white">Break Savings</DialogTitle>
                        <DialogDescription className="dark:text-gray-400">
                            Are you sure you want to break your savings? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>

                    {breakingPlan && (
                        <div className="space-y-4 py-4">
                            <div className="p-3 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900 rounded-lg">
                                <p className="text-sm text-red-600 dark:text-red-400 font-medium flex items-center gap-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" /></svg>
                                    Penalty Fee Applied
                                </p>
                                <p className="text-xs text-red-500 mt-1">
                                    Breaking a savings plan early incurs a 5% service charge.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Current Balance</span>
                                    <span className="font-semibold dark:text-white">${formatCurrency(breakingPlan.current_balance)}</span>
                                </div>
                                <div className="flex justify-between text-sm text-red-600">
                                    <span>Penalty Fee (5%)</span>
                                    <span>-${formatCurrency(breakingPlan.current_balance * 0.05)}</span>
                                </div>
                                <div className="border-t dark:border-gray-700 pt-2 flex justify-between font-bold">
                                    <span className="dark:text-white">You Receive</span>
                                    <span className="text-emerald-600 dark:text-emerald-400">${formatCurrency(breakingPlan.current_balance * 0.95)}</span>
                                </div>
                            </div>

                            <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                                Funds will be transferred to your General Wallet immediately.
                            </p>
                        </div>
                    )}

                    <div className="flex gap-3 justify-end">
                        <Button variant="outline" onClick={() => setBreakingPlan(null)} disabled={processingAction} className="dark:bg-gray-800 dark:text-white">
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleBreakSavings} disabled={processingAction}>
                            {processingAction ? "Processing..." : "Confirm Break"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div >
    );
}
