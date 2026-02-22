import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { ArrowUpRight, ArrowDownLeft, Wallet, PiggyBank, CreditCard, ArrowRightLeft } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/app/context/AuthContext";
import { Button } from "@/app/components/ui/button";
import { Link } from "react-router-dom";

export function Overview() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);

    // Stats
    const [totalBalance, setTotalBalance] = useState(0);
    const [activePlansCount, setActivePlansCount] = useState(0);
    const [outstandingLoans, setOutstandingLoans] = useState(0);

    // Lists
    const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
    const [userPlans, setUserPlans] = useState<any[]>([]);

    useEffect(() => {
        if (user?.id) {
            fetchDashboardData();
        } else {
            // If no user, stop loading immediately (though ProtectedRoute handles this)
            setLoading(false);
        }
    }, [user?.id]);

    async function fetchDashboardData() {
        setLoading(true);
        try {
            // 1. Fetch Transactions (For Balance & Recent Activity)
            const { data: txData } = await supabase
                .from("transactions")
                .select("*")
                .eq("user_id", user?.id)
                .order("created_at", { ascending: false });

            if (txData) {
                // Calculate Balance
                const bal = txData.reduce((acc, curr) => {
                    const amt = Number(curr.amount);
                    const chg = Number(curr.charge || 0);
                    // Additions: Deposits, Loan Disbursements
                    if (curr.type === 'deposit' || curr.type === 'loan_disbursement' || curr.type === 'interest') {
                        return acc + amt - chg;
                    }
                    // Deductions: Withdrawals, Loan Repayments
                    if (curr.type === 'withdrawal' || curr.type === 'loan_repayment') {
                        return acc - amt - chg;
                    }
                    return acc;
                }, 0);
                setTotalBalance(bal);

                // Recent Transactions (Top 5)
                setRecentTransactions(txData.slice(0, 5));
            }

            // 2. Fetch Active Plans
            const { data: plansData } = await supabase
                .from("user_plans")
                .select("*, plan:plans(name, service_charge)")
                .eq("user_id", user?.id)
                .eq("status", "active");

            if (plansData) {
                setActivePlansCount(plansData.length);
                setUserPlans(plansData);
            }

            // 3. Fetch Loans (Outstanding)
            const { data: loansData } = await supabase
                .from("loans")
                .select("*")
                .eq("user_id", user?.id)
                .eq("status", "active"); // Considering 'active' as outstanding

            if (loansData) {
                const totalOutstanding = loansData.reduce((acc, curr) => acc + Number(curr.total_payable), 0);
                setOutstandingLoans(totalOutstanding);
            }

        } catch (error) {
            console.error("Error fetching dashboard data:", error);
        } finally {
            setLoading(false);
        }
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'decimal',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount);
    };

    const stats = [
        {
            title: "Total Balance",
            value: `₦${formatCurrency(totalBalance)}`,
            change: "Available funds",
            icon: Wallet,
            color: "text-emerald-600",
            bg: "bg-emerald-100",
        },
        {
            title: "Active Plans",
            value: activePlansCount.toString(),
            change: `${userPlans.length} savings active`,
            icon: PiggyBank,
            color: "text-blue-600",
            bg: "bg-blue-100",
        },
        {
            title: "Outstanding Loans",
            value: `₦${formatCurrency(outstandingLoans)}`,
            change: outstandingLoans > 0 ? "Repayment active" : "No active loans",
            icon: CreditCard,
            color: "text-amber-600",
            bg: "bg-amber-100",
        },
    ];

    if (loading) {
        return (
            <div className="space-y-6 animate-pulse">
                <div className="h-8 bg-gray-200 rounded w-1/4 dark:bg-gray-700"></div>
                <div className="grid gap-4 md:grid-cols-3">
                    {[1, 2, 3].map(i => <div key={i} className="h-32 bg-gray-200 rounded dark:bg-gray-700"></div>)}
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                    <div className="h-64 bg-gray-200 rounded dark:bg-gray-700"></div>
                    <div className="h-64 bg-gray-200 rounded dark:bg-gray-700"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard Overview</h1>
                <p className="text-gray-500 dark:text-gray-400">Welcome back! Here's what's happening with your wallet.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                {stats.map((stat, index) => (
                    <Card key={index} className="dark:bg-gray-800 dark:border-gray-700 transition-all hover:shadow-md">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                {stat.title}
                            </CardTitle>
                            <div className={`p-2 rounded-full ${stat.bg} ${stat.color} dark:bg-opacity-20`}>
                                <stat.icon className="size-4" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold dark:text-white">{stat.value}</div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{stat.change}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                {/* Recent Transactions */}
                <Card className="dark:bg-gray-800 dark:border-gray-700 flex flex-col">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="dark:text-white">Recent Transactions</CardTitle>
                        <Button variant="ghost" size="sm" asChild className="text-xs dark:text-white">
                            <Link to="/dashboard/wallet">View All</Link>
                        </Button>
                    </CardHeader>
                    <CardContent className="flex-1">
                        {recentTransactions.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-gray-500 pb-8">
                                <ArrowRightLeft className="w-10 h-10 mb-2 opacity-20" />
                                <p>No transactions yet</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {recentTransactions.map((tx) => {
                                    const isPositive = tx.type === 'deposit' || tx.type === 'loan_disbursement' || tx.type === 'interest';
                                    const Icon = isPositive ? ArrowUpRight : ArrowDownLeft;
                                    const color = isPositive ? "text-emerald-600" : "text-gray-600";
                                    const bg = isPositive ? "bg-emerald-100 dark:bg-emerald-900/20" : "bg-gray-100 dark:bg-gray-700";

                                    return (
                                        <div key={tx.id} className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-full ${bg} ${color}`}>
                                                    <Icon className="size-4" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-sm text-gray-900 dark:text-white capitalize">
                                                        {tx.type.replace('_', ' ')}
                                                    </p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                                        {new Date(tx.created_at).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            </div>
                                            <span className={`font-medium text-sm ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-900 dark:text-white'}`}>
                                                {isPositive ? '+' : '-'}₦{formatCurrency(tx.amount)}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Active Plans */}
                <Card className="dark:bg-gray-800 dark:border-gray-700 flex flex-col">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="dark:text-white">Your Plans</CardTitle>
                        <Button variant="ghost" size="sm" asChild className="text-xs dark:text-white">
                            <Link to="/dashboard/plans">View All</Link>
                        </Button>
                    </CardHeader>
                    <CardContent className="flex-1">
                        {userPlans.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-gray-500 pb-8">
                                <PiggyBank className="w-10 h-10 mb-2 opacity-20" />
                                <p>No active plans</p>
                                <Button variant="link" size="sm" asChild className="mt-2 text-emerald-600">
                                    <Link to="/dashboard/plans">Join a Plan</Link>
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {userPlans.map((plan) => (
                                    <div key={plan.id} className="p-3 border border-gray-100 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                        <div className="flex justify-between mb-2">
                                            <div>
                                                <span className="font-medium text-sm text-gray-900 dark:text-white block">{plan.plan?.name}</span>
                                                <span className="text-xs text-red-600 dark:text-red-400">₦{plan.plan?.service_charge} Charge</span>
                                            </div>
                                            <span className="text-sm font-semibold text-gray-900 dark:text-white">₦{formatCurrency(plan.current_balance)}</span>
                                        </div>
                                        {/* Simple Progress Indicator (Visual only since no explicit target) */}
                                        <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden w-full">
                                            <div
                                                className="h-full bg-emerald-500 rounded-full transition-all duration-1000"
                                                style={{ width: '100%' }} // Always full or logic based on something else? Let's keep it full or maybe random for 'ongoing' feel? No, full or a loader style. Let's just create a subtle gradient or removed the bar if deemed unnecessary. Actually, let's show it as full "Active".
                                            />
                                        </div>
                                        <p className="text-[10px] text-gray-400 mt-1 text-right">Started {new Date(plan.start_date).toLocaleDateString()}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
