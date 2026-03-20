import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { ArrowUpRight, ArrowDownLeft, Wallet, PiggyBank, CreditCard, ArrowRightLeft, AlertCircle, ChevronRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/app/context/AuthContext";
import { Button } from "@/app/components/ui/button";
import { Link } from "react-router-dom";
import { calculateBalance } from "@/lib/walletUtils";
import { Badge } from "@/app/components/ui/badge";

export function Overview() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);

    // Stats
    const [generalBalance, setGeneralBalance] = useState(0);
    const [withdrawableBalance, setWithdrawableBalance] = useState(0);
    const [activePlansCount, setActivePlansCount] = useState(0);
    const [outstandingLoans, setOutstandingLoans] = useState(0);

    // Lists
    const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
    const [userPlans, setUserPlans] = useState<any[]>([]);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [profile, setProfile] = useState<any>(null);

    useEffect(() => {
        if (user?.id) {
            fetchDashboardData();
        } else {
            setLoading(false);
        }
    }, [user?.id]);

    async function fetchDashboardData() {
        setLoading(true);
        try {
            // 1. Fetch Transactions (With plan details for filtering)
            const { data: txData } = await supabase
                .from("transactions")
                .select("*, plan:plans(type, name)")
                .eq("user_id", user?.id)
                .eq("status", "completed")
                .order("created_at", { ascending: false })
                .limit(10);

            if (txData) {
                // Calculate General Balance (No plan_id)
                const gBal = calculateBalance(txData as any, null);
                setGeneralBalance(gBal);

                // Calculate Withdrawable Balance (Specific plan type)
                const wBal = calculateBalance(txData as any, null, 'withdrawable_wallet');
                setWithdrawableBalance(wBal);

                // Recent Transactions (Top 10, full-width needs more content sometimes, or just better detail)
                // Filter for completed (approved) transactions only
                const approvedTx = txData.filter(tx => tx.status === 'completed');
                setRecentTransactions(approvedTx.slice(0, 10));
            }

            // 2. Fetch Active Plans (Excluding the internal Withdrawable Wallet plan)
            const { data: plansData } = await supabase
                .from("user_plans")
                .select("*, plan:plans(name, type, service_charge)")
                .eq("user_id", user?.id)
                .eq("status", "active")
                .not("plan.type", "eq", "withdrawable_wallet");

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

            // 4. Fetch Urgent Notifications / Reminders
            const { data: notifyData } = await supabase
                .from("notifications")
                .select("*")
                .eq("user_id", user?.id)
                .eq("is_read", false)
                .in("type", ["reminder", "loan", "plan"])
                .order("created_at", { ascending: false })
                .limit(3);

            if (notifyData) {
                setNotifications(notifyData);
            }

            // 5. Fetch Profile
            const { data: profileData } = await supabase
                .from("profiles")
                .select("full_name")
                .eq("id", user?.id)
                .single();

            if (profileData) {
                setProfile(profileData);
            }

        } catch (error) {
            console.error("Error fetching dashboard data:", error);
        } finally {
            setLoading(false);
        }
    }

    async function handleDismissNotification(id: string) {
        try {
            const { error } = await supabase
                .from("notifications")
                .update({ is_read: true })
                .eq("id", id);
            
            if (!error) {
                setNotifications(prev => prev.filter(n => n.id !== id));
            }
        } catch (error) {
            console.error("Error dismissing notification:", error);
        }
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'decimal',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount);
    };

    const toTitleCase = (str: string) => {
        if (!str) return 'User';
        return str.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    const firstName = profile?.full_name 
        ? toTitleCase(profile.full_name.split(' ')[0]) 
        : (user?.email ? toTitleCase(user.email.split('@')[0]) : 'User');

    if (loading) {
        return (
            <div className="space-y-6 animate-pulse p-6">
                <div className="h-8 bg-gray-200 rounded w-1/4 dark:bg-gray-700"></div>
                <div className="h-48 bg-gray-200 rounded dark:bg-gray-700"></div>
                <div className="space-y-6 mt-6">
                    <div className="h-64 bg-gray-200 rounded dark:bg-gray-700"></div>
                    <div className="h-64 bg-gray-200 rounded dark:bg-gray-700"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Urgent Notifications Banner - Stacked & Dismissible */}
            {notifications.length > 0 && (
                <div className="relative group/notif space-y-2">
                    {/* Visual Stacking Effect (shows only if more than 1) */}
                    {notifications.length > 1 && (
                        <div className="absolute -bottom-1 left-4 right-4 h-4 bg-amber-200/40 rounded-b-xl z-[1] blur-sm translate-y-1 animate-in fade-in" />
                    )}
                    {notifications.length > 2 && (
                        <div className="absolute -bottom-2 left-8 right-8 h-4 bg-amber-200/20 rounded-b-xl z-[0] blur-sm translate-y-2 animate-in fade-in" />
                    )}

                    <div className="space-y-2 relative z-[2]">
                        {notifications.map((n, idx) => (
                            <div 
                                key={n.id} 
                                className={`bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3 shadow-xl shadow-amber-500/5 
                                    animate-in fade-in slide-in-from-top-4 duration-500 delay-[${idx * 100}ms]
                                    group/item hover:bg-white transition-all
                                `}
                            >
                                <div className="p-2 bg-amber-100/50 rounded-xl text-amber-600">
                                    {n.type === 'loan' ? <CreditCard className="size-5" /> : <AlertCircle className="size-5" />}
                                </div>
                                <div className="flex-1 space-y-0.5">
                                    <p className="text-sm font-black text-amber-950 tracking-tight leading-none mb-1">{n.title}</p>
                                    <p className="text-xs text-amber-700 font-medium leading-relaxed max-w-prose">{n.message}</p>
                                </div>
                                <div className="flex flex-col items-end gap-2 self-center">
                                    <div className="flex items-center gap-2">
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            className="text-amber-800 hover:bg-amber-100 h-8 font-black text-[10px] uppercase tracking-wider rounded-xl border border-amber-200"
                                            asChild
                                        >
                                            <Link to={n.type === 'loan' ? "/dashboard/loans" : n.type === 'plan' ? "/dashboard/plans" : (n.link || "/dashboard/notifications")}>
                                                Fix Now <ChevronRight className="ml-1 size-3" />
                                            </Link>
                                        </Button>
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            onClick={() => handleDismissNotification(n.id)}
                                            className="h-8 w-8 rounded-xl text-amber-400 hover:text-amber-600 hover:bg-amber-100 transition-colors"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
                        Welcome {firstName},
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400">Manage your savings and payouts here.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" asChild className="dark:text-white border-2">
                        <Link to="/dashboard/wallet">Top Up</Link>
                    </Button>
                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white border-2 border-emerald-500" asChild>
                        <Link to="/dashboard/plans">Start Savings</Link>
                    </Button>
                </div>
            </div>

            {/* Central Balance Card - Ultra-Premium Design */}
            <Card className="relative overflow-hidden border-none shadow-2xl bg-[#0a0a0a] group">
                {/* Dynamic Gradient Orbs */}
                <div className="absolute -left-10 -top-10 w-72 h-72 bg-emerald-600/30 blur-[120px] rounded-full animate-pulse transition-all duration-1000" />
                <div className="absolute -right-10 -bottom-10 w-72 h-72 bg-blue-600/20 blur-[120px] rounded-full animate-pulse transition-all duration-1000" />
                
                <CardContent className="p-1 relative z-10">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-1 overflow-hidden rounded-xl">
                        {/* General Wallet */}
                        <div className="p-8 space-y-4 bg-white/[0.03] backdrop-blur-md border border-white/[0.05] hover:bg-white/[0.06] transition-all duration-300 relative group/item">
                            <div className="flex items-center gap-2.5 text-emerald-400 text-[10px] font-black uppercase tracking-[0.2em]">
                                <div className="p-2 bg-emerald-500/10 rounded-lg shadow-inner">
                                    <Wallet className="size-4" />
                                </div>
                                General Wallet
                            </div>
                            <div className="space-y-1">
                                <div className="text-2xl font-bold text-white tracking-tight">₦{formatCurrency(generalBalance)}</div>
                                <p className="text-[11px] text-gray-500 font-medium">Available for plan contributions</p>
                            </div>
                            <div className="absolute top-4 right-4 opacity-0 group-hover/item:opacity-100 transition-opacity">
                                <ArrowRightLeft className="size-4 text-emerald-500/40" />
                            </div>
                        </div>

                        {/* Withdrawable Wallet */}
                        <div className="p-8 space-y-4 bg-white/[0.04] backdrop-blur-md border border-white/[0.05] hover:bg-white/[0.07] transition-all duration-300 relative group/item">
                            <div className="flex items-center gap-2.5 text-blue-400 text-[10px] font-black uppercase tracking-[0.2em]">
                                <div className="p-2 bg-blue-500/10 rounded-lg shadow-inner">
                                    <ArrowRightLeft className="size-4" />
                                </div>
                                Withdrawable Wallet
                            </div>
                            <div className="space-y-1">
                                <div className="text-2xl font-bold text-white tracking-tight">₦{formatCurrency(withdrawableBalance)}</div>
                                <p className="text-[11px] text-gray-500 font-medium">Payouts & matured funds</p>
                            </div>
                        </div>

                        {/* Outstanding Loans */}
                        <div className="p-8 space-y-4 bg-white/[0.03] backdrop-blur-md border border-white/[0.05] hover:bg-white/[0.06] transition-all duration-300 relative group/item">
                            <div className={`flex items-center gap-2.5 text-[10px] font-black uppercase tracking-[0.2em] ${outstandingLoans > 0 ? 'text-amber-400' : 'text-gray-500'}`}>
                                <div className={`p-2 rounded-lg shadow-inner ${outstandingLoans > 0 ? 'bg-amber-500/10' : 'bg-gray-500/10'}`}>
                                    <CreditCard className="size-4" />
                                </div>
                                Outstanding Loans
                            </div>
                            <div className="space-y-1">
                                <div className={`text-2xl font-bold tracking-tight ${outstandingLoans > 0 ? 'text-amber-400' : 'text-white/30'}`}>
                                    ₦{formatCurrency(outstandingLoans)}
                                </div>
                                <p className="text-[11px] text-gray-600 font-medium">
                                    {outstandingLoans > 0 ? "Repayment active" : "No active loans"}
                                </p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="space-y-6">
                {/* Your Plans - Full Width */}
                <Card className="dark:bg-gray-800 dark:border-gray-700 shadow-sm overflow-hidden">
                    <CardHeader className="flex flex-row items-center justify-between border-b dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                        <div className="flex items-center gap-2">
                            <PiggyBank className="size-5 text-purple-600" />
                            <CardTitle className="text-lg dark:text-white">Your Plans</CardTitle>
                            <Badge variant="secondary" className="ml-2 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-none font-bold">
                                {activePlansCount} Active
                            </Badge>
                        </div>
                        <Button variant="ghost" size="sm" asChild className="text-xs dark:text-white">
                            <Link to="/dashboard/plans">View All</Link>
                        </Button>
                    </CardHeader>
                    <CardContent className="p-0">
                        {userPlans.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                                <PiggyBank className="w-12 h-12 mb-2 opacity-20" />
                                <p>No active plans yet</p>
                                <Button variant="link" size="sm" asChild className="mt-1 text-emerald-600">
                                    <Link to="/dashboard/plans">Explore Savings Plans</Link>
                                </Button>
                            </div>
                        ) : (
                            <div className="overflow-x-auto text-gray-900 dark:text-white">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400 font-medium text-xs uppercase tracking-wider">
                                        <tr>
                                            <th className="px-6 py-3">Plan Details</th>
                                            <th className="px-6 py-3">Start Date</th>
                                            <th className="px-6 py-3">Status</th>
                                            <th className="px-6 py-3 text-right">Balance</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y dark:divide-gray-700">
                                        {userPlans.map((plan) => (
                                            <tr key={plan.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div>
                                                        <span className="font-semibold text-gray-900 dark:text-white block">{plan.plan?.name}</span>
                                                        <span className="text-[10px] text-gray-400 uppercase">{plan.plan?.type.replace('_', ' ')}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-gray-500 dark:text-gray-400">
                                                    {new Date(plan.start_date).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 capitalize">
                                                        {plan.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="font-bold text-gray-900 dark:text-white">₦{formatCurrency(plan.current_balance)}</div>
                                                    <div className="text-[10px] text-red-500">₦{plan.plan?.service_charge} Service Fee</div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Recent Transactions - Full Width */}
                <Card className="dark:bg-gray-800 dark:border-gray-700 shadow-sm overflow-hidden text-gray-900 dark:text-white">
                    <CardHeader className="flex flex-row items-center justify-between border-b dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                        <div className="flex items-center gap-2">
                            <ArrowRightLeft className="size-5 text-blue-600" />
                            <CardTitle className="text-lg dark:text-white">Recent Approved Transactions</CardTitle>
                        </div>
                        <Button variant="ghost" size="sm" asChild className="text-xs dark:text-white">
                            <Link to="/dashboard/wallet">View Statement</Link>
                        </Button>
                    </CardHeader>
                    <CardContent className="p-0">
                        {recentTransactions.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                                <ArrowRightLeft className="w-12 h-12 mb-2 opacity-20" />
                                <p>No approved transactions yet</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400 font-medium text-xs uppercase tracking-wider">
                                        <tr>
                                            <th className="px-6 py-3">Type & Label</th>
                                            <th className="px-6 py-3">Plan / Source</th>
                                            <th className="px-6 py-3">Date</th>
                                            <th className="px-6 py-3">Status</th>
                                            <th className="px-6 py-3 text-right">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y dark:divide-gray-700">
                                        {recentTransactions.map((tx) => {
                                            const isPositive = ['deposit', 'loan_disbursement', 'interest', 'limit_transfer', 'payout', 'maturity_payout'].includes(tx.type);
                                            const Icon = isPositive ? ArrowUpRight : ArrowDownLeft;
                                            const colorClass = isPositive ? "text-emerald-600" : "text-gray-600";
                                            const bgClass = isPositive ? "bg-emerald-100 dark:bg-emerald-900/20" : "bg-gray-100 dark:bg-gray-700";

                                            return (
                                                <tr key={tx.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`p-2 rounded-full ${bgClass} ${colorClass}`}>
                                                                <Icon className="size-4" />
                                                            </div>
                                                            <div>
                                                                <p className="font-semibold text-gray-900 dark:text-white capitalize leading-tight">
                                                                    {tx.type.replace('_', ' ')}
                                                                </p>
                                                                <p className="text-[10px] text-gray-400 font-mono">{tx.id.substring(0, 8)}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                                                        {tx.plan?.name || (tx.plan_id ? 'Savings Plan' : 'Main Wallet')}
                                                    </td>
                                                    <td className="px-6 py-4 text-gray-500 dark:text-gray-400 text-xs text-gray-900 dark:text-white">
                                                        {new Date(tx.created_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 capitalize">
                                                            {tx.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <span className={`font-bold text-sm ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-900 dark:text-white'}`}>
                                                            {isPositive ? '+' : '-'}₦{formatCurrency(tx.amount)}
                                                        </span>
                                                        {tx.charge > 0 && <p className="text-[10px] text-gray-400">Fee: ₦{tx.charge}</p>}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

