import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/app/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { toast } from "sonner";
import { useAuth } from "@/app/context/AuthContext";
import { logActivity } from "@/lib/activity";
import { useSearchParams } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/app/components/ui/dialog";
import { DepositModal } from "@/app/components/DepositModal";
import { checkAndProcessMaturity } from "@/lib/planUtils";
import { Plan, UserPlan } from "@/types";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/app/components/ui/table";
import { Badge } from "@/app/components/ui/badge";
import { Info, Loader2 } from "lucide-react";
import { MarathonPlanCard } from "./plans/MarathonPlanCard";
import { MarathonJoinModal } from "./plans/MarathonJoinModal";
import { SprintPlanCard } from "./plans/SprintPlanCard";
import { SprintJoinModal } from "./plans/SprintJoinModal";
import { AnchorPlanCard } from "./plans/AnchorPlanCard";
import { DailyDropPlanCard } from "./plans/DailyDropPlanCard";
import { StepUpPlanCard } from "./plans/StepUpPlanCard";
import { MonthlyBloomPlanCard } from "./plans/MonthlyBloomPlanCard";
import { AjoCirclePlanCard } from "./plans/AjoCirclePlanCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";

const PlanTable = ({ items, type, onDetails, myPlans }: {
    items: any[],
    type: 'available' | 'active',
    onDetails: (plan: Plan, userPlan?: UserPlan) => void,
    myPlans: UserPlan[]
}) => {
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'decimal',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(value);
    };

    const hasJoinedPlan = (planId: string) => myPlans.some(p => p.plan_id === planId && p.status !== 'cancelled' && p.status !== 'completed');

    return (
        <div className="rounded-md border border-gray-200 dark:border-gray-800 overflow-hidden bg-white dark:bg-gray-900 shadow-sm">
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader className="bg-gray-50 dark:bg-gray-800/50">
                        <TableRow>
                            <TableHead className="w-12 font-semibold text-gray-900 dark:text-gray-100">S/N</TableHead>
                            <TableHead className="font-semibold text-gray-900 dark:text-gray-100">Plan Name</TableHead>
                            <TableHead className="font-semibold text-gray-900 dark:text-gray-100">Status</TableHead>
                            <TableHead className="font-semibold text-gray-900 dark:text-gray-100">Duration</TableHead>
                            <TableHead className="hidden md:table-cell font-semibold text-gray-900 dark:text-gray-100">Description</TableHead>
                            {type === 'active' && (
                                <TableHead className="text-right font-semibold text-gray-900 dark:text-gray-100">Saved Amount</TableHead>
                            )}
                            <TableHead className="text-right font-semibold text-gray-900 dark:text-gray-100">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {items.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={type === 'active' ? 7 : 6} className="h-24 text-center text-gray-500">
                                    No plans found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            items.map((item, index) => {
                                const plan = type === 'active' ? item.plan : item;
                                const userPlan = type === 'active' ? item : myPlans.find(p => p.plan_id === plan.id && p.status !== 'cancelled');
                                const isJoined = hasJoinedPlan(plan.id);

                                return (
                                    <TableRow key={item.id || `plan-${index}`} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                                        <TableCell className="text-gray-500 dark:text-gray-400 font-medium font-mono text-xs">
                                            {(index + 1).toString().padStart(2, '0')}
                                        </TableCell>
                                        <TableCell className="font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-1.5 h-6 rounded-full ${plan.type === 'marathon' ? 'bg-emerald-500' :
                                                    plan.type === 'sprint' ? 'bg-blue-500' :
                                                        plan.type === 'anchor' ? 'bg-slate-900' :
                                                            plan.type === 'daily_drop' ? 'bg-cyan-500' :
                                                                plan.type === 'step_up' ? 'bg-teal-900' :
                                                                    plan.type === 'monthly_bloom' ? 'bg-pink-500' :
                                                                        'bg-emerald-600'
                                                    }`} />
                                                {plan.name}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {type === 'available' ? (
                                                isJoined ? (
                                                    <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20">Active</Badge>
                                                ) : (
                                                    <Badge variant="outline" className="text-slate-500">Available</Badge>
                                                )
                                            ) : (
                                                <Badge className={`
                                                    ${item.status === 'matured' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                                                        item.status === 'active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                                                            'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'}
                                                `}>
                                                    {item.status.replace('_', ' ')}
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                                            {plan.duration_weeks ? `${plan.duration_weeks} Weeks` : (plan.duration_months ? `${plan.duration_months} Months` : 'Flexible')}
                                        </TableCell>
                                        <TableCell className="hidden md:table-cell text-xs text-gray-500 dark:text-gray-400 whitespace-normal min-w-[200px] max-w-[400px]">
                                            {plan.description}
                                        </TableCell>
                                        {type === 'active' && (
                                            <TableCell className="text-right font-bold text-gray-900 dark:text-gray-100 whitespace-nowrap">
                                                ₦{formatCurrency(item.current_balance)}
                                            </TableCell>
                                        )}
                                        <TableCell className="text-right whitespace-nowrap">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 font-semibold"
                                                onClick={() => onDetails(plan, userPlan)}
                                            >
                                                <Info className="size-4 mr-1.5" />
                                                Details
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
};

export function Plans() {
    const { user } = useAuth();
    const [availablePlans, setAvailablePlans] = useState<Plan[]>([]);
    const [myPlans, setMyPlans] = useState<UserPlan[]>([]);
    const [selectedPlanForDeposit, setSelectedPlanForDeposit] = useState<string | null>(null);
    const [breakingPlan, setBreakingPlan] = useState<UserPlan | null>(null);
    const [processingAction, setProcessingAction] = useState(false);

    // Join Flow Modals
    const [joiningMarathonPlan, setJoiningMarathonPlan] = useState<Plan | null>(null);
    const [joiningSprintPlan, setJoiningSprintPlan] = useState<Plan | null>(null);

    const [loading, setLoading] = useState(true);
    const [viewingPlan, setViewingPlan] = useState<{ plan: Plan; userPlan?: UserPlan } | null>(null);
    const [searchParams] = useSearchParams();

    useEffect(() => {
        const joinPlanId = searchParams.get('join');
        const viewPlanId = searchParams.get('view');

        if (availablePlans.length > 0) {
            if (joinPlanId) {
                const planToJoin = availablePlans.find(p => p.id === joinPlanId || p.type === joinPlanId);
                if (planToJoin) {
                    setViewingPlan({ plan: planToJoin });
                    window.history.replaceState({}, '', window.location.pathname);
                }
            } else if (viewPlanId) {
                // Check if it's an active plan or available plan
                const myPlan = myPlans.find(p => p.plan_id === viewPlanId && p.status !== 'cancelled');
                const planDetails = availablePlans.find(p => p.id === viewPlanId);

                if (myPlan) {
                    setViewingPlan({ plan: myPlan.plan, userPlan: myPlan });
                } else if (planDetails) {
                    setViewingPlan({ plan: planDetails });
                }
                window.history.replaceState({}, '', window.location.pathname);
            }
        }
    }, [availablePlans, myPlans, searchParams]);

    useEffect(() => {
        fetchPlans();
        fetchMyPlans();

        const channel = supabase
            .channel('user_plans_changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'user_plans', filter: `user_id=eq.${user?.id}` },
                () => { fetchMyPlans(); }
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

    async function joinStandardPlan(plan: Plan) {
        if (!user || processingAction) return;
        setProcessingAction(true);
        const { error } = await supabase.from("user_plans").insert({
            user_id: user.id,
            plan_id: plan.id,
            current_balance: 0,
            status: 'pending_activation'
        });

        if (error) {
            toast.error("Failed to initiate joining plan");
            setProcessingAction(false);
        } else {
            logActivity({
                userId: user.id,
                action: 'PLAN_JOIN',
                details: { plan_name: plan.name, display_name: user.user_metadata?.full_name?.split(' ')[0] || 'A user' }
            });
            toast.success(`Plan initiated! Please make a deposit to activate.`);
            setSelectedPlanForDeposit(plan.id);
            setProcessingAction(false);
        }
    }

    async function handleJoinStepUp(planId: string, amount: number, duration: number) {
        if (!user || processingAction) return;
        setProcessingAction(true);
        const metadata = { fixed_amount: amount, selected_duration: duration, weeks_completed: 0, week_paid_so_far: 0 };
        const { error } = await supabase.from("user_plans").insert({
            user_id: user.id,
            plan_id: planId,
            current_balance: 0,
            status: 'active',
            start_date: new Date().toISOString(),
            plan_metadata: metadata
        });

        if (error) {
            toast.error("Failed to join Step-Up plan.");
            setProcessingAction(false);
        } else {
            logActivity({
                userId: user.id,
                action: 'PLAN_JOIN',
                details: { plan_name: 'Rapid Fixed Savings', display_name: user.user_metadata?.full_name?.split(' ')[0] || 'A user' }
            });
            toast.success("Joined Rapid Fixed Savings! Please make your first deposit.");
            fetchMyPlans();
            setProcessingAction(false);
        }
    }

    async function handleJoinMonthlyBloom(planId: string, amount: number, duration: number) {
        if (!user || processingAction) return;
        setProcessingAction(true);
        const metadata = { target_amount: amount, selected_duration: duration, months_completed: 0, month_paid_so_far: 0, arrears: 0 };
        const { error } = await supabase.from("user_plans").insert({
            user_id: user.id,
            plan_id: planId,
            current_balance: 0,
            status: 'active',
            start_date: new Date().toISOString(),
            plan_metadata: metadata
        });

        if (error) {
            toast.error("Failed to join Monthly Bloom plan.");
            setProcessingAction(false);
        } else {
            logActivity({
                userId: user.id,
                action: 'PLAN_JOIN',
                details: { plan_name: 'Monthly Saving Plan', display_name: user.user_metadata?.full_name?.split(' ')[0] || 'A user' }
            });
            toast.success("Joined Monthly Saving Plan! Please make your first deposit.");
            fetchMyPlans();
            setProcessingAction(false);
        }
    }

    async function handleJoinAjoCircle(planId: string, amount: number) {
        if (!user || processingAction) return;
        setProcessingAction(true);
        const metadata = { fixed_amount: amount, picking_turns: [], current_week: 1, week_paid: false, missed_weeks: 0, last_payment_date: null };
        const { error } = await supabase.from("user_plans").insert({
            user_id: user.id,
            plan_id: planId,
            current_balance: 0,
            status: 'active',
            start_date: new Date().toISOString(),
            plan_metadata: metadata
        });

        if (error) {
            toast.error("Failed to join Ajo Circle.");
            setProcessingAction(false);
        } else {
            logActivity({
                userId: user.id,
                action: 'PLAN_JOIN',
                details: { plan_name: 'Digital Ajo Circle', display_name: user.user_metadata?.full_name?.split(' ')[0] || 'A user' }
            });
            toast.success("Joined Digital Ajo Circle! Admin will assign your picking turn soon.");
            fetchMyPlans();
            setProcessingAction(false);
        }
    }

    async function handleBreakSavings() {
        if (!user || !breakingPlan) return;
        setProcessingAction(true);
        const fee = breakingPlan.current_balance * 0.05;
        const refundAmount = breakingPlan.current_balance - fee;

        const { error: feeError } = await supabase.from("transactions").insert({
            user_id: user.id, amount: fee, type: 'service_charge', status: 'completed',
            description: `Break Savings Fee (5%) for ${breakingPlan.plan.name}`, plan_id: breakingPlan.plan.id, charge: 0
        });

        if (feeError) {
            toast.error("Failed to process fee transaction");
            setProcessingAction(false);
            return;
        }

        const { error: refundError } = await supabase.from("transactions").insert({
            user_id: user.id, amount: refundAmount, type: 'transfer', status: 'completed',
            description: `Break Savings Refund from ${breakingPlan.plan.name}`, plan_id: null, charge: 0
        });

        if (refundError) {
            toast.error("Failed to process refund transaction");
            setProcessingAction(false);
            return;
        }

        const { error: planError } = await supabase.from("user_plans").update({ status: 'cancelled', current_balance: 0 }).eq('id', breakingPlan.id);
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

    const activePlansList = myPlans.filter(p => p.status === 'active' || p.status === 'matured' || p.status === 'pending_activation');

    if (loading) {
        return (
            <div className="flex h-[400px] items-center justify-center">
                <Loader2 className="size-8 animate-spin text-emerald-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Savings Plans</h1>
                <p className="text-gray-500 dark:text-gray-400">Choose a plan that suits your financial goals.</p>
            </div>

            <Tabs defaultValue="available" className="w-full">
                <TabsList className="bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                    <TabsTrigger value="available" className="px-6">Available Plans</TabsTrigger>
                    <TabsTrigger value="my-plans" className="px-6">My Active Plans</TabsTrigger>
                </TabsList>

                <TabsContent value="available" className="space-y-4 pt-4">
                    <PlanTable
                        items={availablePlans}
                        type="available"
                        onDetails={(p, u) => setViewingPlan({ plan: p, userPlan: u })}
                        myPlans={myPlans}
                    />
                </TabsContent>

                <TabsContent value="my-plans" className="space-y-4 pt-4">
                    <PlanTable
                        items={activePlansList}
                        type="active"
                        onDetails={(p, u) => setViewingPlan({ plan: p, userPlan: u })}
                        myPlans={myPlans}
                    />
                </TabsContent>
            </Tabs>

            {/* Deposit Modal */}
            <Dialog open={!!selectedPlanForDeposit} onOpenChange={(open) => !open && setSelectedPlanForDeposit(null)}>
                <DepositModal
                    defaultPlanId={selectedPlanForDeposit || ""}
                    onSuccess={() => fetchMyPlans()}
                    onClose={() => setSelectedPlanForDeposit(null)}
                />
            </Dialog>

            {/* Plan Details Modal */}
            <Dialog open={!!viewingPlan} onOpenChange={(open) => !open && setViewingPlan(null)}>
                <DialogContent className="max-w-xl p-0 overflow-hidden bg-white dark:bg-gray-900 border-none shadow-2xl rounded-xl">
                    <DialogHeader className="sr-only">
                        <DialogTitle>Plan details for {viewingPlan?.plan.name}</DialogTitle>
                        <DialogDescription>Rules and features of the selected plan.</DialogDescription>
                    </DialogHeader>
                    {viewingPlan && (
                        <div className="w-full">
                            {viewingPlan.plan.type === 'marathon' && (
                                <MarathonPlanCard
                                    plan={viewingPlan.plan}
                                    userPlan={viewingPlan.userPlan}
                                    onJoin={() => { setJoiningMarathonPlan(viewingPlan.plan); setViewingPlan(null); }}
                                    onDeposit={() => { setSelectedPlanForDeposit(viewingPlan.plan.id); setViewingPlan(null); }}
                                />
                            )}
                            {viewingPlan.plan.type === 'sprint' && (
                                <SprintPlanCard
                                    plan={viewingPlan.plan}
                                    userPlan={viewingPlan.userPlan}
                                    onJoin={() => { setJoiningSprintPlan(viewingPlan.plan); setViewingPlan(null); }}
                                    onDeposit={() => { setSelectedPlanForDeposit(viewingPlan.plan.id); setViewingPlan(null); }}
                                />
                            )}
                            {viewingPlan.plan.type === 'anchor' && (
                                <AnchorPlanCard
                                    plan={viewingPlan.plan}
                                    userPlan={viewingPlan.userPlan}
                                    onJoin={() => { joinStandardPlan(viewingPlan.plan); setViewingPlan(null); }}
                                    onDeposit={() => { setSelectedPlanForDeposit(viewingPlan.plan.id); setViewingPlan(null); }}
                                />
                            )}
                            {viewingPlan.plan.type === 'daily_drop' && (
                                <DailyDropPlanCard
                                    plan={viewingPlan.plan}
                                    userPlan={viewingPlan.userPlan}
                                    onJoin={() => { joinStandardPlan(viewingPlan.plan); setViewingPlan(null); }}
                                    onDeposit={() => { setSelectedPlanForDeposit(viewingPlan.plan.id); setViewingPlan(null); }}
                                />
                            )}
                            {viewingPlan.plan.type === 'step_up' && (
                                <StepUpPlanCard
                                    plan={viewingPlan.plan}
                                    userPlan={viewingPlan.userPlan}
                                    onJoin={(p, a, d) => { handleJoinStepUp(p, a, d); setViewingPlan(null); }}
                                    onDeposit={() => { setSelectedPlanForDeposit(viewingPlan.plan.id); setViewingPlan(null); }}
                                />
                            )}
                            {viewingPlan.plan.type === 'monthly_bloom' && (
                                <MonthlyBloomPlanCard
                                    plan={viewingPlan.plan}
                                    userPlan={viewingPlan.userPlan}
                                    onJoin={(p, a, d) => { handleJoinMonthlyBloom(p, a, d); setViewingPlan(null); }}
                                    onDeposit={() => { setSelectedPlanForDeposit(viewingPlan.plan.id); setViewingPlan(null); }}
                                />
                            )}
                            {viewingPlan.plan.type === 'ajo_circle' && (
                                <AjoCirclePlanCard
                                    plan={viewingPlan.plan}
                                    userPlan={viewingPlan.userPlan}
                                    onJoin={(p, a) => { handleJoinAjoCircle(p, a); setViewingPlan(null); }}
                                    onDeposit={() => { setSelectedPlanForDeposit(viewingPlan.plan.id); setViewingPlan(null); }}
                                />
                            )}

                            {!['marathon', 'sprint', 'anchor', 'daily_drop', 'step_up', 'monthly_bloom', 'ajo_circle'].includes(viewingPlan.plan.type) && (
                                <Card className="border-none shadow-none">
                                    <CardHeader>
                                        <CardTitle>{viewingPlan.plan.name}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <p className="text-sm text-gray-500">{viewingPlan.plan.description}</p>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded">
                                                <p className="text-xs text-gray-500">Min Amount</p>
                                                <p className="text-lg font-bold">₦{viewingPlan.plan.min_amount.toLocaleString()}</p>
                                            </div>
                                            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded">
                                                <p className="text-xs text-gray-500">Duration</p>
                                                <p className="text-lg font-bold">{viewingPlan.plan.duration_weeks || 0} Weeks</p>
                                            </div>
                                        </div>
                                        <Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={() => { joinStandardPlan(viewingPlan.plan); setViewingPlan(null); }}>
                                            Join Plan
                                        </Button>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Sub-modals for Join Flow */}
            {joiningMarathonPlan && (
                <MarathonJoinModal
                    plan={joiningMarathonPlan}
                    isOpen={!!joiningMarathonPlan}
                    onClose={() => setJoiningMarathonPlan(null)}
                    onSuccess={() => fetchMyPlans()}
                />
            )}
            {joiningSprintPlan && (
                <SprintJoinModal
                    plan={joiningSprintPlan}
                    isOpen={!!joiningSprintPlan}
                    onClose={() => setJoiningSprintPlan(null)}
                    onSuccess={() => fetchMyPlans()}
                />
            )}

            {/* Break Plan Modal */}
            <Dialog open={!!breakingPlan} onOpenChange={(open) => !open && setBreakingPlan(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Break Savings</DialogTitle>
                        <DialogDescription>A 5% termination fee applies to early withdrawals. This action is irreversible.</DialogDescription>
                    </DialogHeader>
                    {breakingPlan && (
                        <div className="space-y-4 pt-4">
                            <div className="flex justify-between items-center p-4 bg-red-50 dark:bg-red-900/10 rounded-lg">
                                <span className="text-red-700 dark:text-red-400 font-medium">Estimated Payout</span>
                                <span className="text-xl font-bold text-red-700 dark:text-red-400">₦{formatCurrency(breakingPlan.current_balance * 0.95)}</span>
                            </div>
                            <Button variant="destructive" className="w-full h-12 text-lg font-bold" onClick={handleBreakSavings} disabled={processingAction}>
                                {processingAction ? <Loader2 className="animate-spin mr-2" /> : null}
                                Confirm & Break Plan
                            </Button>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
