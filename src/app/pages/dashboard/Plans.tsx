import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { toast } from "sonner";
import { useAuth } from "@/app/context/AuthContext";
import { Link } from "react-router-dom";
import { Dialog } from "@/app/components/ui/dialog";
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
        const { data, error } = await supabase.from("plans").select("*");
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

                            // You can see plans you haven't fully activated yet, or plans you don't list at all.
                            // If it's active, maybe hide from available? Or show "Active" badge?
                            // Let's hide ACTIVE plans from "Available" to keep it clean, or just disable button.

                            return (
                                <Card key={plan.id} className="flex flex-col dark:bg-gray-800 dark:border-gray-700 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 flex flex-col items-end">
                                        {isActive && (
                                            <div className="bg-emerald-500 text-white text-xs px-2 py-1 rounded-bl-lg mb-1">
                                                Active
                                            </div>
                                        )}
                                        <div className={`text-xs px-2 py-1 rounded-bl-lg ${plan.contribution_type === 'fixed' ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>
                                            {plan.contribution_type === 'fixed'
                                                ? `Fixed: $${plan.fixed_amount}`
                                                : 'Flexible Amount'}
                                        </div>
                                    </div>
                                    <CardHeader>
                                        <CardTitle className="text-emerald-700 dark:text-emerald-500">{plan.name}</CardTitle>
                                        <CardDescription className="dark:text-gray-400">
                                            {plan.duration_weeks ? `${plan.duration_weeks} Weeks` : 'Flexible'} Duration
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="flex-1">
                                        <div className="text-3xl font-bold mb-4 dark:text-white">${formatCurrency(plan.service_charge)} <span className="text-sm font-normal text-gray-500 dark:text-gray-400">service charge</span></div>
                                        <p className="text-gray-600 dark:text-gray-300 mb-4">{plan.description}</p>
                                        <div className="text-sm text-gray-500 dark:text-gray-400">
                                            Min. Deposit: ${formatCurrency(plan.min_amount)}
                                        </div>
                                    </CardContent>
                                    <CardFooter>
                                        {isActive ? (
                                            <Button className="w-full" variant="secondary" disabled>
                                                Already Active
                                            </Button>
                                        ) : isPending ? (
                                            <Button
                                                className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                                                onClick={() => setSelectedPlanForDeposit(plan.id)}
                                            >
                                                Complete Activation
                                            </Button>
                                        ) : (
                                            <Button
                                                className="w-full bg-emerald-600 hover:bg-emerald-700 dark:text-white"
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

                            return (
                                <Card key={userPlan.id} className="dark:bg-gray-800 dark:border-gray-700 relative overflow-hidden">
                                    {/* Badges */}
                                    <div className="absolute top-0 right-0 flex flex-col items-end">
                                        {isMatured && (
                                            <div className="bg-emerald-600 text-white text-xs px-2 py-1 rounded-bl-lg mb-1 shadow-sm">
                                                Matured
                                            </div>
                                        )}
                                        {isDueSoon && !isMatured && (
                                            <div className="bg-amber-500 text-white text-xs px-2 py-1 rounded-bl-lg mb-1 shadow-sm animate-pulse">
                                                Due in {daysRemaining} Day{daysRemaining !== 1 ? 's' : ''}
                                            </div>
                                        )}
                                    </div>

                                    <CardHeader>
                                        <CardTitle className="dark:text-white">{userPlan.plan.name}</CardTitle>
                                        <CardDescription className="dark:text-gray-400">Started {new Date(userPlan.start_date).toLocaleDateString()}</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center">
                                                <span className="text-gray-600 dark:text-gray-400">Balance</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold dark:text-white">${formatCurrency(userPlan.current_balance)}</span>
                                                </div>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-600 dark:text-gray-400">Status</span>
                                                <span className={`capitalize font-medium ${isMatured ? 'text-emerald-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                                    {isMatured ? 'Ready for Withdrawal' : 'Active'}
                                                </span>
                                            </div>
                                        </div>
                                    </CardContent>
                                    <CardFooter className="gap-2">
                                        {isMatured ? (
                                            <Button variant="default" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" asChild>
                                                <Link to={`/dashboard/wallet?planId=${userPlan.plan.id}&action=withdraw`}>Manage Funds</Link>
                                            </Button>
                                        ) : (
                                            <>
                                                <Button
                                                    variant="outline"
                                                    className="flex-1 dark:bg-gray-900 dark:text-white dark:border-gray-700 dark:hover:bg-gray-800"
                                                    onClick={() => setSelectedPlanForDeposit(userPlan.plan.id)}
                                                >
                                                    Add Funds
                                                </Button>
                                                <Button variant="outline" className="flex-1 dark:bg-gray-900 dark:text-white dark:border-gray-700 dark:hover:bg-gray-800" asChild>
                                                    <Link to={`/dashboard/wallet?planId=${userPlan.plan.id}`}>Details</Link>
                                                </Button>
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
        </div >
    );
}
