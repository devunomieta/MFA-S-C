import { useEffect, useState } from "react";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  Download,
  FileText,
  Calendar as CalendarIcon,
  Loader2,
  PieChart,
  Activity,
  Users,
} from "lucide-react";
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
  Legend,
  LineChart,
  Line,
} from "recharts";
import * as XLSX from "xlsx";

import { Button } from "@/app/components/ui/button";
import { Card } from "@/app/components/ui/card";
import { supabase } from "@/lib/supabase";
import { formatNaira } from "@/lib/utils";

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
export default function Analytics() {
  const [loading, setLoading] = useState(true);

  // Date Range State (Default: Last 30 days)
  const defaultTo = new Date();
  const defaultFrom = new Date();
  defaultFrom.setDate(defaultTo.getDate() - 30);

  const [dateRange, setDateRange] = useState({
    from: defaultFrom.toISOString().split("T")[0],
    to: defaultTo.toISOString().split("T")[0],
  });

  // Data States
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loans, setLoans] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [userPlans, setUserPlans] = useState<any[]>([]);

  // Chart Data States
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [loanData, setLoanData] = useState<any[]>([]);
  const [userActivityData, setUserActivityData] = useState<any[]>([]);

  async function fetchAnalyticsData() {
    setLoading(true);
    try {
      const fromDate = new Date(dateRange.from).toISOString();
      // Add 1 day to 'to' date to include the whole day
      const toDate = new Date(new Date(dateRange.to).getTime() + 24 * 60 * 60 * 1000).toISOString();

      // 1. Fetch Transactions
      const { data: txs } = await supabase
        .from("transactions")
        .select("*")
        .gte("created_at", fromDate)
        .lt("created_at", toDate)
        .order("created_at", { ascending: true });

      setTransactions(txs || []);

      // 2. Fetch Loans
      const { data: lns } = await supabase
        .from("loans")
        .select("*")
        .gte("created_at", fromDate)
        .lt("created_at", toDate)
        .order("created_at", { ascending: true });

      setLoans(lns || []);

      // 3. Fetch Profiles (New Users)
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, created_at")
        .gte("created_at", fromDate)
        .lt("created_at", toDate);

      setProfiles(profs || []);

      // 4. Fetch User Plans (New Plans)
      const { data: uplans } = await supabase
        .from("user_plans")
        .select("id, created_at")
        .gte("created_at", fromDate)
        .lt("created_at", toDate);

      setUserPlans(uplans || []);

      // === Process Data for Charts ===

      // Revenue Chart Data (Deposits vs Withdrawals grouped by Day)
      const revGrouped = (txs || []).reduce((acc: any, curr: any) => {
        const date = new Date(curr.created_at).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
        if (!acc[date]) acc[date] = { deposits: 0, withdrawals: 0 };
        if (curr.type === "deposit" && curr.status === "completed")
          acc[date].deposits += Number(curr.amount);
        if (curr.type === "withdrawal" && curr.status === "completed")
          acc[date].withdrawals += Number(curr.amount);
        return acc;
      }, {});
      setRevenueData(Object.keys(revGrouped).map((d) => ({ date: d, ...revGrouped[d] })));

      // Loan Data (Disbursements vs Settlements)
      // For simplicity, we use loan created_at for disbursements, and look for loan_repayment transactions for settlements.
      const loanGrouped = (lns || []).reduce((acc: any, curr: any) => {
        const date = new Date(curr.created_at).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
        if (!acc[date]) acc[date] = { disbursements: 0, settlements: 0 };
        if (["active", "completed"].includes(curr.status))
          acc[date].disbursements += Number(curr.amount);
        return acc;
      }, {});

      (txs || []).forEach((tx) => {
        if (tx.type === "loan_repayment" && tx.status === "completed") {
          const date = new Date(tx.created_at).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          });
          if (!loanGrouped[date]) loanGrouped[date] = { disbursements: 0, settlements: 0 };
          loanGrouped[date].settlements += Number(tx.amount);
        }
      });
      setLoanData(Object.keys(loanGrouped).map((d) => ({ date: d, ...loanGrouped[d] })));

      // User Activity Data
      const userGrouped: any = {};
      (profs || []).forEach((p) => {
        const date = new Date(p.created_at).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
        if (!userGrouped[date]) userGrouped[date] = { newUsers: 0, newPlans: 0 };
        userGrouped[date].newUsers += 1;
      });
      (uplans || []).forEach((p) => {
        const date = new Date(p.created_at).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
        if (!userGrouped[date]) userGrouped[date] = { newUsers: 0, newPlans: 0 };
        userGrouped[date].newPlans += 1;
      });
      setUserActivityData(Object.keys(userGrouped).map((d) => ({ date: d, ...userGrouped[d] })));
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchAnalyticsData();
  }, []);

  // Export to Excel
  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();

    // Transactions Sheet
    const txsSheet = XLSX.utils.json_to_sheet(
      transactions.map((t) => ({
        ID: t.id,
        Type: t.type,
        Amount: t.amount,
        Status: t.status,
        Date: new Date(t.created_at).toLocaleString(),
      })),
    );
    XLSX.utils.book_append_sheet(wb, txsSheet, "Transactions");

    // Loans Sheet
    const loansSheet = XLSX.utils.json_to_sheet(
      loans.map((l) => ({
        ID: l.id,
        Amount: l.amount,
        Status: l.status,
        Date: new Date(l.created_at).toLocaleString(),
      })),
    );
    XLSX.utils.book_append_sheet(wb, loansSheet, "Loans");

    // Summary Sheet
    const summaryData = [
      { Metric: "Total Transactions", Value: transactions.length },
      { Metric: "Total Loans", Value: loans.length },
      { Metric: "New Users", Value: profiles.length },
      { Metric: "New Plans", Value: userPlans.length },
    ];
    const summarySheet = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summarySheet, "Summary");

    XLSX.writeFile(wb, `MarysThrift_Analytics_${dateRange.from}_to_${dateRange.to}.xlsx`);
  };

  // Export to PDF
  const exportToPDF = () => {
    const doc = new jsPDF();

    // Header
    doc.setFontSize(20);
    doc.text("Mary's Thrift Analytics Report", 14, 22);

    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Period: ${dateRange.from} to ${dateRange.to}`, 14, 30);

    // Summary Table
    autoTable(doc, {
      startY: 40,
      head: [["Metric", "Count/Value"]],
      body: [
        ["Total Transactions", transactions.length.toString()],
        ["Total Loans Originated", loans.length.toString()],
        ["New User Registrations", profiles.length.toString()],
        ["New Plan Subscriptions", userPlans.length.toString()],
      ],
      theme: "grid",
      headStyles: { fillColor: [16, 185, 129] },
    });

    // Recent Transactions Sample
    doc.text("Transaction Sample (Last 50)", 14, (doc as any).lastAutoTable.finalY + 15);
    const txSample = transactions
      .slice(-50)
      .map((t) => [
        t.type.toUpperCase(),
        t.amount.toString(),
        t.status,
        new Date(t.created_at).toLocaleDateString(),
      ]);

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 20,
      head: [["Type", "Amount", "Status", "Date"]],
      body: txSample,
      theme: "striped",
      headStyles: { fillColor: [71, 85, 105] },
    });

    doc.save(`MarysThrift_Report_${dateRange.from}_to_${dateRange.to}.pdf`);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 py-4 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Analytics & Reports
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Deep dive into platform data, historical trends, and exports.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl p-1.5 shadow-sm">
            <div className="relative">
              <CalendarIcon className="size-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="date"
                value={dateRange.from}
                onChange={(e) => setDateRange((prev) => ({ ...prev, from: e.target.value }))}
                className="pl-9 pr-3 py-1.5 text-sm font-semibold text-slate-700 outline-none rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
              />
            </div>
            <span className="text-slate-300 font-bold">to</span>
            <div className="relative">
              <CalendarIcon className="size-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="date"
                value={dateRange.to}
                onChange={(e) => setDateRange((prev) => ({ ...prev, to: e.target.value }))}
                className="pl-9 pr-3 py-1.5 text-sm font-semibold text-slate-700 outline-none rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
              />
            </div>
            <Button
              size="sm"
              onClick={fetchAnalyticsData}
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg h-8 ml-1 px-4"
              disabled={loading}
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : "Apply"}
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="rounded-xl border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-sm h-[48px] px-4 flex items-center gap-2"
              onClick={exportToPDF}
              disabled={loading || transactions.length === 0}
            >
              <FileText className="size-4 text-red-500" />
              <span className="font-bold">PDF</span>
            </Button>
            <Button
              variant="outline"
              className="rounded-xl border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-sm h-[48px] px-4 flex items-center gap-2"
              onClick={exportToExcel}
              disabled={loading || transactions.length === 0}
            >
              <Download className="size-4 text-emerald-600" />
              <span className="font-bold">Excel</span>
            </Button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
          <Loader2 className="size-10 animate-spin text-emerald-500" />
          <p className="text-sm font-bold text-slate-400 tracking-widest uppercase">
            Crunching Data...
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Revenue Chart */}
          <Card className="border border-slate-200/60 bg-white shadow-sm rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-50 flex items-center gap-2">
              <Activity className="size-5 text-emerald-500" />
              <h3 className="text-lg font-bold text-slate-900">
                Revenue Flow (Deposits vs Withdrawals)
              </h3>
            </div>
            <div className="p-6 h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData}>
                  <defs>
                    <linearGradient id="depGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="witGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: "#64748b" }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: "#64748b" }}
                    tickFormatter={(val) => `₦${val / 1000}k`}
                  />
                  <Tooltip
                    content={<CustomTooltip />}
                    cursor={{ stroke: "#94a3b8", strokeWidth: 1, strokeDasharray: "4 4" }}
                  />
                  <Legend verticalAlign="top" height={36} iconType="circle" />
                  <Area
                    type="monotone"
                    dataKey="deposits"
                    name="Deposits"
                    stroke="#10b981"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#depGrad)"
                    activeDot={{ r: 6, fill: "#10b981", stroke: "#fff", strokeWidth: 2 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="withdrawals"
                    name="Withdrawals"
                    stroke="#f43f5e"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#witGrad)"
                    activeDot={{ r: 6, fill: "#ef4444", stroke: "#fff", strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Loans Chart */}
            <Card className="border border-slate-200/60 bg-white shadow-sm rounded-2xl overflow-hidden">
              <div className="p-6 border-b border-slate-50 flex items-center gap-2">
                <PieChart className="size-5 text-blue-500" />
                <h3 className="text-lg font-bold text-slate-900">Loan Lifecycle</h3>
              </div>
              <div className="p-6 h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={loanData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="date"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fill: "#64748b" }}
                      dy={10}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fill: "#64748b" }}
                      tickFormatter={(val) => `₦${val / 1000}k`}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f8fafc" }} />
                    <Legend
                      iconType="circle"
                      wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }}
                    />
                    <Bar
                      dataKey="disbursements"
                      name="Disbursements"
                      fill="#3b82f6"
                      radius={[4, 4, 0, 0]}
                      barSize={20}
                    />
                    <Bar
                      dataKey="settlements"
                      name="Settlements"
                      fill="#10b981"
                      radius={[4, 4, 0, 0]}
                      barSize={20}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* User Activity Chart */}
            <Card className="border border-slate-200/60 bg-white shadow-sm rounded-2xl overflow-hidden">
              <div className="p-6 border-b border-slate-50 flex items-center gap-2">
                <Users className="size-5 text-indigo-500" />
                <h3 className="text-lg font-bold text-slate-900">Platform Growth</h3>
              </div>
              <div className="p-6 h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={userActivityData}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="date"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fill: "#64748b" }}
                      dy={10}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fill: "#64748b" }}
                    />
                    <Tooltip
                      content={<CustomTooltip />}
                      cursor={{ stroke: "#94a3b8", strokeWidth: 1, strokeDasharray: "4 4" }}
                    />
                    <Legend
                      iconType="circle"
                      wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }}
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
      )}
    </div>
  );
}
