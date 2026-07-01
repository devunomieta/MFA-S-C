import { useEffect, useState } from "react";

import {
  Users,
  Banknote,
  Clock,
  Wallet,
  ShieldCheck,
  ArrowUpRight,
  Activity,
  PieChart,
  RefreshCw,
  ClipboardList,
  LayoutDashboard,
  Download,
  Upload,
  ArrowRightLeft,
  AlertCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
} from "recharts";

import { Button } from "@/app/components/ui/button";
import { Card } from "@/app/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/app/components/ui/tabs";
import { supabase } from "@/lib/supabase";
import { formatNaira, formatStatusOrType } from "@/lib/utils";

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 backdrop-blur-md border border-slate-200/60 shadow-xl rounded-2xl p-4 min-w-[150px] z-50">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 pb-2 border-b border-slate-100">
          {label}
        </p>
        <div className="space-y-3">
          {payload.map((entry: any, index: number) => {
            const isCurrency = !["New Users", "Plan Joins"].includes(entry.name);
            const val = isCurrency ? formatNaira(Number(entry.value)) : entry.value;
            return (
              <div key={index} className="flex items-center justify-between gap-6">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: entry.color || entry.stroke || entry.fill }}
                  ></span>
                  <span className="text-xs font-bold text-slate-600">{entry.name}</span>
                </div>
                <span className="text-sm font-black text-slate-900">{val}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  return null;
};

const StatCard = ({
  title,
  value,
  label,
  trend,
  icon: Icon,
  colorClass,
  textClass,
  onClick,
}: any) => (
  <Card
    className="border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-[#0f1523] hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-300 cursor-pointer rounded-[2rem] group flex flex-col justify-between p-6 relative overflow-hidden shadow-sm"
    onClick={onClick}
  >
    <div className="absolute top-0 right-0 p-5 opacity-0 group-hover:scale-110 group-hover:opacity-[0.03] transition-all duration-500 ease-out pointer-events-none">
      <Icon className="size-24" />
    </div>

    <div className="flex items-start justify-between mb-6 relative z-10">
      <div
        className={`size-12 rounded-2xl flex items-center justify-center ${colorClass} ${textClass} group-hover:scale-110 transition-transform duration-300 ease-out`}
      >
        <Icon className="size-6" />
      </div>
      <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-slate-400 dark:text-slate-500">
        <ArrowUpRight className="size-4" />
      </div>
    </div>

    <div className="relative z-10 min-w-0">
      <h3 className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 truncate">
        {title}
      </h3>
      <div className="text-2xl xl:text-3xl font-black text-slate-900 dark:text-white mb-2 truncate tracking-tight">
        {value}
      </div>
      <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate flex items-center gap-1.5">
        {trend && (
          <span className="text-emerald-600 font-black bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded shadow-sm">
            {trend}
          </span>
        )}
        <span>{label}</span>
      </p>
    </div>
  </Card>
);

export function AdminOverview() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeLoansCount: 0,
    pendingDepositsCount: 0,
    pendingDepositsAmount: 0,
    totalDepositsAmount: 0,
    totalDepositsThisMonth: 0,
    totalFeesAmount: 0,
    pendingKycCount: 0,
    pendingBankRequestsCount: 0,
    activeSurveysCount: 0,
  });
  const [activity, setActivity] = useState<any[]>([]);
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [loanData, setLoanData] = useState<any[]>([]);
  const [userActivityData, setUserActivityData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchStats() {
    setLoading(true);
    try {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const { count: uCount } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });
      const { count: lCount } = await supabase
        .from("loans")
        .select("*", { count: "exact", head: true })
        .in("status", ["active", "overdue"]);
      const { data: pDeps } = await supabase
        .from("transactions")
        .select("amount")
        .eq("type", "deposit")
        .eq("status", "pending");
      const pAmnt = pDeps?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;
      const { data: cDeps } = await supabase
        .from("transactions")
        .select("amount")
        .eq("type", "deposit")
        .eq("status", "completed");
      const tAmnt = cDeps?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;
      const { data: fees } = await supabase
        .from("transactions")
        .select("amount")
        .in("type", ["service_charge", "fee", "penalty"])
        .eq("status", "completed");
      const tFees = fees?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;
      const { count: kCount } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("gov_id_status", "pending");
      const { count: bCount } = await supabase
        .from("bank_account_requests")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");
      const { count: sCount } = await supabase
        .from("surveys")
        .select("*", { count: "exact", head: true })
        .gte("created_at", firstDay);

      // Fetch current month transactions
      const { data: cmTxs } = await supabase
        .from("transactions")
        .select("amount, created_at, type, status")
        .gte("created_at", firstDay);

      const depositsThisMonth =
        cmTxs
          ?.filter((t) => t.type === "deposit" && t.status === "completed")
          .reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;

      setStats({
        totalUsers: uCount || 0,
        activeLoansCount: lCount || 0,
        pendingDepositsCount: pDeps?.length || 0,
        pendingDepositsAmount: pAmnt,
        totalDepositsAmount: tAmnt,
        totalDepositsThisMonth: depositsThisMonth,
        totalFeesAmount: tFees,
        pendingKycCount: kCount || 0,
        pendingBankRequestsCount: bCount || 0,
        activeSurveysCount: sCount || 0,
      });

      // Unified Activity feed
      const { data: recentTxs } = await supabase
        .from("transactions")
        .select("*, profile:profiles(full_name), plan:plans(name)")
        .order("created_at", { ascending: false })
        .limit(50);
      setActivity(recentTxs || []);

      // === Current Month Chart Data ===

      const revGrouped = (cmTxs || []).reduce((acc: any, curr: any) => {
        const date = new Date(curr.created_at).toLocaleDateString("en-US", { day: "numeric" });
        if (!acc[date]) acc[date] = { deposits: 0, withdrawals: 0 };
        if (curr.type === "deposit" && curr.status === "completed")
          acc[date].deposits += Number(curr.amount);
        if (curr.type === "withdrawal" && curr.status === "completed")
          acc[date].withdrawals += Number(curr.amount);
        return acc;
      }, {});

      const currentDay = now.getDate();
      const revenueSeries = [];
      for (let i = 1; i <= currentDay; i++) {
        const dayStr = i.toString();
        revenueSeries.push({
          date: dayStr,
          deposits: revGrouped[dayStr]?.deposits || 0,
          withdrawals: revGrouped[dayStr]?.withdrawals || 0,
        });
      }
      setRevenueData(revenueSeries);

      // Loans Chart Data (Current Month by Day)
      const { data: cmLoans } = await supabase
        .from("loans")
        .select("amount, created_at, status")
        .gte("created_at", firstDay);

      const loanGrouped = (cmLoans || []).reduce((acc: any, curr: any) => {
        const date = new Date(curr.created_at).toLocaleDateString("en-US", { day: "numeric" });
        if (!acc[date]) acc[date] = { disbursements: 0, settlements: 0 };
        if (["active", "completed"].includes(curr.status))
          acc[date].disbursements += Number(curr.amount);
        return acc;
      }, {});

      (cmTxs || []).forEach((tx) => {
        if (tx.type === "loan_repayment" && tx.status === "completed") {
          const date = new Date(tx.created_at).toLocaleDateString("en-US", { day: "numeric" });
          if (!loanGrouped[date]) loanGrouped[date] = { disbursements: 0, settlements: 0 };
          loanGrouped[date].settlements += Number(tx.amount);
        }
      });

      const loanSeries = [];
      for (let i = 1; i <= currentDay; i++) {
        const dayStr = i.toString();
        loanSeries.push({
          date: dayStr,
          disbursements: loanGrouped[dayStr]?.disbursements || 0,
          settlements: loanGrouped[dayStr]?.settlements || 0,
        });
      }
      setLoanData(loanSeries);

      // User Activity Chart Data (Current Month by Day)
      const { data: cmProfs } = await supabase
        .from("profiles")
        .select("created_at")
        .gte("created_at", firstDay);
      const { data: cmUPlans } = await supabase
        .from("user_plans")
        .select("created_at")
        .gte("created_at", firstDay);

      const userGrouped: any = {};
      (cmProfs || []).forEach((p) => {
        const date = new Date(p.created_at).toLocaleDateString("en-US", { day: "numeric" });
        if (!userGrouped[date]) userGrouped[date] = { newUsers: 0, newPlans: 0 };
        userGrouped[date].newUsers += 1;
      });
      (cmUPlans || []).forEach((p) => {
        const date = new Date(p.created_at).toLocaleDateString("en-US", { day: "numeric" });
        if (!userGrouped[date]) userGrouped[date] = { newUsers: 0, newPlans: 0 };
        userGrouped[date].newPlans += 1;
      });

      const userSeries = [];
      for (let i = 1; i <= currentDay; i++) {
        const dayStr = i.toString();
        userSeries.push({
          date: dayStr,
          newUsers: userGrouped[dayStr]?.newUsers || 0,
          newPlans: userGrouped[dayStr]?.newPlans || 0,
        });
      }
      setUserActivityData(userSeries);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    Promise.resolve().then(() => fetchStats());
  }, []);

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3">
        <div className="size-8 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          Loading Analytics
        </span>
      </div>
    );
  }

  const renderTransactionFeed = (filterType: string) => {
    const filtered = activity.filter((tx) => {
      if (filterType === "wallet") return tx.type === "deposit" && !tx.plan_id;
      if (filterType === "plan")
        return (tx.type === "transfer" || tx.type === "deposit") && tx.plan_id;
      if (filterType === "withdrawal") return tx.type === "withdrawal";
      if (filterType === "other")
        return ["fee", "service_charge", "penalty", "loan_disbursement", "loan_repayment"].includes(
          tx.type,
        );
      return true;
    });

    if (filtered.length === 0) {
      return (
        <div className="p-10 text-center text-[10px] font-bold text-slate-300 uppercase tracking-widest italic">
          No transactions found
        </div>
      );
    }

    return (
      <div className="divide-y divide-slate-50">
        {filtered.slice(0, 10).map((tx) => {
          let TxIcon = Activity;
          let iconColor = "bg-slate-50 text-slate-600";

          if (tx.type === "deposit") {
            TxIcon = Download;
            iconColor = "bg-emerald-50 text-emerald-600";
          } else if (tx.type === "withdrawal") {
            TxIcon = Upload;
            iconColor = "bg-red-50 text-red-600";
          } else if (tx.type === "transfer" || (tx.type === "deposit" && tx.plan_id)) {
            TxIcon = ArrowRightLeft;
            iconColor = "bg-blue-50 text-blue-600";
          } else if (["fee", "service_charge", "penalty"].includes(tx.type)) {
            TxIcon = AlertCircle;
            iconColor = "bg-amber-50 text-amber-600";
          }

          const destinationWallet = tx.plan_id
            ? `Plan Wallet • ${tx.plan?.name || "Unknown"}`
            : "General Wallet";

          return (
            <div
              key={tx.id}
              className="px-6 py-4 hover:bg-slate-50 transition-colors flex items-center justify-between group cursor-pointer"
              onClick={() => navigate("/admin/transactions")}
            >
              <div className="flex items-center gap-4">
                <div
                  className={`size-10 rounded-xl flex items-center justify-center shadow-sm ${iconColor}`}
                >
                  <TxIcon className="size-5" />
                </div>
                <div className="flex flex-col">
                  <p className="text-sm font-bold text-slate-800 leading-tight">
                    {tx.profile?.full_name || "System"}
                  </p>
                  <p className="text-[10px] font-semibold text-slate-400 mt-1 flex items-center gap-1.5">
                    <span className="uppercase tracking-wider text-slate-500">
                      {formatStatusOrType(tx.type)}
                    </span>
                    <span className="w-1 h-1 rounded-full bg-slate-300" />
                    <span>{destinationWallet}</span>
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p
                  className={`text-sm font-bold ${tx.type === "withdrawal" ? "text-red-600" : tx.type === "deposit" || tx.type === "transfer" ? "text-emerald-600" : "text-slate-900"}`}
                >
                  {tx.type === "withdrawal" ||
                  ["fee", "service_charge", "penalty"].includes(tx.type)
                    ? "-"
                    : "+"}
                  {formatNaira(tx.amount)}
                </p>
                <p className="text-[10px] font-medium text-slate-400 mt-1">
                  {new Date(tx.created_at).toLocaleString([], {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto space-y-12 py-4 animate-in fade-in duration-700">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">System Overview</h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Platform performance and administrative actions.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div
            className="flex items-center gap-3 bg-white border border-slate-200 shadow-sm rounded-xl px-4 py-2 cursor-pointer hover:border-emerald-500/30 transition-all h-[48px]"
            onClick={() => navigate("/admin/users")}
          >
            <div className="size-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
              <Users className="size-4" />
            </div>
            <div className="flex flex-col items-start pr-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">
                Users
              </span>
              <span className="text-sm font-black text-slate-900 leading-none">
                {stats.totalUsers}
              </span>
            </div>
          </div>

          <Button
            variant="outline"
            className="rounded-xl border-slate-200 bg-slate-900 text-white hover:bg-slate-800 hover:text-white shadow-sm h-[48px] px-6 flex items-center gap-2"
            onClick={() => fetchStats()}
          >
            <RefreshCw className="size-4" />
            <span className="font-semibold">Refresh Data</span>
          </Button>
        </div>
      </div>

      {/* Summary Section */}
      <div>
        <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
          <LayoutDashboard className="size-4 text-emerald-500" /> Summary
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard
            title="Total Deposits"
            value={formatNaira(stats.totalDepositsAmount)}
            trend={`+ ${formatNaira(stats.totalDepositsThisMonth)}`}
            label="All time"
            icon={Wallet}
            colorClass="bg-emerald-50 dark:bg-emerald-500/10"
            textClass="text-emerald-600 dark:text-emerald-400"
            onClick={() => navigate("/admin/transactions")}
          />
          <StatCard
            title="Pending Review"
            value={stats.pendingDepositsCount}
            label={`${formatNaira(stats.pendingDepositsAmount)} awaiting`}
            icon={Clock}
            colorClass="bg-amber-50 dark:bg-amber-500/10"
            textClass="text-amber-600 dark:text-amber-400"
            onClick={() => navigate("/admin/transactions")}
          />
          <StatCard
            title="Active Loans"
            value={stats.activeLoansCount}
            label="Outstanding disbursements"
            icon={Banknote}
            colorClass="bg-blue-50 dark:bg-blue-500/10"
            textClass="text-blue-600 dark:text-blue-400"
            onClick={() => navigate("/admin/loans")}
          />
        </div>
      </div>

      {/* Charts Section */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-4">
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
            <PieChart className="size-4 text-emerald-500" /> Current Month Metrics
          </h2>
          <Button
            variant="link"
            className="text-emerald-600 text-xs font-bold p-0 h-auto"
            onClick={() => navigate("/admin/analytics")}
          >
            View Full Analytics <ArrowUpRight className="ml-1 size-3" />
          </Button>
        </div>
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Revenue Flow */}
          <Card className="border border-slate-200/60 bg-white shadow-sm rounded-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-50 flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest">
                Revenue Flow
              </h3>
            </div>
            <div className="p-4 h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.6} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="withGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.6} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 9, fill: "#94a3b8" }}
                  />
                  <YAxis hide />
                  <Tooltip
                    content={<CustomTooltip />}
                    cursor={{ stroke: "#94a3b8", strokeWidth: 1, strokeDasharray: "4 4" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="deposits"
                    name="Deposits"
                    stroke="#10b981"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#revGrad)"
                    activeDot={{ r: 6, fill: "#10b981", stroke: "#fff", strokeWidth: 2 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="withdrawals"
                    name="Withdrawals"
                    stroke="#ef4444"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#withGrad)"
                    activeDot={{ r: 6, fill: "#ef4444", stroke: "#fff", strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Loans Chart */}
          <Card className="border border-slate-200/60 bg-white shadow-sm rounded-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-50 flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest">Loans</h3>
            </div>
            <div className="p-4 h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={loanData}
                  margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                  barSize={10}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 9, fill: "#94a3b8" }}
                  />
                  <YAxis hide />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f8fafc" }} />
                  <Bar
                    dataKey="disbursements"
                    name="Disbursements"
                    fill="#3b82f6"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="settlements"
                    name="Settlements"
                    fill="#10b981"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Platform Growth */}
          <Card className="border border-slate-200/60 bg-white shadow-sm rounded-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-50 flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest">
                Platform Growth
              </h3>
            </div>
            <div className="p-4 h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={userActivityData}
                  margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 9, fill: "#94a3b8" }}
                  />
                  <YAxis hide />
                  <Tooltip
                    content={<CustomTooltip />}
                    cursor={{ stroke: "#94a3b8", strokeWidth: 1, strokeDasharray: "4 4" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="newUsers"
                    name="New Users"
                    stroke="#6366f1"
                    strokeWidth={3}
                    dot={false}
                    activeDot={{ r: 6, fill: "#6366f1", stroke: "#fff", strokeWidth: 2 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="newPlans"
                    name="Plan Joins"
                    stroke="#f59e0b"
                    strokeWidth={3}
                    dot={false}
                    activeDot={{ r: 6, fill: "#f59e0b", stroke: "#fff", strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      </div>

      {/* Recent Transactions & Admin Actions Grid */}
      <div className="grid lg:grid-cols-3 gap-8 items-start">
        {/* Recent Transactions */}
        <div className="lg:col-span-2">
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
            <ClipboardList className="size-4 text-emerald-500" /> Recent Transactions
          </h2>
          <Card className="border border-slate-200/60 bg-white shadow-sm rounded-2xl overflow-hidden">
            <Tabs defaultValue="wallet" className="w-full">
              <div className="px-6 pt-6 border-b border-slate-50">
                <TabsList className="bg-slate-100/50 p-1 rounded-xl h-auto mb-4">
                  <TabsTrigger
                    value="wallet"
                    className="rounded-lg text-xs py-2 px-4 font-bold data-[state=active]:bg-white data-[state=active]:text-emerald-600 data-[state=active]:shadow-sm transition-all"
                  >
                    Wallet Deposits
                  </TabsTrigger>
                  <TabsTrigger
                    value="plan"
                    className="rounded-lg text-xs py-2 px-4 font-bold data-[state=active]:bg-white data-[state=active]:text-emerald-600 data-[state=active]:shadow-sm transition-all"
                  >
                    Plan Transfers
                  </TabsTrigger>
                  <TabsTrigger
                    value="withdrawal"
                    className="rounded-lg text-xs py-2 px-4 font-bold data-[state=active]:bg-white data-[state=active]:text-emerald-600 data-[state=active]:shadow-sm transition-all"
                  >
                    Withdrawals
                  </TabsTrigger>
                  <TabsTrigger
                    value="other"
                    className="rounded-lg text-xs py-2 px-4 font-bold data-[state=active]:bg-white data-[state=active]:text-emerald-600 data-[state=active]:shadow-sm transition-all"
                  >
                    Fees & Others
                  </TabsTrigger>
                </TabsList>
              </div>
              <TabsContent value="wallet" className="m-0">
                {renderTransactionFeed("wallet")}
              </TabsContent>
              <TabsContent value="plan" className="m-0">
                {renderTransactionFeed("plan")}
              </TabsContent>
              <TabsContent value="withdrawal" className="m-0">
                {renderTransactionFeed("withdrawal")}
              </TabsContent>
              <TabsContent value="other" className="m-0">
                {renderTransactionFeed("other")}
              </TabsContent>
            </Tabs>
            <button
              className="w-full p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50/50 hover:bg-slate-100 transition-colors border-t border-slate-50"
              onClick={() => navigate("/admin/transactions")}
            >
              View all transactions
            </button>
          </Card>
        </div>

        {/* Admin Actions */}
        <div className="space-y-4">
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
            <ShieldCheck className="size-4 text-emerald-500" /> Admin Actions
          </h2>

          <Card
            className="border border-slate-100 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-sm rounded-2xl p-6 flex items-center gap-5 group cursor-pointer hover:border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/5 transition-all duration-300 relative overflow-hidden"
            onClick={() => navigate("/admin/transactions?tab=revenue")}
          >
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <Activity className="size-16" />
            </div>
            <div className="size-14 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform duration-300 shadow-sm relative z-10">
              <Activity className="size-7" />
            </div>
            <div className="relative z-10">
              <h4 className="text-[11px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-widest mb-1">
                Admin Wallet
              </h4>
              <p className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {formatNaira(stats.totalFeesAmount)}
              </p>
            </div>
          </Card>

          <Card
            className="border border-slate-100 dark:border-gray-800 bg-slate-950 shadow-sm rounded-2xl p-6 flex items-center gap-5 group cursor-pointer hover:border-amber-500/30 hover:shadow-lg hover:shadow-amber-500/10 transition-all duration-300 relative overflow-hidden"
            onClick={() => navigate("/admin/approvals")}
          >
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity text-amber-500">
              <ShieldCheck className="size-16" />
            </div>
            <div className="size-14 rounded-2xl bg-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform duration-300 shadow-sm relative z-10">
              <ShieldCheck className="size-7" />
            </div>
            <div className="relative z-10">
              <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">
                Action Center
              </h4>
              <p className="text-2xl font-black text-white tracking-tight">
                {stats.pendingKycCount + stats.pendingBankRequestsCount} Pending
              </p>
            </div>
          </Card>

          <Card
            className="border border-slate-100 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-sm rounded-2xl p-6 flex items-center gap-5 group cursor-pointer hover:border-indigo-500/30 hover:shadow-lg hover:shadow-indigo-500/5 transition-all duration-300 relative overflow-hidden"
            onClick={() => navigate("/admin/surveys")}
          >
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity text-indigo-500">
              <PieChart className="size-16" />
            </div>
            <div className="size-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform duration-300 shadow-sm relative z-10">
              <PieChart className="size-7" />
            </div>
            <div className="relative z-10">
              <h4 className="text-[11px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-widest mb-1">
                Manage Surveys
              </h4>
              <p className="text-sm font-bold text-slate-600 dark:text-white tracking-tight mt-1">
                {stats.activeSurveysCount > 0
                  ? `${stats.activeSurveysCount} created this month`
                  : "Configure user feedback"}
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
