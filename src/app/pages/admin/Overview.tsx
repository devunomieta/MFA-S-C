import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { formatNaira } from "@/lib/utils";
import { Users, Banknote, Clock, Wallet, ShieldCheck, ArrowUpRight, ArrowDownRight, Activity } from "lucide-react";
import { Card, CardContent } from "@/app/components/ui/card";
import { useNavigate } from "react-router-dom";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Button } from "@/app/components/ui/button";
import { AdminPageHeader } from "@/app/components/admin/AdminPageHeader";

export function AdminOverview() {
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        totalUsers: 0,
        activeLoansCount: 0,
        pendingDepositsCount: 0,
        pendingDepositsAmount: 0,
        totalDepositsAmount: 0,
        totalFeesAmount: 0,
        pendingKycCount: 0,
        pendingBankRequestsCount: 0
    });
    const [activity, setActivity] = useState<any[]>([]);
    const [chartData, setChartData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

    async function fetchStats() {
        setLoading(true);
        try {
            const { count: uCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
            const { count: lCount } = await supabase.from('loans').select('*', { count: 'exact', head: true }).in('status', ['active', 'overdue']);
            const { data: pDeps } = await supabase.from('transactions').select('amount').eq('type', 'deposit').eq('status', 'pending');
            const pAmnt = pDeps?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;
            const { data: cDeps } = await supabase.from('transactions').select('amount').eq('type', 'deposit').eq('status', 'completed');
            const tAmnt = cDeps?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;
            const { data: fees } = await supabase.from('transactions').select('amount').in('type', ['service_charge', 'fee', 'penalty']).eq('status', 'completed');
            const tFees = fees?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;
            const { count: kCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('gov_id_status', 'pending');
            const { count: bCount } = await supabase.from('bank_account_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending');

            setStats({
                totalUsers: uCount || 0,
                activeLoansCount: lCount || 0,
                pendingDepositsCount: pDeps?.length || 0,
                pendingDepositsAmount: pAmnt,
                totalDepositsAmount: tAmnt,
                totalFeesAmount: tFees,
                pendingKycCount: kCount || 0,
                pendingBankRequestsCount: bCount || 0
            });

            // Unified Activity feed
            const { data: recentTxs } = await supabase
                .from('transactions')
                .select('*, profile:profiles(full_name)')
                .order('created_at', { ascending: false })
                .limit(8);
            setActivity(recentTxs || []);

            // Simplified Trend Chart
            const sixMo = new Date();
            sixMo.setMonth(sixMo.getMonth() - 5);
            const { data: trends } = await supabase.from('transactions').select('amount, created_at, type').eq('status', 'completed').gte('created_at', sixMo.toISOString());
            
            const grouped = (trends || []).reduce((acc: any, curr: any) => {
                const month = new Date(curr.created_at).toLocaleDateString('en-US', { month: 'short' });
                if (!acc[month]) acc[month] = { volume: 0 };
                if (curr.type === 'deposit') acc[month].volume += Number(curr.amount);
                return acc;
            }, {});
            setChartData(Object.keys(grouped).map(m => ({ month: m, volume: grouped[m].volume })));

        } catch (e) { console.error(e); } finally { setLoading(false); }
    }

    const StatCard = ({ title, value, label, icon: Icon, color, onClick }: any) => (
        <Card className="border border-slate-200/60 bg-white hover:border-slate-300 transition-all cursor-pointer rounded-2xl group shadow-sm flex flex-col items-center justify-center py-6 px-4" onClick={onClick}>
            <div className={`p-2.5 rounded-xl ${color} bg-opacity-10 mb-4 group-hover:scale-110 transition-transform`}>
                <Icon className={`size-5 ${color.replace('bg-', 'text-')}`} />
            </div>
            <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">{title}</h3>
            <div className="text-2xl font-semibold text-slate-900 mb-1">{value}</div>
            <p className="text-[10px] font-medium text-slate-500">{label}</p>
        </Card>
    );

    if (loading) return (
        <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3">
            <div className="size-8 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Loading Analytics</span>
        </div>
    );

    return (
        <div className="max-w-7xl mx-auto space-y-12 py-4 animate-in fade-in duration-700">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">System Overview</h1>
                    <p className="text-sm text-slate-500 font-medium">Platform performance and administrative actions.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="rounded-xl border-slate-200 bg-white font-semibold text-slate-600 shadow-none h-9" onClick={() => fetchStats()}>
                        Refresh Data
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Total Users" value={stats.totalUsers} label="Registered platform users" icon={Users} color="bg-emerald-500" onClick={() => navigate('/admin/users')} />
                <StatCard title="Active Loans" value={stats.activeLoansCount} label="Outstanding disbursements" icon={Banknote} color="bg-blue-500" onClick={() => navigate('/admin/loans')} />
                <StatCard title="Pending Review" value={stats.pendingDepositsCount} label={`${formatNaira(stats.pendingDepositsAmount)} awaiting`} icon={Clock} color="bg-amber-500" onClick={() => navigate('/admin/transactions')} />
                <StatCard title="Total Deposits" value={formatNaira(stats.totalDepositsAmount)} label="Consolidated holdings" icon={Wallet} color="bg-emerald-500" onClick={() => navigate('/admin/transactions')} />
            </div>

            <div className="grid lg:grid-cols-3 gap-8 items-start">
                <div className="lg:col-span-2 space-y-8">
                    <Card className="border border-slate-200/60 bg-white shadow-sm rounded-2xl overflow-hidden">
                        <div className="p-6 border-b border-slate-50 flex items-center justify-between">
                            <h3 className="text-sm font-bold text-slate-900">Platform Growth</h3>
                            <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full uppercase">
                                <ArrowUpRight className="size-3" /> Volume (5m)
                            </div>
                        </div>
                        <div className="p-6 h-[280px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                                    <YAxis hide />
                                    <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #f1f5f9', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.05)' }} />
                                    <Area type="monotone" dataKey="volume" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#volGrad)" dot={{ r: 4, fill: '#10b981', strokeWidth: 0 }} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>

                    <div className="grid md:grid-cols-2 gap-6">
                        <Card className="border border-slate-200/60 bg-white shadow-sm rounded-2xl p-6 flex items-center gap-4 group cursor-pointer" onClick={() => navigate('/admin/transactions?tab=revenue')}>
                            <div className="size-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all">
                                <Activity className="size-6" />
                            </div>
                            <div>
                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Admin Wallet</h4>
                                <p className="text-xl font-semibold text-slate-900 tracking-tight">{formatNaira(stats.totalFeesAmount)}</p>
                            </div>
                        </Card>

                        <Card className="border border-slate-200/60 bg-slate-950 shadow-sm rounded-2xl p-6 flex items-center gap-4 group cursor-pointer" onClick={() => navigate('/admin/approvals')}>
                            <div className="size-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 group-hover:bg-amber-500 group-hover:text-white transition-all">
                                <ShieldCheck className="size-6" />
                            </div>
                            <div>
                                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Action Center</h4>
                                <p className="text-xl font-semibold text-white tracking-tight">{stats.pendingKycCount + stats.pendingBankRequestsCount} Pending</p>
                            </div>
                        </Card>
                    </div>
                </div>

                <Card className="border border-slate-200/60 bg-white shadow-sm rounded-2xl overflow-hidden">
                    <div className="p-6 border-b border-slate-50">
                        <h3 className="text-sm font-bold text-slate-900">System Pulse</h3>
                    </div>
                    <div className="divide-y divide-slate-50">
                        {activity.length > 0 ? activity.map(tx => (
                            <div key={tx.id} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between group">
                                <div className="flex items-center gap-3">
                                    <div className={`size-2 rounded-full ${tx.type === 'deposit' ? 'bg-emerald-500' : tx.type === 'withdrawal' ? 'bg-red-500' : 'bg-blue-500'}`} />
                                    <div>
                                        <p className="text-xs font-semibold text-slate-800">{tx.profile?.full_name || 'System'}</p>
                                        <p className="text-[10px] font-medium text-slate-400 capitalize">{tx.type.replace('_', ' ')}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className={`text-xs font-bold ${tx.type === 'deposit' ? 'text-emerald-600' : tx.type === 'withdrawal' ? 'text-red-600' : 'text-slate-900'}`}>{formatNaira(tx.amount)}</p>
                                    <p className="text-[9px] font-bold text-slate-300 uppercase">{new Date(tx.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}</p>
                                </div>
                            </div>
                        )) : (
                            <div className="p-10 text-center text-[10px] font-bold text-slate-300 uppercase tracking-widest italic">No pulse detected</div>
                        )}
                    </div>
                    <button className="w-full p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50/50 hover:bg-slate-100 transition-colors" onClick={() => navigate('/admin/transactions')}>
                        View Global Stream
                    </button>
                </Card>
            </div>
        </div>
    );
}
