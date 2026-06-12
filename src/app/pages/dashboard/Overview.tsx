import { useEffect, useState } from "react";

import {
  ArrowUpRight,
  ArrowDownLeft,
  Wallet,
  PiggyBank,
  CreditCard,
  ArrowRightLeft,
} from "lucide-react";
import { Link } from "react-router-dom";

import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { useAuth } from "@/app/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { calculateBalance } from "@/lib/walletUtils";

export function Overview() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);

  // Stats
  const [generalBalance, setGeneralBalance] = useState(0);
  const [withdrawableBalance, setWithdrawableBalance] = useState(0);
  const [activePlansCount, setActivePlansCount] = useState(0);
  const [outstandingLoans, setOutstandingLoans] = useState(0);
  const [totalSavedAmount, setTotalSavedAmount] = useState(0);

  // Lists
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [userPlans, setUserPlans] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);

  async function fetchDashboardData() {
    setLoading(true);
    try {
      // 1. Fetch Transactions (With plan details for filtering)
      const { data: txData } = await supabase
        .from("transactions")
        .select("*, plan:plans(type, name)")
        .eq("user_id", user?.id)
        .eq("status", "completed")
        .order("created_at", { ascending: false });

      if (txData) {
        // Calculate General Balance (No plan_id)
        const gBal = calculateBalance(txData as any, null);
        setGeneralBalance(gBal);

        // Calculate Withdrawable Balance (Specific plan type)
        const wBal = calculateBalance(txData as any, null, "withdrawable_wallet");
        setWithdrawableBalance(wBal);

        setRecentTransactions(txData.slice(0, 10));
      }

      // 2. Fetch User Plans
      const { data: plans } = await supabase
        .from("user_plans")
        .select("*, plan:plans(*)")
        .eq("user_id", user?.id)
        .eq("status", "active");

      if (plans) {
        setUserPlans(plans);
        // Calculate Total Plans Balance
        setActivePlansCount(plans.length);
        const totalSaved = plans.reduce((acc, plan) => acc + (plan.current_balance || 0), 0);
        setTotalSavedAmount(totalSaved);
      }

      // 3. Fetch Loans
      const { data: loans } = await supabase
        .from("loans")
        .select("*")
        .eq("user_id", user?.id)
        .eq("status", "active");

      if (loans) {
        const oLoans = loans.reduce((acc, l) => acc + (l.remaining_balance || 0), 0);
        setOutstandingLoans(oLoans);
      }

      // 5. Fetch Profile
      const { data: prof } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user?.id)
        .single();
      if (prof) setProfile(prof);
    } catch (error) {
      console.error("Error fetching overview data:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user?.id) {
      Promise.resolve().then(() => fetchDashboardData());
    } else {
      Promise.resolve().then(() => setLoading(false));
    }
  }, [user?.id]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "decimal",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const toTitleCase = (str: string) => {
    if (!str) return "User";
    return str
      .toLowerCase()
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const firstName = profile?.full_name
    ? toTitleCase(profile.full_name.split(" ")[0])
    : user?.email
      ? toTitleCase(user.email.split("@")[0])
      : "User";

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
          <Button variant="outline" size="sm" asChild className="dark:text-white border-2">
            <Link to="/dashboard/plans?tab=compare">Compare Plans</Link>
          </Button>
          <Button
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 text-white border-2 border-emerald-500"
            asChild
          >
            <Link to="/dashboard/plans">Start Savings</Link>
          </Button>
        </div>
      </div>

      {/* Central Balance Card - Minimalist & Simple Design */}
      <Card className="overflow-hidden border shadow-sm dark:bg-slate-900/20">
        <CardContent className="p-0 !pb-0 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x dark:divide-white/5">
            {/* General Wallet */}
            <div className="p-6 space-y-3 hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-all duration-200">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
                <div className="p-1.5 bg-emerald-100 dark:bg-emerald-500/10 rounded-md">
                  <Wallet className="size-4" />
                </div>
                General Wallet
              </div>
              <div className="space-y-1">
                <div className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                  ₦{formatCurrency(generalBalance)}
                </div>
                <p className="text-[10px] text-gray-500 font-medium">
                  Available for plan contributions
                </p>
              </div>
            </div>

            {/* Withdrawable Wallet */}
            <div className="p-6 space-y-3 hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-all duration-200">
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 text-[10px] font-bold uppercase tracking-wider">
                <div className="p-1.5 bg-blue-100 dark:bg-blue-500/10 rounded-md">
                  <ArrowRightLeft className="size-4" />
                </div>
                Withdrawable Wallet
              </div>
              <div className="space-y-1">
                <div className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                  ₦{formatCurrency(withdrawableBalance)}
                </div>
                <p className="text-[10px] text-gray-500 font-medium">Payouts & matured funds</p>
              </div>
            </div>

            {/* Outstanding Loans */}
            <div className="p-6 space-y-3 hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-all duration-200">
              <div
                className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider ${outstandingLoans > 0 ? "text-amber-600 dark:text-amber-400" : "text-gray-500"}`}
              >
                <div
                  className={`p-1.5 rounded-md ${outstandingLoans > 0 ? "bg-amber-100 dark:bg-amber-500/10" : "bg-gray-100 dark:bg-white/5"}`}
                >
                  <CreditCard className="size-4" />
                </div>
                Outstanding Loans
              </div>
              <div className="space-y-1">
                <div
                  className={`text-2xl font-bold tracking-tight ${outstandingLoans > 0 ? "text-amber-600 dark:text-amber-400" : "text-gray-400 dark:text-white/20"}`}
                >
                  ₦{formatCurrency(outstandingLoans)}
                </div>
                <p className="text-[10px] text-gray-500 font-medium">
                  {outstandingLoans > 0 ? "Repayment active" : "No active loans"}
                </p>
              </div>
            </div>

            {/* Total Saved Amount */}
            <div className="p-6 space-y-3 hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-all duration-200">
              <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 text-[10px] font-bold uppercase tracking-wider">
                <div className="p-1.5 bg-purple-100 dark:bg-purple-500/10 rounded-md">
                  <PiggyBank className="size-4" />
                </div>
                Total Saved Amount
              </div>
              <div className="space-y-1">
                <div className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                  ₦{formatCurrency(totalSavedAmount)}
                </div>
                <p className="text-[10px] text-gray-500 font-medium">
                  Across {activePlansCount} active plans
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
              <Badge
                variant="secondary"
                className="ml-2 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-none font-bold"
              >
                {activePlansCount} Active
              </Badge>
            </div>
            <Button variant="ghost" size="sm" asChild className="text-xs dark:text-white">
              <Link to="/dashboard/plans">View All</Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0 !pb-0">
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
                      <th className="px-6 py-3">Progress</th>
                      <th className="px-6 py-3 text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y dark:divide-gray-700">
                    {userPlans.map((plan) => (
                      <tr
                        key={plan.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div>
                            <span className="font-semibold text-gray-900 dark:text-white block">
                              {plan.plan?.name}
                            </span>
                            <span className="text-[10px] text-gray-400 uppercase">
                              {plan.plan?.type.replace("_", " ")}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-500 dark:text-gray-400">
                          {new Date(plan.start_date).toLocaleDateString(undefined, {
                            dateStyle: "medium",
                          })}
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 capitalize">
                            {plan.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            {(() => {
                              const meta = plan.plan_metadata || {};
                              let current = 0;
                              let total = 0;
                              let unit = "Days";

                              if (plan.plan?.type === "daily_drop") {
                                current = meta.total_days_paid || 0;
                                total = meta.selected_duration || 31;
                                unit = "Days";
                              } else if (plan.plan?.type === "step_up") {
                                current = meta.weeks_completed || 0;
                                total = meta.selected_duration || 52;
                                unit = "Weeks";
                              } else if (plan.plan?.type === "monthly_bloom") {
                                current = meta.months_completed || 0;
                                total = meta.selected_duration || 12;
                                unit = "Months";
                              } else if (plan.plan?.type === "ajo_circle") {
                                current = meta.current_cycle_paid || 0;
                                total = plan.plan?.duration_weeks || 10;
                                unit = "Weeks";
                              } else {
                                current = meta.weeks_completed || 0;
                                total = plan.plan?.duration_weeks || 0;
                                unit = "Weeks";
                              }

                              if (total === -1)
                                return (
                                  <span className="text-xs font-bold text-gray-500 italic">
                                    Continuous
                                  </span>
                                );
                              const percent =
                                total > 0 ? Math.min((current / total) * 100, 100) : 0;

                              return (
                                <>
                                  <div className="text-[10px] font-bold text-gray-900 dark:text-gray-100 flex justify-between gap-2">
                                    <span>
                                      {current} / {total} {unit}
                                    </span>
                                    <span>{Math.round(percent)}%</span>
                                  </div>
                                  <div className="w-24 h-1 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                                      style={{ width: `${percent}%` }}
                                    />
                                  </div>
                                </>
                              );
                            })()}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="font-bold text-gray-900 dark:text-white">
                            ₦{formatCurrency(plan.current_balance)}
                          </div>
                          {(() => {
                            const isActivated =
                              (plan.status || "").toLowerCase().trim() === "active" ||
                              Number(plan.current_balance || 0) > 0 ||
                              plan.plan_metadata?.total_days_paid > 0 ||
                              plan.plan_metadata?.is_setup_fee_paid === true;

                            const hasPaidSetup = plan.plan?.type === "daily_drop" && isActivated;
                            const serviceCharge = Number(plan.plan?.service_charge || 0);

                            if (hasPaidSetup) {
                              return (
                                <div className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider">
                                  Setup Paid
                                </div>
                              );
                            } else if (serviceCharge > 0 && !isActivated) {
                              return (
                                <div className="text-[10px] text-red-500">
                                  ₦{formatCurrency(serviceCharge)} Service Fee
                                </div>
                              );
                            } else if (isActivated) {
                              return (
                                <div className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">
                                  PAID
                                </div>
                              );
                            }
                            return <div className="text-[10px] text-gray-400">---</div>;
                          })()}
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
              <CardTitle className="text-lg dark:text-white">
                Recent Approved Transactions
              </CardTitle>
            </div>
            <Button variant="ghost" size="sm" asChild className="text-xs dark:text-white">
              <Link to="/dashboard/wallet">View Statement</Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0 !pb-0">
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
                      const isPositive = [
                        "deposit",
                        "loan_disbursement",
                        "interest",
                        "limit_transfer",
                        "payout",
                        "maturity_payout",
                      ].includes(tx.type);
                      const Icon = isPositive ? ArrowUpRight : ArrowDownLeft;
                      const colorClass = isPositive ? "text-emerald-600" : "text-gray-600";
                      const bgClass = isPositive
                        ? "bg-emerald-100 dark:bg-emerald-900/20"
                        : "bg-gray-100 dark:bg-gray-700";

                      return (
                        <tr
                          key={tx.id}
                          className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-full ${bgClass} ${colorClass}`}>
                                <Icon className="size-4" />
                              </div>
                              <div>
                                <p className="font-semibold text-gray-900 dark:text-white capitalize leading-tight">
                                  {tx.type.replace("_", " ")}
                                </p>
                                <p className="text-[10px] text-gray-400 font-mono">
                                  {tx.id.substring(0, 8)}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                            {tx.plan?.name || (tx.plan_id ? "Savings Plan" : "Main Wallet")}
                          </td>
                          <td className="px-6 py-4 text-gray-500 dark:text-gray-400 text-xs text-gray-900 dark:text-white">
                            {new Date(tx.created_at).toLocaleString(undefined, {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })}
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 capitalize">
                              {tx.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span
                              className={`font-bold text-sm ${isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-gray-900 dark:text-white"}`}
                            >
                              {isPositive ? "+" : "-"}₦{formatCurrency(tx.amount)}
                            </span>
                            {tx.charge > 0 && (
                              <p className="text-[10px] text-gray-400">Fee: ₦{tx.charge}</p>
                            )}
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
