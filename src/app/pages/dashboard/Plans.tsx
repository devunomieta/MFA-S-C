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

interface Plan {
    id: string;
    name: string;
    description: string;
    service_charge: number;
    duration_months: number;
    min_amount: number;
}

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
        const { data, error } = await supabase.from("plans").select("*");
        if (!error && data) setAvailablePlans(data);
    }

    async function fetchMyPlans() {
        if (!user) return;
        const { data, error } = await supabase
            .from("user_plans")
            .select(`*, plan:plans(*)`)
            .eq("user_id", user.id);

        if (!error && data) setMyPlans(data as any);
        setLoading(false);
    }

    async function joinPlan(plan: Plan) {
        if (!user) return;

        const { error } = await supabase.from("user_plans").insert({
            user_id: user.id,
            plan_id: plan.id,
            current_balance: 0,
            status: 'active'
        });

        if (error) {
            toast.error("Failed to join plan");
        } else {
            toast.success(`Joined ${plan.name} successfully!`);
            fetchMyPlans();
        }
    }

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'decimal',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(value);
    };

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
                    {/* ... available plans content ... */}
                    {availablePlans.length === 0 && !loading && (
                        <div className="text-center py-10 text-gray-500 dark:text-gray-400">
                            No plans available at the moment.
                        </div>
                    )}
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {availablePlans.map((plan) => {
                            const isJoined = myPlans.some(p => p.plan.id === plan.id);
                            return (
                                <Card key={plan.id} className="flex flex-col dark:bg-gray-800 dark:border-gray-700">
                                    <CardHeader>
                                        <CardTitle className="text-emerald-700 dark:text-emerald-500">{plan.name}</CardTitle>
                                        <CardDescription className="dark:text-gray-400">{plan.duration_months} Months Duration</CardDescription>
                                    </CardHeader>
                                    <CardContent className="flex-1">
                                        <div className="text-3xl font-bold mb-4 dark:text-white">${formatCurrency(plan.service_charge)} <span className="text-sm font-normal text-gray-500 dark:text-gray-400">service charge</span></div>
                                        <p className="text-gray-600 dark:text-gray-300 mb-4">{plan.description}</p>
                                        <div className="text-sm text-gray-500 dark:text-gray-400">
                                            Min. Deposit: ${formatCurrency(plan.min_amount)}
                                        </div>
                                    </CardContent>
                                    <CardFooter>
                                        <Button
                                            className="w-full bg-emerald-600 hover:bg-emerald-700 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                                            onClick={() => joinPlan(plan)}
                                            disabled={isJoined}
                                        >
                                            {isJoined ? "Already Joined" : "Join Plan"}
                                        </Button>
                                    </CardFooter>
                                </Card>
                            );
                        })}
                    </div>
                </TabsContent>

                <TabsContent value="my-plans" className="space-y-4 pt-4">
                    {myPlans.length === 0 && !loading && (
                        <div className="text-center py-10 text-gray-500 dark:text-gray-400">
                            You haven't joined any plans yet.
                        </div>
                    )}
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {myPlans.map((userPlan) => (
                            <Card key={userPlan.id} className="dark:bg-gray-800 dark:border-gray-700">
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
                                            <span className={`capitalize ${userPlan.status === 'active' ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-600 dark:text-gray-400'}`}>{userPlan.status}</span>
                                        </div>
                                    </div>
                                </CardContent>
                                <CardFooter className="gap-2">
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
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                </TabsContent>
            </Tabs>

            {/* Controlled Dialog for Deposits */}
            <Dialog open={!!selectedPlanForDeposit} onOpenChange={(open) => !open && setSelectedPlanForDeposit(null)}>
                <DepositModal
                    defaultPlanId={selectedPlanForDeposit || ""}
                    onSuccess={() => {
                        fetchMyPlans();
                        // Delay closing slightly to ensure toast is visible? 
                        // Actually DepositModal calls onClose, which we should map to state clearing.
                        // But DepositModal's onClose is called inside it.
                        // Wait, if DepositModal calls onClose, we should clear state there.
                    }}
                    onClose={() => setSelectedPlanForDeposit(null)}
                />
            </Dialog>
        </div>
    );
}
