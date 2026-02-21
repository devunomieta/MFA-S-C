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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/app/components/ui/table";
import { Badge } from "@/app/components/ui/badge";
import { Info } from "lucide-react";
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
    const [viewingPlan, setViewingPlan] = useState<{ plan: Plan; userPlan?: UserPlan } | null>(null);

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

    const PlanTable = ({ items, type }: { items: any[], type: 'available' | 'active' }) => (
        <div className="rounded-md border border-gray-200 dark:border-gray-800 overflow-hidden bg-white dark:bg-gray-900 shadow-sm">
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
                                <TableRow key={item.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                                    <TableCell className="text-gray-500 dark:text-gray-400 font-medium">
                                        {index + 1}
                                    </TableCell>
                                    <TableCell className="font-medium text-gray-900 dark:text-gray-100">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-1.5 h-6 rounded-full ${plan.type === 'marathon' ? 'bg-emerald-500' :
                                                plan.type === 'sprint' ? 'bg-blue-500' :
                                                    plan.type === 'anchor' ? 'bg-indigo-500' :
                                                        plan.type === 'daily_drop' ? 'bg-cyan-500' :
                                                            plan.type === 'step_up' ? 'bg-purple-500' :
                                                                plan.type === 'monthly_bloom' ? 'bg-pink-500' :
                                                                    'bg-orange-500'
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
                                                    item.status === 'active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-amber-400' :
                                                        'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'}
                                            `}>
                                                {item.status.replace('_', ' ')}
                                            </Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-sm text-gray-600 dark:text-gray-400">
                                        {plan.duration_weeks ? `${plan.duration_weeks} Weeks` : (plan.duration_months ? `${plan.duration_months} Months` : 'Flexible')}
                                    </TableCell>
                                    <TableCell className="hidden md:table-cell text-sm text-gray-600 dark:text-gray-400 whitespace-normal min-w-[200px]">
                                        {plan.description}
                                    </TableCell>
                                    {type === 'active' && (
                                        <TableCell className="text-right font-bold text-gray-900 dark:text-gray-100">
                                            ₦{formatCurrency(item.current_balance)}
                                        </TableCell>
                                    )}
                                    <TableCell className="text-right">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                            onClick={() => setViewingPlan({ plan, userPlan })}
                                        >
                                            <Info className="w-4 h-4 mr-1" />
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
    );

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
                    <PlanTable items={availablePlans} type="available" />
                </TabsContent>

                <TabsContent value="my-plans" className="space-y-4 pt-4">
                    <PlanTable items={activePlans} type="active" />
                </TabsContent>
            </Tabs>

            <Dialog open={!!selectedPlanForDeposit} onOpenChange={(open) => !open && setSelectedPlanForDeposit(null)}>
                <DepositModal
                    defaultPlanId={selectedPlanForDeposit || ""}
                    onSuccess={() => fetchMyPlans()}
                    onClose={() => setSelectedPlanForDeposit(null)}
                />
            </Dialog>

            {/* Plan Details Modal */}
            <Dialog open={!!viewingPlan} onOpenChange={(open) => !open && setViewingPlan(null)}>
                <DialogContent className="max-w-xl p-0 overflow-hidden bg-transparent border-none">
                    {viewingPlan && (
                        <div className="animate-in fade-in zoom-in duration-200">
                            {viewingPlan.plan.type === 'marathon' && (
                                <MarathonPlanCard
                                    plan={viewingPlan.plan}
                                    userPlan={viewingPlan.userPlan}
                                    onJoin={() => {
                                        setJoiningMarathonPlan(viewingPlan.plan);
                                        setViewingPlan(null);
                                    }}
                                    onDeposit={() => {
                                        setSelectedPlanForDeposit(viewingPlan.plan.id);
                                        setViewingPlan(null);
                                    }}
                                />
                            )}
                            {viewingPlan.plan.type === 'sprint' && (
                                <SprintPlanCard
                                    plan={viewingPlan.plan}
                                    userPlan={viewingPlan.userPlan}
                                    onJoin={() => {
                                        setJoiningSprintPlan(viewingPlan.plan);
                                        setViewingPlan(null);
                                    }}
                                    onDeposit={() => {
                                        setSelectedPlanForDeposit(viewingPlan.plan.id);
                                        setViewingPlan(null);
                                    }}
                                />
                            )}
                            {viewingPlan.plan.type === 'anchor' && (
                                <AnchorPlanCard
                                    plan={viewingPlan.plan}
                                    userPlan={viewingPlan.userPlan}
                                    onJoin={() => {
                                        joinStandardPlan(viewingPlan.plan);
                                        setViewingPlan(null);
                                    }}
                                    onDeposit={() => {
                                        setSelectedPlanForDeposit(viewingPlan.plan.id);
                                        setViewingPlan(null);
                                    }}
                                />
                            )}
                            {viewingPlan.plan.type === 'daily_drop' && (
                                <DailyDropPlanCard
                                    plan={viewingPlan.plan}
                                    userPlan={viewingPlan.userPlan}
                                    onJoin={() => {
                                        joinStandardPlan(viewingPlan.plan);
                                        setViewingPlan(null);
                                    }}
                                    onDeposit={() => {
                                        setSelectedPlanForDeposit(viewingPlan.plan.id);
                                        setViewingPlan(null);
                                    }}
                                />
                            )}
                            {viewingPlan.plan.type === 'step_up' && (
                                <StepUpPlanCard
                                    plan={viewingPlan.plan}
                                    userPlan={viewingPlan.userPlan}
                                    onJoin={(p, a, d) => {
                                        handleJoinStepUp(p, a, d);
                                        setViewingPlan(null);
                                    }}
                                    onDeposit={() => {
                                        setSelectedPlanForDeposit(viewingPlan.plan.id);
                                        setViewingPlan(null);
                                    }}
                                />
                            )}
                            {viewingPlan.plan.type === 'monthly_bloom' && (
                                <MonthlyBloomPlanCard
                                    plan={viewingPlan.plan}
                                    userPlan={viewingPlan.userPlan}
                                    onJoin={(p, a, d) => {
                                        handleJoinMonthlyBloom(p, a, d);
                                        setViewingPlan(null);
                                    }}
                                    onDeposit={() => {
                                        setSelectedPlanForDeposit(viewingPlan.plan.id);
                                        setViewingPlan(null);
                                    }}
                                />
                            )}
                            {viewingPlan.plan.type === 'ajo_circle' && (
                                <AjoCirclePlanCard
                                    plan={viewingPlan.plan}
                                    userPlan={viewingPlan.userPlan}
                                    onJoin={(p, a) => {
                                        handleJoinAjoCircle(p, a);
                                        setViewingPlan(null);
                                    }}
                                    onDeposit={() => {
                                        setSelectedPlanForDeposit(viewingPlan.plan.id);
                                        setViewingPlan(null);
                                    }}
                                />
                            )}

                            {/* Standard Plan Fallback */}
                            {!['marathon', 'sprint', 'anchor', 'daily_drop', 'step_up', 'monthly_bloom', 'ajo_circle'].includes(viewingPlan.plan.type) && (
                                <Card className="p-6">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h2 className="text-2xl font-bold">{viewingPlan.plan.name}</h2>
                                            <p className="text-gray-500">{viewingPlan.plan.description}</p>
                                        </div>
                                        <Badge variant="outline">
                                            {viewingPlan.userPlan ? viewingPlan.userPlan.status : 'Available'}
                                        </Badge>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="p-3 bg-gray-50 rounded">
                                                <p className="text-xs text-gray-500">Min Amount</p>
                                                <p className="text-lg font-bold">₦{formatCurrency(viewingPlan.plan.min_amount)}</p>
                                            </div>
                                            <div className="p-3 bg-gray-50 rounded">
                                                <p className="text-xs text-gray-500">Duration</p>
                                                <p className="text-lg font-bold">{viewingPlan.plan.duration_weeks} Weeks</p>
                                            </div>
                                        </div>
                                        {viewingPlan.userPlan ? (
                                            <div className="p-4 bg-emerald-50 rounded border border-emerald-100">
                                                <p className="text-xs text-emerald-600">Current Balance</p>
                                                <p className="text-2xl font-bold text-emerald-700">₦{formatCurrency(viewingPlan.userPlan.current_balance)}</p>
                                            </div>
                                        ) : (
                                            <Button className="w-full bg-emerald-600" onClick={() => {
                                                joinStandardPlan(viewingPlan.plan);
                                                setViewingPlan(null);
                                            }}>Join Now</Button>
                                        )}
                                    </div>
                                </Card>
                            )}
                        </div>
                    )}
                </DialogContent>
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
