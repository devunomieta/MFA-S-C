import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Users, Banknote, Activity, Clock, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/components/ui/card";
import { useNavigate } from "react-router-dom";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Button } from "@/app/components/ui/button";

export function AdminOverview() {
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        totalUsers: 0,
        activeLoansCount: 0,
        pendingDepositsCount: 0,
        pendingDepositsAmount: 0,
        totalDepositsAmount: 0,
        totalFeesAmount: 0
    });
    const [latestDeposits, setLatestDeposits] = useState<any[]>([]);
    const [latestWithdrawals, setLatestWithdrawals] = useState<any[]>([]);
    const [latestLoans, setLatestLoans] = useState<any[]>([]);
    const [chartData, setChartData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

    async function fetchStats() {
        setLoading(true);
        try {
            // 1. Total Users
            const { count: usersCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });

            // 2. Active Loans
            const { count: loansCount } = await supabase
                .from('loans')
                .select('*', { count: 'exact', head: true })
                .in('status', ['active', 'overdue']);

            // 3. Pending Deposits
            const { data: pendingDeps } = await supabase
                .from('transactions')
                .select('amount')
                .eq('type', 'deposit')
                .eq('status', 'pending');

            const pendingAmount = pendingDeps?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;
            const pendingCount = pendingDeps?.length || 0;

            // 4. Total Deposits (Completed)
            const { data: completedDeps } = await supabase
                .from('transactions')
                .select('amount')
                .eq('type', 'deposit')
                .eq('status', 'completed');

            const totalAmount = completedDeps?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;

            // 5. Total Fees Collected (Admin Revenue)
            const { data: feesData } = await supabase
                .from('transactions')
                .select('amount')
                .eq('type', 'service_charge')
                .eq('status', 'completed');

            const totalFees = feesData?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;

            setStats({
                totalUsers: usersCount || 0,
                activeLoansCount: loansCount || 0,
                pendingDepositsCount: pendingCount,
                pendingDepositsAmount: pendingAmount,
                totalDepositsAmount: totalAmount,
                totalFeesAmount: totalFees
            });

            // 6. Recent Activity (Categorized)
            // Deposits
            const { data: recentDeps } = await supabase
                .from('transactions')
                .select('*, profile:profiles(full_name, email)')
                .eq('type', 'deposit')
                .order('created_at', { ascending: false })
                .limit(5);
            setLatestDeposits(recentDeps || []);

            // Withdrawals
            const { data: recentWds } = await supabase
                .from('transactions')
                .select('*, profile:profiles(full_name, email)')
                .eq('type', 'withdrawal')
                .order('created_at', { ascending: false })
                .limit(5);
            setLatestWithdrawals(recentWds || []);

            // Loans (Disbursements & Repayments)
            const { data: recentLoans } = await supabase
                .from('transactions')
                .select('*, profile:profiles(full_name, email)')
                .in('type', ['loan_disbursement', 'loan_repayment'])
                .order('created_at', { ascending: false })
                .limit(5);
            setLatestLoans(recentLoans || []);


            // 7. Chart Data (Last 6 Months Trends)
            const sixMonthsAgo = new Date();
            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
            sixMonthsAgo.setDate(1); // Start of that month

            const { data: trendData } = await supabase
                .from('transactions')
                .select('amount, created_at, type')
                .eq('status', 'completed')
                .gte('created_at', sixMonthsAgo.toISOString())
                .order('created_at', { ascending: true });

            // Process for Chart
            const grouped = (trendData || []).reduce((acc: any, curr: any) => {
                const date = new Date(curr.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }); // e.g., "Jan 2025"
                if (!acc[date]) acc[date] = { deposits: 0, withdrawals: 0, loans: 0, revenue: 0 };

                const amt = Number(curr.amount);
                if (curr.type === 'deposit') acc[date].deposits += amt;
                else if (curr.type === 'withdrawal') acc[date].withdrawals += amt;
                else if (curr.type === 'loan_disbursement') acc[date].loans += amt;
                else if (curr.type === 'service_charge') acc[date].revenue += amt;

                return acc;
            }, {});

            const chartArray = Object.keys(grouped).map(date => ({
                date, // "Jan 2025"
                deposits: grouped[date].deposits,
                withdrawals: grouped[date].withdrawals,
                loans: grouped[date].loans,
                revenue: grouped[date].revenue
            }));

            setChartData(chartArray);

        } catch (error) {
            console.error("Error fetching admin stats:", error);
        } finally {
            setLoading(false);
        }
    }

    const formatCurrency = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

    const TransactionList = ({ title, data, icon: Icon, colorClass, emptyMsg }: any) => (
        <Card className="border-slate-100 shadow-sm bg-slate-50/50">
            <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${colorClass}`} /> {title}
                </CardTitle>
            </CardHeader>
            <CardContent>
                {data.length > 0 ? (
                    <div className="space-y-3">
                        {data.map((tx: any) => (
                            <div key={tx.id} className="flex items-center justify-between p-2 bg-white rounded border border-slate-100 shadow-sm text-sm">
                                <div>
                                    <p className="font-medium text-slate-900 truncate max-w-[120px]" title={tx.profile?.full_name}>{tx.profile?.full_name || 'User'}</p>
                                    <p className="text-[10px] text-slate-500">{new Date(tx.created_at).toLocaleDateString()}</p>
                                </div>
                                <div className="text-right">
                                    <p className={`font-bold ${colorClass}`}>
                                        {formatCurrency(tx.amount)}
                                    </p>
                                    <p className="text-[10px] text-slate-400 lowercase">{tx.status}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-xs text-slate-400 italic text-center py-2">{emptyMsg}</p>
                )}
            </CardContent>
        </Card>
    );

    if (loading) return <div className="p-8 text-center text-gray-500">Loading dashboard data...</div>;

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Admin Overview</h1>
                <p className="text-gray-500 mt-2">Welcome back. Here's what's happening today.</p>
            </div>

            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card
                    className="bg-white border-slate-200 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => navigate('/admin/users')}
                >
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Total Users</CardTitle>
                        <Users className="h-4 w-4 text-emerald-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900">{stats.totalUsers}</div>
                        <p className="text-xs text-slate-500">Registered accounts</p>
                    </CardContent>
                </Card>

                <Card
                    className="bg-white border-slate-200 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => navigate('/admin/loans')}
                >
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Active Loans</CardTitle>
                        <Banknote className="h-4 w-4 text-emerald-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900">{stats.activeLoansCount}</div>
                        <p className="text-xs text-slate-500">Loans currently in progress</p>
                    </CardContent>
                </Card>

                <Card
                    className="bg-white border-slate-200 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => navigate('/admin/transactions')}
                >
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Pending Deposits</CardTitle>
                        <Clock className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900">{stats.pendingDepositsCount}</div>
                        <p className="text-xs text-amber-600 font-medium">
                            {formatCurrency(stats.pendingDepositsAmount)} waiting
                        </p>
                    </CardContent>
                </Card>

                <Card
                    className="bg-white border-slate-200 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => navigate('/admin/transactions')}
                >
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Platform Deposits</CardTitle>
                        <Banknote className="h-4 w-4 text-emerald-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900">{formatCurrency(stats.totalDepositsAmount)}</div>
                        <p className="text-xs text-slate-500">Current holdings across all plans</p>
                    </CardContent>
                </Card>

                <Card
                    className="bg-white border-slate-200 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => navigate('/admin/transactions?tab=revenue')}
                >
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Admin Wallet</CardTitle>
                        <Activity className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">{formatCurrency(stats.totalFeesAmount)}</div>
                        <p className="text-xs text-blue-500 font-medium">Total fees & penalties collected</p>
                    </CardContent>
                </Card>
            </div>

            {/* Charts & Actions Row */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                {/* Chart Area Only */}
                <Card className="col-span-4 border-slate-200 shadow-sm">
                    <CardHeader>
                        <CardTitle>Financial Trends</CardTitle>
                        <CardDescription>Monthly breakdown of deposits, withdrawals, and loans.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px] w-full">
                            {chartData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorDeposits" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="colorWithdrawals" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                                                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="colorLoans" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(val) => `$${val}`} />
                                        <Tooltip
                                            formatter={(value, name) => [`$${value}`, name]}
                                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                        />
                                        <Area type="monotone" dataKey="deposits" name="Deposits" stroke="#10b981" fillOpacity={0.2} fill="url(#colorDeposits)" strokeWidth={2} stackId="1" />
                                        <Area type="monotone" dataKey="loans" name="Loans Disbursed" stroke="#3b82f6" fillOpacity={0.2} fill="url(#colorLoans)" strokeWidth={2} stackId="2" />
                                        <Area type="monotone" dataKey="withdrawals" name="Withdrawals" stroke="#ef4444" fillOpacity={0.2} fill="url(#colorWithdrawals)" strokeWidth={2} stackId="3" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                                    Not enough data for chart
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Quick Actions */}
                <Card className="col-span-3 border-slate-200 shadow-sm h-full flex flex-col">
                    <CardHeader>
                        <CardTitle>Quick Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 flex-1">
                        <div className="bg-amber-50 p-4 rounded-lg border border-amber-100 cursor-pointer hover:bg-amber-100 transition-colors" onClick={() => navigate('/admin/transactions')}>
                            <div className="flex justify-between items-start">
                                <div>
                                    <h4 className="font-semibold text-amber-900 mb-1">Pending Tasks</h4>
                                    <p className="text-sm text-amber-700">You have {stats.pendingDepositsCount} deposits to review.</p>
                                </div>
                                <Clock className="w-5 h-5 text-amber-600" />
                            </div>
                            <Button size="sm" variant="outline" className="mt-3 w-full border-amber-200 text-amber-800 hover:bg-amber-200 bg-transparent">
                                Review Transactions
                            </Button>
                        </div>

                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 cursor-pointer hover:bg-blue-100 transition-colors" onClick={() => navigate('/admin/loans')}>
                            <div className="flex justify-between items-start">
                                <div>
                                    <h4 className="font-semibold text-blue-900 mb-1">Loan Review</h4>
                                    <p className="text-sm text-blue-700">{stats.activeLoansCount} active loans in system.</p>
                                </div>
                                <Banknote className="w-5 h-5 text-blue-600" />
                            </div>
                            <Button size="sm" variant="outline" className="mt-3 w-full border-blue-200 text-blue-800 hover:bg-blue-200 bg-transparent">
                                Manage Loans
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Latest Transactions Sections (Full Width) */}
            <Card className="bg-white border-slate-200 shadow-sm">
                <CardHeader>
                    <CardTitle>Latest Activity Categories</CardTitle>
                    <CardDescription>Most recent transactions across all types.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid md:grid-cols-3 gap-6">
                        <TransactionList
                            title="Recent Deposits"
                            data={latestDeposits}
                            icon={ArrowRight}
                            colorClass="text-emerald-600"
                            emptyMsg="No recent deposits"
                        />
                        <TransactionList
                            title="Recent Withdrawals"
                            data={latestWithdrawals}
                            icon={ArrowRight}
                            colorClass="text-red-600"
                            emptyMsg="No recent withdrawals"
                        />
                        <TransactionList
                            title="Recent Loans"
                            data={latestLoans}
                            icon={Banknote}
                            colorClass="text-blue-600"
                            emptyMsg="No recent loan activity"
                        />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
