import { useEffect, useState, useMemo } from "react";

import { ArrowDownLeft, ArrowUpRight, Filter, Milestone, Wallet as WalletIcon, Eye, EyeOff } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import { DepositModal } from "@/app/components/DepositModal";
import { LoanRepaymentDialog } from "@/app/components/LoanRepaymentDialog";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/app/components/ui/dialog";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { TransactionDetailsModal } from "@/app/components/wallet/TransactionDetailsModal";
import { useAuth } from "@/app/context/AuthContext";
import { useBalanceReveal } from "@/app/context/BalanceRevealContext";
import { notificationDispatcher } from "@/lib/notificationDispatcher";
import { checkAndProcessMaturity } from "@/lib/planUtils";
import { supabase } from "@/lib/supabase";
import { formatNaira, formatCurrency } from "@/lib/utils";
import { numberToWords } from "@/lib/numberToWords";
import { calculateBalance, deduplicateTransactions } from "@/lib/walletUtils";

interface Plan {
  id: string;
  name: string;
  description: string;
  service_charge: number;
  duration_weeks: number;
  min_amount: number;
  contribution_type: "fixed" | "flexible";
  fixed_amount: number;
  whatsapp_link?: string;
  start_date?: string;
  type: string;
}

interface UserPlan {
  id: string;
  plan: Plan;
  current_balance: number;
  status: string;
  start_date: string;
  plan_metadata?: any;
}

