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
import { checkAndProcessMaturity } from "@/lib/planUtils";
import { Plan, UserPlan } from "@/types"; // Use new types
import { MarathonPlanCard } from "./plans/MarathonPlanCard";
import { MarathonJoinModal } from "./plans/MarathonJoinModal";
import { SprintPlanCard } from "./plans/SprintPlanCard";
import { SprintJoinModal } from "./plans/SprintJoinModal";
import { AnchorPlanCard } from "./plans/AnchorPlanCard";
import { DailyDropPlanCard } from "./plans/DailyDropPlanCard";
import { StepUpPlanCard } from "./plans/StepUpPlanCard";
import { MonthlyBloomPlanCard } from "./plans/MonthlyBloomPlanCard";
import { AjoCirclePlanCard } from "./plans/AjoCirclePlanCard";


export function Plans() {
    const { user } = useAuth();
    const [availablePlans, setAvailablePlans] = useState<Plan[]>([]);
    const [myPlans, setMyPlans] = useState<UserPlan[]>([]);
    const [selectedPlanForDeposit, setSelectedPlanForDeposit] = useState<string | null>(null);
    const [breakingPlan, setBreakingPlan] = useState<UserPlan | null>(null);
    const [processingAction, setProcessingAction] = useState(false);

    // Marathon State
    const [joiningMarathonPlan, setJoiningMarathonPlan] = useState<Plan | null>(null);
    const [joiningSprintPlan, setJoiningSprintPlan] = useState<Plan | null>(null);

    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPlans();
        fetchMyPlans();

        const channel = supabase
            .channel('user_plans_changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
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
        const { data, error } = await supabase.from("plans").select("*").eq('is_active', true);
        if (!error && data) setAvailablePlans(data as Plan[]);
    }

    async function fetchMyPlans() {
        if (!user) return;
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

    // Standard join (kept for backward compatibility or standard plans)
    async function joinStandardPlan(plan: Plan) {
        if (!user) return;
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
            setSelectedPlanForDeposit(plan.id);
        }
    }

    async function handleJoinStepUp(planId: string, amount: number, duration: number) {
        if (!user) return;

        // Metadata for Step-Up
        const metadata = {
            fixed_amount: amount,
            selected_duration: duration,
            weeks_completed: 0,
            week_paid_so_far: 0
        };

        const { error } = await supabase.from("user_plans").insert({
            user_id: user.id,
            plan_id: planId,
            current_balance: 0,
            status: 'active', // Auto-active for Step-Up? Or wait for deposit?
            // "They can start anytime - weeks start counting from when they start"
            // Let's make it active immediately, but they need to deposit to progress.
            start_date: new Date().toISOString(),
            plan_metadata: metadata
        });

        if (error) {
            toast.error("Failed to join Step-Up plan.");
            console.error(error);
        } else {
            toast.success("Joined Step-Up Plan! Please make your first deposit.");
            fetchMyPlans();
        }
    }

    async function handleJoinMonthlyBloom(planId: string, amount: number, duration: number) {
        if (!user) return;
        const metadata = {
            target_amount: amount,
            selected_duration: duration,
            months_completed: 0,
            month_paid_so_far: 0,
            arrears: 0
        };
        const { error } = await supabase.from("user_plans").insert({
            user_id: user.id,
            plan_id: planId,
            current_balance: 0, // 0 until deposit
            status: 'active',
            start_date: new Date().toISOString(),
            plan_metadata: metadata
        });

        if (error) {
            toast.error("Failed to join Monthly Bloom plan.");
        } else {
            toast.success("Joined Monthly Bloom! Please make your first deposit.");
            fetchMyPlans();
        }
    }
    async function handleJoinAjoCircle(planId: string, amount: number) {
        if (!user) return;

        // Ajo Circle Metadata
        const metadata = {
            fixed_amount: amount,
            picking_turns: [], // Assigned by Admin later
            current_week: 1,
            week_paid: false,
            missed_weeks: 0,
            last_payment_date: null
        };

        const { error } = await supabase.from("user_plans").insert({
            user_id: user.id,
            plan_id: planId,
            current_balance: 0,
            status: 'active', // Active immediately
            start_date: new Date().toISOString(),
            plan_metadata: metadata
        });

        if (error) {
            toast.error("Failed to join Ajo Circle.");
        } else {
            toast.success("Joined The Ajo Circle! Admin will assign your picking turn soon.");
            fetchMyPlans();
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
            type: 'service_charge',
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

        // 2. Refund Transaction
        const { error: refundError } = await supabase.from("transactions").insert({
            user_id: user.id,
            amount: refundAmount,
            type: 'transfer',
            status: 'completed',
            description: `Break Savings Refund from ${breakingPlan.plan.name}`,
            plan_id: null,
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



    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'decimal',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(value);
    };

    const activePlans = myPlans.filter(p => p.status === 'active' || p.status === 'matured' || p.status === 'pending_activation');
    // For Marathon: If type is marathon, show in Available tab ONLY if not already joined.
    // Actually, user might want to see it in "My Plans" if joined.

    // Helper to check if already joined a specific plan
    const hasJoinedPlan = (planId: string) => myPlans.some(p => p.plan_id === planId && p.status !== 'cancelled' && p.status !== 'completed');

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Savings Plans</h1>
                <p className="text-gray-500 dark:text-gray-400">Choose a plan that suits your financial goals.</p>
            </div>

            <Tabs defaultValue="available">
                <TabsList className="dark:bg-gray-800">
                    <TabsTrigger value="available">Available Plans</TabsTrigger>
                    <TabsTrigger value="my-plans">My Active Plans</TabsTrigger>
                </TabsList>

                <TabsContent value="available" className="space-y-4 pt-4">
                    {availablePlans.length === 0 && !loading && (
                        <div className="text-center py-10 text-gray-500">No plans available.</div>
                    )}
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {availablePlans.map((plan) => {
                            // If already joined, maybe skip showing in available or show as "Active"
                            const isJoined = hasJoinedPlan(plan.id);

                            if (plan.type === 'marathon') {
                                return (
                                    <MarathonPlanCard
                                        key={plan.id}
                                        plan={plan}
                                        userPlan={myPlans.find(p => p.plan_id === plan.id && p.status !== 'cancelled')}
                                        onJoin={() => setJoiningMarathonPlan(plan)}
                                        onDeposit={() => setSelectedPlanForDeposit(plan.id)} // Wait, if joined, userPlan needs to be passed
                                    />
                                );
                            }

                            if (plan.type === 'sprint') {
                                return (
                                    <SprintPlanCard
                                        key={plan.id}
                                        plan={plan}
                                        userPlan={myPlans.find(p => p.plan_id === plan.id && p.status !== 'cancelled')}
                                        onJoin={() => setJoiningSprintPlan(plan)}
                                        onDeposit={() => setSelectedPlanForDeposit(plan.id)}
                                    />
                                );
                            }

                            if (plan.type === 'anchor') {
                                return (
                                    <AnchorPlanCard
                                        key={plan.id}
                                        plan={plan}
                                        userPlan={myPlans.find(p => p.plan_id === plan.id && p.status !== 'cancelled')}
                                        onJoin={() => fetchMyPlans()}
                                        onDeposit={() => setSelectedPlanForDeposit(plan.id)}
                                    />
                                );
                            }

                            if (plan.type === 'daily_drop') {
                                return (
                                    <DailyDropPlanCard
                                        key={plan.id}
                                        plan={plan}
                                        userPlan={myPlans.find(p => p.plan_id === plan.id && p.status !== 'cancelled')}
                                        onJoin={() => fetchMyPlans()}
                                        onDeposit={() => setSelectedPlanForDeposit(plan.id)}
                                    />
                                );
                            }

                            if (plan.type === 'step_up') {
                                return (
                                    <StepUpPlanCard
                                        key={plan.id}
                                        plan={plan}
                                        userPlan={myPlans.find(p => p.plan_id === plan.id && p.status !== 'cancelled')}
                                        onJoin={handleJoinStepUp}
                                        onDeposit={() => setSelectedPlanForDeposit(plan.id)}
                                    />
                                );
                            }

                            if (plan.type === 'monthly_bloom') {
                                return (
                                    <MonthlyBloomPlanCard
                                        key={plan.id}
                                        plan={plan}
                                        userPlan={myPlans.find(p => p.plan_id === plan.id && p.status !== 'cancelled')}
                                        onJoin={handleJoinMonthlyBloom}
                                        onDeposit={() => setSelectedPlanForDeposit(plan.id)}
                                    />
                                );
                            }

                            if (plan.type === 'ajo_circle') {
                                return (
                                    <AjoCirclePlanCard
                                        key={plan.id}
                                        plan={plan}
                                        userPlan={myPlans.find(p => p.plan_id === plan.id && p.status !== 'cancelled')}
                                        onJoin={handleJoinAjoCircle}
                                        onDeposit={() => setSelectedPlanForDeposit(plan.id)}
                                    />
                                );
                            }

                            return (
                                <Card key={plan.id} className="flex flex-col relative overflow-hidden hover:shadow-lg transition-all">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-xl font-bold">{plan.name}</CardTitle>
                                        <CardDescription>{plan.duration_weeks ? `${plan.duration_weeks} Weeks` : 'Flexible'}</CardDescription>
                                    </CardHeader>
                                    <CardContent className="flex-1 space-y-4">
                                        <p className="text-sm text-gray-600">{plan.description}</p>
                                        <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 rounded-lg">
                                            <div>
                                                <div className="text-[10px] text-gray-500 uppercase">Min. Deposit</div>
                                                <div className="text-lg font-bold">${formatCurrency(plan.min_amount)}</div>
                                            </div>
                                        </div>
                                    </CardContent>
                                    <CardFooter>
                                        {isJoined ? (
                                            <Button className="w-full" disabled variant="outline">Already Active</Button>
                                        ) : (
                                            <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => joinStandardPlan(plan)}>
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
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {activePlans.map((userPlan) => {
                            if (userPlan.plan.type === 'marathon') {
                                return (
                                    <MarathonPlanCard
                                        key={userPlan.id}
                                        plan={userPlan.plan}
                                        userPlan={userPlan}
                                        onJoin={() => { }} // Already joined
                                        onDeposit={() => setSelectedPlanForDeposit(userPlan.plan.id)}
                                    />
                                );
                            }

                            if (userPlan.plan.type === 'sprint') {
                                return (
                                    <SprintPlanCard
                                        key={userPlan.id}
                                        plan={userPlan.plan}
                                        userPlan={userPlan}
                                        onJoin={() => fetchMyPlans()}
                                        onDeposit={() => setSelectedPlanForDeposit(userPlan.plan.id)}
                                    />
                                );
                            }

                            if (userPlan.plan.type === 'anchor') {
                                return (
                                    <AnchorPlanCard
                                        key={userPlan.id}
                                        plan={userPlan.plan}
                                        userPlan={userPlan}
                                        onJoin={() => fetchMyPlans()}
                                        onDeposit={() => setSelectedPlanForDeposit(userPlan.plan.id)}
                                    />
                                );
                            }

                            if (userPlan.plan.type === 'daily_drop') {
                                return (
                                    <DailyDropPlanCard
                                        key={userPlan.id}
                                        plan={userPlan.plan}
                                        userPlan={userPlan}
                                        onJoin={() => fetchMyPlans()}
                                        onDeposit={() => setSelectedPlanForDeposit(userPlan.plan.id)}
                                    />
                                );
                            }

                            if (userPlan.plan.type === 'step_up') {
                                return (
                                    <StepUpPlanCard
                                        key={userPlan.id}
                                        plan={userPlan.plan}
                                        userPlan={userPlan}
                                        onJoin={() => fetchMyPlans()}
                                        onDeposit={() => setSelectedPlanForDeposit(userPlan.plan.id)}
                                    />
                                );
                            }

                            if (userPlan.plan.type === 'monthly_bloom') {
                                return (
                                    <MonthlyBloomPlanCard
                                        key={userPlan.id}
                                        plan={userPlan.plan}
                                        userPlan={userPlan}
                                        onJoin={() => fetchMyPlans()}
                                        onDeposit={() => setSelectedPlanForDeposit(userPlan.plan.id)}
                                    />
                                );
                            }

                            if (userPlan.plan.type === 'ajo_circle') {
                                return (
                                    <AjoCirclePlanCard
                                        key={userPlan.id}
                                        plan={userPlan.plan}
                                        userPlan={userPlan}
                                        onJoin={() => fetchMyPlans()}
                                        onDeposit={() => setSelectedPlanForDeposit(userPlan.plan.id)}
                                    />
                                );
                            }

                            // Standard Plan Card Logic (Simplified for brevity, or keep original complex logic)
                            const startDate = new Date(userPlan.start_date);
                            const endDate = new Date(startDate);
                            endDate.setDate(endDate.getDate() + (userPlan.plan.duration_weeks * 7));
                            const isMatured = userPlan.status === 'matured';

                            return (
                                <Card key={userPlan.id} className="flex flex-col hover:shadow-lg transition-all">
                                    <CardHeader className="pb-2">
                                        <CardTitle>{userPlan.plan.name}</CardTitle>
                                        <div className="text-xs text-gray-500">
                                            Ends: {endDate.toLocaleDateString()}
                                        </div>
                                    </CardHeader>
                                    <CardContent className="flex-1 space-y-4">
                                        <div className="text-center">
                                            <div className="text-3xl font-extrabold">${formatCurrency(userPlan.current_balance)}</div>
                                        </div>
                                    </CardContent>
                                    <CardFooter className="flex-col gap-2">
                                        {isMatured ? (
                                            <Button className="w-full bg-emerald-600" asChild>
                                                <Link to={`/dashboard/wallet?planId=${userPlan.plan.id}&action=withdraw`}>Withdraw</Link>
                                            </Button>
                                        ) : (
                                            <>
                                                <Button className="w-full bg-gray-900 text-white" onClick={() => setSelectedPlanForDeposit(userPlan.plan.id)}>
                                                    Add Funds
                                                </Button>
                                                <Button variant="ghost" size="sm" className="w-full text-red-500" onClick={() => setBreakingPlan(userPlan)}>
                                                    Break Savings
                                                </Button>
                                            </>
                                        )}
                                    </CardFooter>
                                </Card>
                            )
                        })}
                    </div>
                </TabsContent>
            </Tabs>

            <Dialog open={!!selectedPlanForDeposit} onOpenChange={(open) => !open && setSelectedPlanForDeposit(null)}>
                <DepositModal
                    defaultPlanId={selectedPlanForDeposit || ""}
                    onSuccess={() => fetchMyPlans()}
                    onClose={() => setSelectedPlanForDeposit(null)}
                />
            </Dialog>

            {/* Marathon Join Modal */}
            {joiningMarathonPlan && (
                <MarathonJoinModal
                    plan={joiningMarathonPlan}
                    isOpen={!!joiningMarathonPlan}
                    onClose={() => setJoiningMarathonPlan(null)}
                    onSuccess={() => {
                        fetchMyPlans(); // Refresh lists
                    }}
                />
            )}

            {/* Sprint Join Modal */}
            {joiningSprintPlan && (
                <SprintJoinModal
                    plan={joiningSprintPlan}
                    isOpen={!!joiningSprintPlan}
                    onClose={() => setJoiningSprintPlan(null)}
                    onSuccess={() => fetchMyPlans()}
                />
            )}

            {/* Break Plan Modal (Standard Only) */}
            <Dialog open={!!breakingPlan} onOpenChange={(open) => !open && setBreakingPlan(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Break Savings</DialogTitle>
                        <DialogDescription>5% Fee applies. Cannot undo.</DialogDescription>
                    </DialogHeader>
                    {breakingPlan && (
                        <div className="space-y-4">
                            <div className="flex justify-between font-bold">
                                <span>Receive</span>
                                <span>${formatCurrency(breakingPlan.current_balance * 0.95)}</span>
                            </div>
                            <Button variant="destructive" className="w-full" onClick={handleBreakSavings} disabled={processingAction}>
                                Confirm Break
                            </Button>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