export function Wallet() {
  const { user } = useAuth();
  const { isBalanceHidden, toggleBalanceReveal } = useBalanceReveal();
  const [generalBalance, setGeneralBalance] = useState(0);
  const [withdrawableWalletBalance, setWithdrawableWalletBalance] = useState(0);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [allPlans, setAllPlans] = useState<any[]>([]);
  const [userPlans, setUserPlans] = useState<UserPlan[]>([]);
  // Bank Accounts State
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [selectedBankId, setSelectedBankId] = useState<string>("");
  const [pendingArrears, setPendingArrears] = useState<{ total: number; count: number }>({
    total: 0,
    count: 0,
  });

  const [selectedPlanFilter, setSelectedPlanFilter] = useState<string>(() => {
    return new URLSearchParams(window.location.search).get("planId") || "all";
  });

  // Transaction Form State
  const [amount, setAmount] = useState("");
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"deposit" | "withdrawal">("deposit");
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");
  const [withdrawalTargetPlanId, setWithdrawalTargetPlanId] = useState<string>("");

  // Details Modal State
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  // Withdrawal State
  const [uploading, setUploading] = useState(false);

  // Loan State
  const [activeLoan, setActiveLoan] = useState<any>(null);
  const [showLoanDialog, setShowLoanDialog] = useState(false);
  const [pendingWithdrawalParams, setPendingWithdrawalParams] = useState<{
    target: "bank" | "wallet" | "plan";
    amount: number;
  } | null>(null);
  const [withdrawalsEnabled, setWithdrawalsEnabled] = useState(true);
  const [isAdvanceMode, setIsAdvanceMode] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // URL Params for filtering
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const planId = searchParams.get("planId");
    if (planId && planId !== selectedPlanFilter) {
      Promise.resolve().then(() => setSelectedPlanFilter(planId));
    }
  }, [searchParams, selectedPlanFilter]);

  useEffect(() => {
    if (user) {
      Promise.resolve().then(() => {
        fetchWalletData();
        fetchPlansData();
        fetchActiveLoan();
        fetchBankAccounts();
        fetchPendingArrears();
        fetchUserPlans();
        fetchGlobalSettings();
      });
    }
  }, [user]);

  async function fetchPendingArrears() {
    if (!user) return;
    const { data, error } = await supabase
      .from("unpaid_arrears")
      .select("amount, penalty_fee")
      .eq("user_id", user.id)
      .eq("status", "unpaid");

    if (!error && data) {
      const total = data.reduce((acc, curr) => acc + (curr.amount + curr.penalty_fee), 0);
      setPendingArrears({ total, count: data.length });
    }
  }

  async function fetchGlobalSettings() {
    const { data } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "general")
      .single();
    if (data?.value?.withdrawals_enabled !== undefined) {
      setWithdrawalsEnabled(data.value.withdrawals_enabled);
    }
  }

  async function fetchActiveLoan() {
    if (!user) return;
    const { data } = await supabase
      .from("loans")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();

    if (data) setActiveLoan(data);
    else setActiveLoan(null);
  }

  async function fetchUserPlans() {
    const { data, error } = await supabase
      .from("user_plans")
      .select(
        `
                *,
                plan:plans(*)
            `,
      )
      .eq("user_id", user?.id)
      .in("status", ["active", "matured"]);

    if (!error && data) {
      setUserPlans(data);
      await checkAndProcessMaturity(supabase, data);
    }
  }

  const filteredTransactions = useMemo(() => {
    let result = transactions;
    if (selectedPlanFilter === "all") {
      const activePlanIds = userPlans.filter((p) => p.status === "active").map((p) => p.plan.id);
      result = transactions.filter(
        (tx) =>
          !tx.plan_id ||
          tx.plan?.type === "withdrawable_wallet" ||
          activePlanIds.includes(tx.plan_id),
      );
      result = deduplicateTransactions(result);
    } else if (selectedPlanFilter === "general") {
      result = transactions.filter((tx) => !tx.plan_id);
    } else if (selectedPlanFilter === "withdrawable") {
      result = transactions.filter((tx) => tx.plan?.type === "withdrawable_wallet");
    } else {
      result = transactions.filter((tx) => tx.plan_id === selectedPlanFilter);
    }

    return result.filter(
      (tx) =>
        tx.type !== "system_credit" &&
        tx.type !== "System_Credit" &&
        tx.description !== "System_Credit",
    );
  }, [selectedPlanFilter, transactions, userPlans]);


  async function fetchPlansData() {
    const { data: plansData } = await supabase.from("plans").select("*").eq("is_active", true);
    if (plansData) setAllPlans(plansData);
  }

  async function fetchBankAccounts() {
    const { data } = await supabase
      .from("bank_accounts")
      .select("*")
      .eq("user_id", user?.id)
      .order("created_at", { ascending: false });

    if (data) setBankAccounts(data);
  }

  async function fetchWalletData() {
    const { data } = await supabase
      .from("transactions")
      .select(
        `
                *,
                plan:plans(name, type)
            `,
      )
      .eq("user_id", user?.id)
      .order("created_at", { ascending: false });

    if (data) {
      setTransactions(data);
      // Calculate General Wallet balance (plan_id is null)
      const gBal = calculateBalance(data as any, null);
      setGeneralBalance(gBal);

      // Calculate Withdrawable Wallet (System Plan) balance
      const wBal = calculateBalance(data as any, null, "withdrawable_wallet");
      setWithdrawableWalletBalance(wBal);
    }
  }

  const maturedPlansBalance = useMemo(() => {
    if (userPlans.length > 0) {
      return userPlans
        .filter((p) => p.status === "matured" && p.plan?.type !== "withdrawable_wallet")
        .reduce((acc, curr) => acc + (curr.current_balance || 0), 0);
    }
    return 0;
  }, [userPlans]);

  const totalWithdrawable = withdrawableWalletBalance + maturedPlansBalance;

  async function performWithdrawal(target: "bank" | "wallet" | "plan") {
    if (!amount) return;

    // Block global withdrawals (only if target is NOT plan funding - usually funding plans is always allowed)
    // But if "withdrawals_enabled" means ALL entry out, then block.
    // Let's assume it blocks Bank and Wallet withdrawals only.
    if (!withdrawalsEnabled && target !== "plan") {
      toast.error("Withdrawals are currently disabled by the administrator.");
      return;
    }

    const finalAmount = parseFloat(amount);
    if (isNaN(finalAmount) || finalAmount <= 0) {
      toast.error("Please enter a valid amount greater than 0");
      return;
    }

    if (finalAmount % 50 !== 0) {
      toast.error("Amount must be a whole value in multiples of 50 (e.g. 1000, 1500, 50, 100)");
      return;
    }
    if (target === "bank" && finalAmount < 1000) {
      toast.error("Minimum withdrawal to bank is ₦1,000");
      return;
    }
    if (finalAmount > totalWithdrawable) {
      toast.error("Insufficient withdrawable funds");
      return;
    }

    if (target === "bank" && !selectedBankId) {
      toast.error("Please select a bank account");
      return;
    }
    if (target === "plan" && !withdrawalTargetPlanId) {
      toast.error("Please select a target plan");
      return;
    }

    // Compliance Check for Plan Funding
    if (target === "plan") {
      const targetUserPlan = userPlans.find((p) => p.id === withdrawalTargetPlanId);
      if (targetUserPlan) {
        const planType = targetUserPlan.plan?.type;
        const meta = targetUserPlan.plan_metadata || {};
        let mandated = 0;

        if (
          planType === "ajo_circle" ||
          planType === "step_up" ||
          planType === "daily_drop" ||
          targetUserPlan.plan?.contribution_type === "fixed"
        ) {
          mandated = meta?.fixed_amount || targetUserPlan.plan?.fixed_amount || 0;
        } else if (["marathon", "sprint", "anchor"].includes(planType)) {
          const currentWeekTotal = meta.current_week_total || 0;
          if (currentWeekTotal < 3000) mandated = 3000 - currentWeekTotal;
        } else if (planType === "monthly_bloom") {
          const currentMonthTotal = meta.current_month_total || 0;
          if (currentMonthTotal < 20000) mandated = 20000 - currentMonthTotal;
        }

        const isFlexibleGoalPlan = ["marathon", "sprint", "anchor", "monthly_bloom"].includes(
          planType,
        );
        const effectiveMin = isFlexibleGoalPlan && mandated === 0 ? 1 : mandated;

        if (finalAmount < effectiveMin) {
          toast.error(
            mandated > 0
              ? `Transfer must be at least ₦${formatCurrency(mandated)} to meet the goal.`
              : `Minimum transfer for this plan is ₦${formatCurrency(effectiveMin)}`,
          );
          return;
        }
      }
    }

    // STRICT LOAN CHECK
    if (activeLoan) {
      setPendingWithdrawalParams({ target, amount: finalAmount });
      setShowLoanDialog(true);
      return;
    }

    // Standard
    await executeStandardWithdrawal(target, finalAmount);
  }

  async function executeStandardWithdrawal(
    target: "bank" | "wallet" | "plan",
    finalAmount: number,
  ) {
    setUploading(true);
    try {
      const { data, error } = await supabase.rpc("move_matured_funds", {
        p_amount: finalAmount,
        p_target_type: target,
        p_target_user_plan_id: target === "plan" ? withdrawalTargetPlanId : null,
      });

      if (error) throw error;

      if (data?.success) {
        if (target === "bank") {
          toast.info("Withdrawal request submitted for Admin Approval.");

          if (user?.email) {
            await notificationDispatcher.sendAlert({
              userId: user.id,
              email: user.email,
              type: "transaction",
              title: "Withdrawal Request Submitted",
              message: `Your request to withdraw ₦${formatCurrency(finalAmount)} to your bank account has been submitted and is pending admin approval.`,
            });
          }
        } else {
          toast.success("Transaction processed successfully!");

          if (user?.email) {
            const planName = target === "wallet" ? "General Wallet" : "Savings Plan";
            await notificationDispatcher.sendAlert({
              userId: user.id,
              email: user.email,
              type: "transaction",
              title: "Funds Transferred Successfully",
              message: `You have successfully transferred ₦${formatCurrency(finalAmount)} from your matured plans to your ${planName}.`,
            });
          }
        }
      }
    } catch (error: any) {
      console.error("Withdrawal Error:", error);
      toast.error(error.message || "Failed to process transaction.");
    } finally {
      setOpen(false);
      setAmount("");
      setPendingWithdrawalParams(null);
      setShowLoanDialog(false);
      setUploading(false);
      fetchWalletData();
      fetchUserPlans();
      fetchActiveLoan();
    }
  }

  async function handlePayLoan() {
    if (!activeLoan || !pendingWithdrawalParams) return;
    setUploading(true);

    const withdrawalAmount = pendingWithdrawalParams.amount;
    const loanDebt = activeLoan.total_payable || 0;

    const amountToLoan = Math.min(withdrawalAmount, loanDebt);
    const amountToUser = Math.max(0, withdrawalAmount - loanDebt);

    const linkId = crypto.randomUUID();
    let currentLoanAllocation = amountToLoan;
    let remainingToDeduct = withdrawalAmount;

    const maturedPlans = userPlans.filter((p) => p.status === "matured" && p.current_balance > 0);
    maturedPlans.sort(
      (a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime(),
    );

    for (const plan of maturedPlans) {
      if (remainingToDeduct <= 0) break;
      const deduction = Math.min(plan.current_balance, remainingToDeduct);
      const loanContribution = Math.min(deduction, currentLoanAllocation);

      const newBalance = plan.current_balance - deduction;
      const updates: any = { current_balance: newBalance };
      if (newBalance === 0) updates.status = "completed";
      await supabase.from("user_plans").update(updates).eq("id", plan.id);

      // DOUBLE ENTRY: 1. Debit Plan (The Withdrawal/Outflow)
      await supabase.from("transactions").insert({
        user_id: user?.id,
        amount: deduction,
        type: "withdrawal",
        status: "completed",
        description: `Auto-Allocation: Loan Repayment & Withdrawal`,
        plan_id: plan.plan.id,
        related_id: linkId,
      });

      // DOUBLE ENTRY: 2. Credit Loan (The Repayment Record - attached to plan to keep wallet clean)
      if (loanContribution > 0) {
        await supabase.from("transactions").insert({
          user_id: user?.id,
          amount: loanContribution,
          type: "loan_repayment",
          status: "completed",
          description: `Repayment for ${activeLoan.loan_number || "Loan"} (from ${plan.plan.name})`,
          plan_id: plan.plan.id, // KEEPING IT ON PLAN TO PREVENT GENERAL WALLET DEBIT
          loan_id: activeLoan.id,
          related_id: linkId,
        });
        currentLoanAllocation -= loanContribution;
      }

      remainingToDeduct -= deduction;
    }

    const newLoanBalance = loanDebt - amountToLoan;
    const loanUpdates: any = { total_payable: newLoanBalance };
    if (newLoanBalance <= 0) loanUpdates.status = "paid";

    await supabase.from("loans").update(loanUpdates).eq("id", activeLoan.id);

    if (amountToUser > 0) {
      const target = pendingWithdrawalParams.target;
      if (target === "wallet") {
        await supabase.from("transactions").insert({
          user_id: user?.id,
          amount: amountToUser,
          type: "transfer",
          status: "completed",
          description: `Balance after Loan Repayment`,
          plan_id: null,
        });
      } else if (target === "bank") {
        await supabase.from("transactions").insert({
          user_id: user?.id,
          amount: amountToUser,
          type: "withdrawal",
          status: "pending", // FORCE PENDING
          description: `Withdrawal to Bank (Post-Loan Clear)`,
          plan_id: null,
        });
      }
    }

    toast.success(
      `Loan Repayment Processed! ${amountToUser > 0 ? `₦${amountToUser} withdrawn.` : ""}`,
    );

    // Trigger notification for loan payment from matured plans
    if (user?.email) {
      await notificationDispatcher.sendAlert({
        userId: user.id,
        email: user.email,
        type: "loan",
        title: "Loan Payment Processed",
        message: `An auto-allocation of ₦${formatCurrency(amountToLoan)} from your matured plan has been successfully applied to your loan (${activeLoan.loan_number}). Remaining loan debt is ₦${formatCurrency(newLoanBalance)}.`,
      });
    }

    setOpen(false);
    setAmount("");
    setPendingWithdrawalParams(null);
    setShowLoanDialog(false);
    setUploading(false);
    fetchWalletData();
    fetchUserPlans();
    fetchActiveLoan();
  }

  async function handleRequestRestricted() {
    if (!pendingWithdrawalParams) return;
    await executeStandardWithdrawal(pendingWithdrawalParams.target, pendingWithdrawalParams.amount);
  }

  const renderWithdrawalDialog = () => (
    <DialogContent className="dark:bg-gray-900 dark:border-gray-800 max-w-md max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="capitalize dark:text-white">Manage Matured Funds</DialogTitle>
        <DialogDescription className="dark:text-gray-400">
          Withdraw or transfer funds from your matured plans.
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-4 py-4">
        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg flex justify-between items-center mb-2">
          <span className="text-sm text-gray-500 dark:text-gray-400">Available to Withdraw</span>
          <span className="font-bold dark:text-white">₦{formatCurrency(totalWithdrawable)}</span>
        </div>

        <Tabs defaultValue="bank" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="bank">To Bank</TabsTrigger>
            <TabsTrigger value="wallet">To Wallet</TabsTrigger>
            <TabsTrigger value="plan">To Plan</TabsTrigger>
          </TabsList>

          <TabsContent value="bank" className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="bank_amount" className="dark:text-gray-300">
                Amount
              </Label>
              <Input
                id="bank_amount"
                type="number"
                step="50"
                onKeyDown={(e) => {
                  if (["-", "+", ".", "e", "E"].includes(e.key)) e.preventDefault();
                }}
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                max={totalWithdrawable}
                className="dark:bg-gray-800 dark:border-gray-700 dark:text-white"
              />
              {amount && parseFloat(amount) > 0 && (
                <p className="text-[10px] text-emerald-600 font-medium italic mt-1">
                  In Words: {numberToWords(parseFloat(amount))}
                </p>
              )}
              {amount && parseFloat(amount) > 0 && parseFloat(amount) < 1000 && (
                <p className="text-[10px] text-red-500 font-medium mt-1">
                  Minimum withdrawal to bank is ₦1,000
                </p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="bank_account" className="dark:text-gray-300">
                Select Bank Account
              </Label>
              {bankAccounts.length === 0 ? (
                <div className="text-center p-4 border rounded-md border-dashed bg-gray-50 dark:bg-gray-800 dark:border-gray-700">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                    No saved bank accounts.
                  </p>
                  <Link to="/dashboard/profile">
                    <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
                      <Milestone className="w-3 h-3 mr-1" /> Go to Profile
                    </Button>
                  </Link>
                </div>
              ) : (
                <select
                  id="bank_account"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                  value={selectedBankId}
                  onChange={(e) => setSelectedBankId(e.target.value)}
                >
                  <option value="">Select an account</option>
                  {bankAccounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.bank_name} - {account.account_number}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <Button
              onClick={() => performWithdrawal("bank")}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={
                uploading ||
                !amount ||
                !selectedBankId ||
                parseFloat(amount) > totalWithdrawable ||
                totalWithdrawable <= 0
              }
            >
              {uploading ? "Processing..." : "Withdraw to Bank"}
            </Button>
          </TabsContent>

          <TabsContent value="wallet" className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="wallet_amount" className="dark:text-gray-300">
                Amount to Transfer
              </Label>
              <Input
                id="wallet_amount"
                type="number"
                step="50"
                onKeyDown={(e) => {
                  if (["-", "+", ".", "e", "E"].includes(e.key)) e.preventDefault();
                }}
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                max={totalWithdrawable}
                className="dark:bg-gray-800 dark:border-gray-700 dark:text-white"
              />
              {amount && parseFloat(amount) > 0 && (
                <p className="text-[10px] text-emerald-600 font-medium italic mt-1">
                  In Words: {numberToWords(parseFloat(amount))}
                </p>
              )}
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Funds will be moved to your General Wallet.
              </p>
            </div>
            <Button
              onClick={() => performWithdrawal("wallet")}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              disabled={
                uploading ||
                !amount ||
                parseFloat(amount) > totalWithdrawable ||
                totalWithdrawable <= 0
              }
            >
              {uploading ? "Processing..." : "Transfer to Wallet"}
            </Button>
          </TabsContent>

          <TabsContent value="plan" className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <Label htmlFor="advance_mode" className="text-sm font-medium cursor-pointer">
                Pay in Advance?
              </Label>
              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] font-bold ${isAdvanceMode ? "text-emerald-600" : "text-gray-400"}`}
                >
                  {isAdvanceMode ? "ON" : "OFF"}
                </span>
                <button
                  id="advance_mode"
                  onClick={() => setIsAdvanceMode(!isAdvanceMode)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${isAdvanceMode ? "bg-emerald-600" : "bg-gray-200 dark:bg-gray-700"}`}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${isAdvanceMode ? "translate-x-5" : "translate-x-0.5"}`}
                  />
                </button>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="target_plan" className="dark:text-gray-300">
                Select Target Plan
              </Label>
              <select
                id="target_plan"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                value={withdrawalTargetPlanId}
                onChange={(e) => {
                  const planId = e.target.value;
                  setWithdrawalTargetPlanId(planId);

                  // Compliance Logic: Auto-fill for strict payments
                  const targetUserPlan = userPlans.find((p) => p.id === planId);
                  if (targetUserPlan) {
                    const planType = targetUserPlan.plan?.type;
                    const meta = (targetUserPlan as any).plan_metadata || {};

                    let mandated: number = 0;

                    // 1. Strictly Fixed
                    if (
                      planType === "ajo_circle" ||
                      planType === "step_up" ||
                      planType === "daily_drop" ||
                      targetUserPlan.plan?.contribution_type === "fixed"
                    ) {
                      mandated = meta?.fixed_amount || targetUserPlan.plan?.fixed_amount || 0;
                    }
                    // 2. Flexible Weekly (Marathon, Sprint, Anchor)
                    else if (["marathon", "sprint", "anchor"].includes(planType)) {
                      const currentWeekTotal = meta.current_week_total || 0;
                      const target = 3000;
                      if (currentWeekTotal < target) {
                        mandated = target - currentWeekTotal;
                      }
                    }
                    // 3. Flexible Monthly (Monthly Bloom)
                    else if (planType === "monthly_bloom") {
                      const currentMonthTotal = meta.current_month_total || 0;
                      const target = 20000;
                      if (currentMonthTotal < target) {
                        mandated = target - currentMonthTotal;
                      }
                    }

                    if (mandated > 0) {
                      setAmount(mandated.toString());
                    }
                  }
                }}
              >
                <option value="">Select a plan...</option>
                {userPlans
                  .filter((p) => p.status === "active" || p.status === "pending_activation")
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.plan.name}
                    </option>
                  ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="plan_amount" className="dark:text-gray-300">
                Amount
              </Label>
              {(() => {
                const targetUserPlan = userPlans.find((p) => p.id === withdrawalTargetPlanId);
                const planType = targetUserPlan?.plan?.type;
                const meta = targetUserPlan?.plan_metadata || {};

                // Flexible Plans: Locked only if minimum not yet met
                let isLocked = false;
                let mandated = 0;

                if (
                  planType === "ajo_circle" ||
                  planType === "step_up" ||
                  targetUserPlan?.plan?.contribution_type === "fixed"
                ) {
                  isLocked = true;
                } else if (planType === "daily_drop") {
                  isLocked = true;
                } else if (["marathon", "sprint", "anchor"].includes(planType || "")) {
                  const currentWeekTotal = meta.current_week_total || 0;
                  if (currentWeekTotal < 3000) {
                    mandated = 3000 - currentWeekTotal;
                  }
                } else if (planType === "monthly_bloom") {
                  const currentMonthTotal = meta.current_month_total || 0;
                  if (currentMonthTotal < 20000) {
                    mandated = 20000 - currentMonthTotal;
                  }
                }

                // Final Locking Decision
                isLocked = isLocked || (!isAdvanceMode && mandated > 0);

                // Spread Logic Indicator
                const getPeriodsCovered = () => {
                  const amt = parseFloat(amount);
                  if (!amt || amt <= 0) return 0;
                  if (["marathon", "sprint", "anchor"].includes(planType || ""))
                    return Math.floor(amt / 3000);
                  if (planType === "monthly_bloom") return Math.floor(amt / 20000);
                  if (planType === "daily_drop") {
                    const fixedAmt = meta.fixed_amount || targetUserPlan?.plan?.fixed_amount || 0;
                    return fixedAmt > 0 ? Math.floor(amt / fixedAmt) : 0;
                  }
                  return 0;
                };
                const periods = getPeriodsCovered();
                const label =
                  planType === "monthly_bloom"
                    ? "Month"
                    : planType === "daily_drop"
                      ? "Day"
                      : "Week";

                return (
                  <div className="space-y-1">
                    <Input
                      id="plan_amount"
                      type="number"
                      step="50"
                      onKeyDown={(e) => {
                        if (["-", "+", ".", "e", "E"].includes(e.key)) e.preventDefault();
                      }}
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      max={totalWithdrawable}
                      disabled={isLocked}
                      className={`dark:bg-gray-800 dark:border-gray-700 dark:text-white disabled:opacity-70 ${!isLocked && !isAdvanceMode && amount && parseFloat(amount) < mandated ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                    />
                    {amount && parseFloat(amount) > 0 && (
                      <p className="text-[10px] text-emerald-600 font-medium italic mt-1">
                        In Words: {numberToWords(parseFloat(amount))}
                      </p>
                    )}
                    {isAdvanceMode && periods > 0 && (
                      <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider">
                        ✨ This covers {periods} {label}
                        {periods > 1 ? "s" : ""} in advance
                      </p>
                    )}
                    {!isLocked && !isAdvanceMode && amount && parseFloat(amount) < mandated && (
                      <p className="text-[10px] text-red-500 font-medium">
                        Minimum transfer is {formatNaira(mandated)}
                      </p>
                    )}
                  </div>
                );
              })()}
            </div>
            <Button
              onClick={() => performWithdrawal("plan")}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
              disabled={
                uploading ||
                !amount ||
                !withdrawalTargetPlanId ||
                parseFloat(amount) > totalWithdrawable ||
                totalWithdrawable <= 0
              }
            >
              {uploading ? "Processing..." : "Fund Plan"}
            </Button>
          </TabsContent>
        </Tabs>
      </div>
    </DialogContent>
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-black text-gray-900 dark:text-white underline-offset-4 decoration-emerald-500/30">
          Wallet
        </h1>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 uppercase tracking-wider font-bold opacity-70">
          Efficiently manage your general funds, active plans, and withdrawals.
        </p>
      </div>

      {pendingArrears.total > 0 && (
        <Card className="bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900 shadow-sm transition-all hover:shadow-md">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <ArrowDownLeft className="size-5 animate-bounce-slow" />
              <CardTitle className="text-sm font-bold uppercase tracking-wider">
                Pending Arrears ({pendingArrears.count})
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <p className="text-2xl font-black text-red-700 dark:text-red-400 tabular-nums">
                  {isBalanceHidden ? "****" : formatNaira(pendingArrears.total)}
                </p>
                <p className="text-[10px] text-red-600/70 dark:text-red-400/70 uppercase font-black mt-1">
                  This amount (Savings + Penalties) will be auto-deducted immediately from your
                  general wallet credits.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-4 items-start">
        {/* Stats / Balances Row */}
        <div className="md:col-span-4 grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Premium General Wallet Card */}
          <Card className="bg-gradient-to-br from-gray-950 via-slate-900 to-gray-950 text-white border-none shadow-2xl overflow-hidden relative group min-h-[200px] flex flex-col justify-between">
            {/* Shimmer & Grain Texture Overlay */}
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-5 pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/0 via-emerald-500/5 to-emerald-500/0 pointer-events-none animate-pulse-slow" />

            <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-all duration-700 transform group-hover:scale-110 group-hover:-rotate-12">
              <WalletIcon className="size-32 -mr-8 -mt-8 text-emerald-500" />
            </div>

            <CardHeader className="pb-0 relative">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em] mb-1">
                    Main Wallet
                  </CardTitle>
                  <h4 className="text-sm font-bold opacity-80 uppercase tracking-tighter">
                    General Wallet
                  </h4>
                </div>
                <div className="flex items-center gap-2">
                  {/* Chip Visual */}
                  <div className="w-12 h-9 rounded-md bg-gradient-to-br from-emerald-400/30 to-emerald-600/10 border border-emerald-500/30 relative overflow-hidden flex items-center justify-center backdrop-blur-sm hidden sm:flex">
                    <div className="w-full h-[1px] absolute top-1/2 -translate-y-1/2 bg-emerald-500/20" />
                    <div className="h-full w-[1px] absolute left-1/2 -translate-x-1/2 bg-emerald-500/20" />
                    <div className="w-7 h-6 border border-emerald-500/40 rounded-sm" />
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-4 relative flex-grow">
              <div className="space-y-3">
                <div className="flex justify-start">
                  <button
                    onClick={toggleBalanceReveal}
                    className="flex items-center gap-1.5 text-[10px] font-bold text-white/50 hover:text-white transition-colors bg-white/5 px-2 py-1 rounded-md border border-white/10"
                  >
                    {isBalanceHidden ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
                    {isBalanceHidden ? "Show Balances" : "Hide Balances"}
                  </button>
                </div>
              <div className="space-y-1">
                <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest opacity-60">
                  Available Balance
                </p>
                <p className="text-3xl font-black tracking-tighter tabular-nums drop-shadow-2xl">
                  <span className="text-emerald-500 mr-1 text-2xl">₦</span>
                  {isBalanceHidden ? "****" : formatNaira(generalBalance).replace("₦", "")}
                </p>
              </div>
              </div>
            </CardContent>

            <div className="px-6 pb-6 relative">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="size-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse" />
                  <p className="text-[10px] text-emerald-400 font-black uppercase tracking-widest">
                    Active & Secure
                  </p>
                </div>
                <Dialog
                  open={open && type === "deposit"}
                  onOpenChange={(v) => {
                    if (!v) setOpen(false);
                  }}
                >
                  <DialogTrigger asChild>
                    <Button
                      onClick={() => {
                        setSelectedPlanId("");
                        setType("deposit");
                        setOpen(true);
                      }}
                      className="bg-emerald-500 hover:bg-emerald-400 text-black font-black px-8 h-12 shadow-xl rounded-2xl transition-all hover:scale-105 active:scale-95 group/btn overflow-hidden relative"
                    >
                      <span className="relative z-10 flex items-center gap-2">
                        Top Up
                        <ArrowUpRight className="size-4 transition-transform group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1" />
                      </span>
                      <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-1000" />
                    </Button>
                  </DialogTrigger>
                  <DepositModal
                    onSuccess={() => {
                      fetchWalletData();
                      fetchUserPlans();
                    }}
                    defaultPlanId={selectedPlanId}
                    onClose={() => setOpen(false)}
                  />
                </Dialog>
              </div>
            </div>
          </Card>

          {/* Glassmorphic Secondary Balance Card */}
          <Card className="bg-gray-50/50 dark:bg-gray-900/40 border border-gray-200 dark:border-emerald-500/10 shadow-none backdrop-blur-xl relative overflow-hidden group min-h-[200px] flex flex-col justify-between rounded-3xl transition-all hover:border-emerald-500/30">
            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
              <Milestone className="size-32 -mr-8 -mt-8 text-emerald-500" />
            </div>
            <CardHeader className="pb-0">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-500/10 rounded-lg">
                  <ArrowDownLeft className="size-4 text-emerald-500" />
                </div>
                <CardTitle className="text-[10px] font-black text-emerald-500 dark:text-emerald-400/60 uppercase tracking-[0.2em]">
                  Withdrawable
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-1">
                <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest opacity-60">
                  Ready to Cashout
                </p>
                <p className="text-2xl font-black text-gray-900 dark:text-emerald-100 tabular-nums tracking-tighter">
                  {isBalanceHidden ? "****" : formatNaira(totalWithdrawable)}
                </p>
              </div>
            </CardContent>
            <div className="px-6 pb-6">
              <div className="flex justify-between items-center">
                <p className="text-[9px] text-gray-400 font-bold uppercase max-w-[120px] leading-tight opacity-50">
                  Processable to your linked bank account
                </p>
                <Dialog
                  open={open && type === "withdrawal"}
                  onOpenChange={(v) => {
                    if (!v) setOpen(false);
                  }}
                >
                  <DialogTrigger asChild>
                    <Button
                      onClick={() => {
                        if (!withdrawalsEnabled) {
                          toast.error("Withdrawals are currently disabled.");
                          return;
                        }
                        setType("withdrawal");
                        setOpen(true);
                      }}
                      variant="outline"
                      className={`border-emerald-500/20 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 font-black h-11 px-6 rounded-xl transition-all hover:scale-105 active:scale-95 ${!withdrawalsEnabled ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      Withdraw
                    </Button>
                  </DialogTrigger>
                  {renderWithdrawalDialog()}
                </Dialog>
              </div>
            </div>
          </Card>

          {/* Active Savings Glassmorphic Card */}
          <Card className="bg-gray-50/50 dark:bg-gray-900/40 border border-gray-200 dark:border-white/5 shadow-none backdrop-blur-xl relative overflow-hidden group min-h-[200px] flex flex-col justify-between rounded-3xl transition-all hover:border-white/20">
            <div className="absolute -bottom-6 -right-6 p-6 opacity-[0.02] group-hover:opacity-10 transition-opacity pointer-events-none">
              <Filter className="size-48 text-white" />
            </div>
            <CardHeader className="pb-0 relative z-10">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Milestone className="size-4 text-blue-500" />
                </div>
                <CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                  Active Savings
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-1">
                <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest opacity-60">
                  Portfolio Value
                </p>
                <p className="text-2xl font-black text-gray-900 dark:text-white tabular-nums tracking-tighter">
                  {isBalanceHidden
                    ? "****"
                    : formatNaira(
                        userPlans
                          .filter((p) => p.status === "active")
                          .reduce((acc, p) => acc + (p.current_balance || 0), 0),
                      )}
                </p>
              </div>
            </CardContent>
            <div className="px-6 pb-6">
              <div className="flex justify-between items-center">
                <p className="text-[9px] text-gray-400 font-bold uppercase max-w-[120px] leading-tight opacity-50">
                  Total assets across all your active plans
                </p>
                <Button
                  asChild
                  variant="ghost"
                  className="text-[10px] h-11 px-6 font-black uppercase tracking-widest text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/10 transition-all border border-transparent hover:border-emerald-500/20 rounded-xl relative z-10"
                >
                  <Link to="/dashboard/plans?tab=my-plans">
                    View Plans
                  </Link>
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Transaction History (Full width) */}
        <div className="md:col-span-4 mt-6">
          <Card className="dark:bg-gray-900 dark:border-gray-800 border-gray-100 shadow-2xl rounded-2xl overflow-hidden">
            <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-6 px-8 bg-gray-50/50 dark:bg-gray-800/50 border-b dark:border-gray-800">
              <div>
                <CardTitle className="dark:text-white text-lg font-black tracking-tight">
                  Transaction History
                </CardTitle>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium mt-1 uppercase tracking-wider">
                  Detailed records of your financial activities
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <select
                    className="h-9 pl-9 pr-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-[10px] font-bold shadow-sm focus:ring-2 focus:ring-emerald-500/20 transition-all outline-none dark:text-white"
                    value={selectedPlanFilter}
                    onChange={(e) => {
                      setSelectedPlanFilter(e.target.value);
                      setCurrentPage(1); // Reset to first page on filter
                    }}
                  >
                    <option value="all">ALL </option>
                    <option value="general">GENERAL WALLET</option>
                    <option value="withdrawable">WITHDRAWABLE</option>
                    {allPlans.map((plan) => (
                      <option key={plan.id} value={plan.id}>
                        {plan.name.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50/30 dark:bg-transparent dark:border-gray-800 hover:bg-transparent">
                      <TableHead className="dark:text-gray-500 font-black uppercase text-[10px] tracking-widest pl-8 py-5">
                        Date
                      </TableHead>
                      <TableHead className="dark:text-gray-500 font-black uppercase text-[10px] tracking-widest py-5">
                        Details
                      </TableHead>
                      <TableHead className="dark:text-gray-500 font-black uppercase text-[10px] tracking-widest py-5">
                        Description
                      </TableHead>
                      <TableHead className="dark:text-gray-500 font-black uppercase text-[10px] tracking-widest py-5">
                        Status
                      </TableHead>
                      <TableHead className="text-right dark:text-gray-500 font-black uppercase text-[10px] tracking-widest py-5">
                        Amount
                      </TableHead>
                      <TableHead className="text-right dark:text-gray-500 font-black uppercase text-[10px] tracking-widest pr-8 py-5 text-emerald-500">
                        Action
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.length === 0 ? (
                      <TableRow className="dark:border-gray-800">
                        <TableCell
                          colSpan={6}
                          className="text-center py-24 text-gray-500 dark:text-gray-400"
                        >
                          <div className="flex flex-col items-center justify-center gap-3">
                            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                              <Filter className="h-8 w-8 opacity-20" />
                            </div>
                            <p className="font-black uppercase text-xs tracking-widest opacity-50">
                              Empty Ledger Segment
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredTransactions
                        .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                        .map((tx) => {
                          const isPositive = [
                            "deposit",
                            "loan_disbursement",
                            "interest",
                            "limit_transfer",
                            "payout",
                          ].includes(tx.type);
                          let amountClass = "text-gray-900 dark:text-gray-200";
                          let amountPrefix = "";

                          if (isPositive) {
                            amountClass = "text-emerald-600 dark:text-emerald-400";
                            amountPrefix = "+";
                          } else if (["withdrawal", "loan_repayment"].includes(tx.type)) {
                            amountClass = "text-red-600 dark:text-red-500";
                            amountPrefix = "-";
                          } else {
                            amountClass = "text-gray-900 dark:text-white";
                            amountPrefix = "";
                          }

                          return (
                            <TableRow
                              key={tx.id}
                              className="dark:border-gray-800/50 dark:hover:bg-gray-800/30 group transition-colors"
                            >
                              <TableCell className="pl-8 py-5">
                                <div className="flex flex-col gap-0.5">
                                  <span className="font-black text-xs tracking-tight text-gray-900 dark:text-gray-200">
                                    {new Date(tx.created_at)
                                      .toLocaleDateString(undefined, {
                                        month: "short",
                                        day: "numeric",
                                        year: "numeric",
                                      })
                                      .toUpperCase()}
                                  </span>
                                  <span className="text-[10px] font-bold text-gray-400 tabular-nums">
                                    {new Date(tx.created_at).toLocaleTimeString(undefined, {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col gap-0.5">
                                  <span className="capitalize dark:text-gray-300 text-[11px] font-black tracking-tighter text-gray-900">
                                    {tx.type.replace("_", " ").toUpperCase()}
                                  </span>
                                  <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest line-clamp-1">
                                    {tx.plan?.name || "GEN-WALLET-01"}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell
                                className="dark:text-gray-400 text-xs font-medium max-w-md whitespace-normal leading-relaxed"
                                title={tx.description}
                              >
                                {tx.description}
                              </TableCell>
                              <TableCell>
                                <span
                                  className={`px-2.5 py-1 rounded-lg text-[9px] uppercase tracking-widest font-black border ${
                                    tx.status === "completed"
                                      ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                                      : tx.status === "pending"
                                        ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                                        : "bg-red-500/10 text-red-500 border-red-500/20"
                                  }`}
                                >
                                  {tx.status}
                                </span>
                              </TableCell>
                              <TableCell
                                className={`text-right font-black font-mono tracking-tighter text-[13px] ${amountClass}`}
                              >
                                {isBalanceHidden ? "****" : (
                                  <>
                                    {amountPrefix}
                                    {formatNaira(Math.abs(tx.amount))}
                                  </>
                                )}
                              </TableCell>
                              <TableCell className="text-right pr-8">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-10 w-10 p-0 hover:bg-emerald-500/10 text-emerald-600 rounded-xl transition-all active:scale-95"
                                  onClick={() => {
                                    setSelectedTransaction(tx);
                                    setShowDetailsDialog(true);
                                  }}
                                >
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="18"
                                    height="18"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="3"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="lucide lucide-eye"
                                  >
                                    <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
                                    <circle cx="12" cy="12" r="3" />
                                  </svg>
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination Controls */}
              {filteredTransactions.length > itemsPerPage && (
                <div className="flex items-center justify-between p-8 bg-gray-50/30 dark:bg-gray-800/20 border-t dark:border-gray-800">
                  <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.1em]">
                    LEDGER SEGMENT{" "}
                    <span className="text-gray-900 dark:text-white">
                      {(currentPage - 1) * itemsPerPage + 1}-
                      {Math.min(currentPage * itemsPerPage, filteredTransactions.length)}
                    </span>{" "}
                    OF{" "}
                    <span className="text-gray-900 dark:text-white font-black">
                      {filteredTransactions.length}
                    </span>
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((prev) => prev - 1)}
                      className="h-9 px-4 rounded-xl border-gray-200 dark:border-gray-700 text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500 hover:text-white transition-all"
                    >
                      Previous
                    </Button>
                    <div className="flex gap-1">
                      {Array.from(
                        { length: Math.ceil(filteredTransactions.length / itemsPerPage) },
                        (_, i) => i + 1,
                      )
                        .filter((p) => {
                          const total = Math.ceil(filteredTransactions.length / itemsPerPage);
                          return p === 1 || p === total || Math.abs(p - currentPage) <= 1;
                        })
                        .map((p, idx, arr) => (
                          <div key={p} className="flex items-center">
                            {idx > 0 && arr[idx - 1] !== p - 1 && (
                              <span className="px-2 text-gray-400 font-black">...</span>
                            )}
                            <Button
                              variant={currentPage === p ? "default" : "outline"}
                              size="sm"
                              onClick={() => setCurrentPage(p)}
                              className={`h-9 w-9 p-0 rounded-xl text-[10px] font-black transition-all ${currentPage === p ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20" : "border-gray-200 dark:border-gray-700 dark:text-gray-400"}`}
                            >
                              {p}
                            </Button>
                          </div>
                        ))}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={
                        currentPage === Math.ceil(filteredTransactions.length / itemsPerPage)
                      }
                      onClick={() => setCurrentPage((prev) => prev + 1)}
                      className="h-9 px-4 rounded-xl border-gray-200 dark:border-gray-700 text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500 hover:text-white transition-all"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <LoanRepaymentDialog
        open={showLoanDialog}
        onOpenChange={setShowLoanDialog}
        loan={activeLoan}
        withdrawalAmount={pendingWithdrawalParams?.amount || 0}
        onPayLoan={handlePayLoan}
        onRequestWithdrawal={handleRequestRestricted}
        processing={uploading}
      />

      <TransactionDetailsModal
        open={showDetailsDialog}
        onOpenChange={setShowDetailsDialog}
        transaction={selectedTransaction}
      />
    </div>
  );
}
