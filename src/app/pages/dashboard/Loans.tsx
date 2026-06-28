import { useEffect, useState, useMemo } from "react";

import { FileText, AlertTriangle, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Checkbox } from "@/app/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { Input } from "@/app/components/ui/input";
import { KYCModal } from "@/app/components/ui/KYCModal";
import { Label } from "@/app/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/components/ui/table";
import { useAuth } from "@/app/context/AuthContext";
import { notificationDispatcher } from "@/lib/notificationDispatcher";
import { supabase } from "@/lib/supabase";
import { calculateBalance } from "@/lib/walletUtils";

export function Loans() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [loans, setLoans] = useState<any[]>([]);
  const [interestRate, setInterestRate] = useState(10); // Default fallback

  // Pagination & Search
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const itemsPerPage = 15;

  // Eligibility State
  const [profile, setProfile] = useState<any>(null);
  const [hasActivePlan, setHasActivePlan] = useState(false);
  const [totalBalance, setTotalBalance] = useState(0);
  const [withdrawableBalance, setWithdrawableBalance] = useState(0);
  const [maxLoanAmount, setMaxLoanAmount] = useState(0);
  const [accountAgeMonths, setAccountAgeMonths] = useState(0);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);

  // Form State
  const [amount, setAmount] = useState("");
  const [needHigherAmount, setNeedHigherAmount] = useState(false);
  const [higherAmount, setHigherAmount] = useState("");

  const [duration, setDuration] = useState("1_month"); // keys for options
  const [repaymentType, setRepaymentType] = useState("monthly");
  const [selectedBankId, setSelectedBankId] = useState("");

  const [open, setOpen] = useState(false);
  const [kycModalOpen, setKycModalOpen] = useState(false);
  const [kycModalMode, setKycModalMode] = useState<"full" | "confirm">("full");

  // Options
  const durationOptions = [
    { id: "1_week", label: "1 Week", months: 0.25, requiredAge: 0, requiredSavings: 0 },
    { id: "2_weeks", label: "2 Weeks", months: 0.5, requiredAge: 0, requiredSavings: 0 },
    { id: "1_month", label: "1 Month", months: 1, requiredAge: 0, requiredSavings: 0 },
    { id: "2_months", label: "2 Months", months: 2, requiredAge: 0, requiredSavings: 0 },
    { id: "3_months", label: "3 Months", months: 3, requiredAge: 0, requiredSavings: 0 },
    { id: "6_months", label: "6 Months", months: 6, requiredAge: 6, requiredSavings: 500000 },
    { id: "12_months", label: "12 Months", months: 12, requiredAge: 12, requiredSavings: 1000000 },
  ];

  const availableDurations = durationOptions.filter(
    (d) => accountAgeMonths >= d.requiredAge && totalBalance >= d.requiredSavings,
  );

  const handleRequestLoanClick = () => {
    if (!hasActivePlan) {
      toast.error("You must have an active investment/saving plan to request a loan.");
      return;
    }
    if (profile?.is_loan_eligible === false) {
      toast.error("You are currently not eligible for a loan. Please contact support.");
      return;
    }
    if (profile?.gov_id_status !== "verified") {
      setKycModalMode("full");
      setKycModalOpen(true);
      toast.info("Please submit your KYC details to request a loan.");
    } else {
      setKycModalMode("confirm");
      setKycModalOpen(true);
    }
  };

  const handleKycSuccess = () => {
    fetchEligibilityData();
    if (kycModalMode === "confirm") {
      setOpen(true);
    }
  };

  // Repayment State
  const [repayOpen, setRepayOpen] = useState(false);
  const [repayAmount, setRepayAmount] = useState("");
  const [selectedLoan, setSelectedLoan] = useState<any>(null);
  const [repaying, setRepaying] = useState(false);
  const [repaySource, setRepaySource] = useState("general"); // 'general' | 'withdrawable'
  const [repayMode, setRepayMode] = useState("scheduled"); // 'scheduled' | 'part' | 'full'

  const formatCurrency = (value: number | string) => {
    const val = Number(value);
    return new Intl.NumberFormat("en-US", {
      style: "decimal",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val);
  };

  const [loanTransactions, setLoanTransactions] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      fetchSettings();
      fetchLoans();
      fetchEligibilityData();
      fetchLoanTransactions();
    }
  }, [user]);

  useEffect(() => {
    const loanId = searchParams.get("id");
    if (loanId && loans.length > 0) {
      const loan = loans.find((l) => l.id === loanId);
      if (loan) {
        Promise.resolve().then(() => {
          setSelectedLoan(loan);
          setRepayOpen(true);
        });
        window.history.replaceState({}, "", window.location.pathname);
      }
    }
  }, [loans, searchParams]);

  async function fetchSettings() {
    const { data } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "general")
      .single();
    if (data?.value?.loan_interest_rate) {
      setInterestRate(Number(data.value.loan_interest_rate));
    }
  }

  async function fetchLoanTransactions() {
    const { data } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", user?.id)
      .not("loan_id", "is", null)
      .order("created_at", { ascending: false });

    if (data) setLoanTransactions(data);
  }

  async function fetchLoans() {
    const { data } = await supabase
      .from("loans")
      .select("*")
      .eq("user_id", user?.id)
      .order("created_at", { ascending: false });

    if (data) setLoans(data);
  }

  async function fetchEligibilityData() {
    // 1. Fetch Profile (Created At & KYC)
    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user?.id)
      .single();

    if (profileData) {
      setProfile(profileData);

      // Calculate Account Age
      const created = new Date(profileData.created_at);
      const now = new Date();
      const diffMonths =
        (now.getFullYear() - created.getFullYear()) * 12 + (now.getMonth() - created.getMonth());
      setAccountAgeMonths(diffMonths);
    }

    // 2. Fetch Plans (Active Plan Check)
    const { data: plansData } = await supabase
      .from("user_plans")
      .select("id, plans!inner(type), current_balance")
      .eq("user_id", user?.id)
      .eq("status", "active");

    const activePlans = plansData ? plansData.length > 0 : false;
    setHasActivePlan(activePlans);

    const withdrawablePlan = plansData?.find((p: any) => p.plans?.type === "withdrawable_wallet");
    setWithdrawableBalance(withdrawablePlan?.current_balance || 0);

    // 3. Fetch Balance (For Max Loan Calc)
    const { data: txData } = await supabase
      .from("transactions")
      .select("amount, type, charge")
      .eq("user_id", user?.id);

    if (txData) {
      const bal = calculateBalance(txData as any, null);
      setTotalBalance(bal);

      // Calculate Max Loan
      // Rule: > 1 year (12 months) = 70%, else 50%
      const percentage = accountAgeMonths >= 12 ? 0.7 : 0.5;
      setMaxLoanAmount(bal * percentage);
    }

    // Fetch Bank Accounts
    const { data: bankData } = await supabase
      .from("bank_accounts")
      .select("*")
      .eq("user_id", user?.id)
      .eq("status", "active");

    if (bankData) {
      setBankAccounts(bankData);
      if (bankData.length > 0) setSelectedBankId(bankData[0].id);
    }
  }

  const activeLoansTotal = loans
    .filter((l) => l.status === "active" || l.status === "defaulted")
    .reduce((sum, loan) => sum + Number(loan.repayable_amount || loan.total_payable || 0), 0);

  // Available limit considers existing debt
  const availableLoanLimit = Math.max(0, maxLoanAmount - activeLoansTotal);

  const isEligible =
    hasActivePlan && profile?.gov_id_status === "verified" && profile?.is_loan_eligible !== false;

  async function handleRequestLoan() {
    if (!user) return;

    const finalAmountStr = needHigherAmount ? higherAmount : amount;
    if (!finalAmountStr) return;

    if (!isEligible) {
      toast.error("You are not eligible for a loan yet");
      return;
    }

    if (!selectedBankId) {
      toast.error("Please select a bank account to receive the funds.");
      return;
    }

    const selectedBank = bankAccounts.find((b) => b.id === selectedBankId);

    const loanAmount = parseFloat(finalAmountStr);
    const isHighValue = loanAmount > availableLoanLimit;

    // Use requested duration mapping
    const durationObj = availableDurations.find((d) => d.id === duration) || availableDurations[0];
    const totalPayable = loanAmount + loanAmount * (interestRate / 100);

    // Generate Loan Number: MTF - XXXXXX
    const loanNumber = `MTF - ${Math.floor(100000 + Math.random() * 900000)}`;

    const { error } = await supabase.from("loans").insert({
      user_id: user.id,
      amount: needHigherAmount ? parseFloat(amount) || loanAmount : loanAmount, // baseline amount
      loan_number: loanNumber,
      interest_rate: interestRate,
      total_payable: totalPayable, // legacy field fallback
      duration_months: durationObj.months,
      status: "pending",
      repayment_duration_type: repaymentType,
      repayment_duration_value: durationObj.months,
      requested_higher_amount: needHigherAmount,
      requested_amount_value: needHigherAmount ? loanAmount : 0,
      bank_account_details: selectedBank
        ? {
            bank_name: selectedBank.bank_name,
            account_number: selectedBank.account_number,
            account_name: selectedBank.account_name,
          }
        : null,
    });

    if (error) {
      toast.error("Loan request failed");
      console.error(error);
    } else {
      if (isHighValue || needHigherAmount) {
        toast.warning("Request exceeds standard parameters. Submitted for Admin Approval.");
      } else {
        toast.success("Loan requested successfully!");
      }

      // Trigger notification for loan request
      if (user.email) {
        await notificationDispatcher.sendAlert({
          userId: user.id,
          email: user.email,
          type: "loan",
          title: "Loan Application Submitted",
          message: `Your application for a loan of ₦${formatCurrency(loanAmount)} has been submitted successfully. It is currently under review by administrators.`,
        });
      }

      setOpen(false);
      setAmount("");
      setHigherAmount("");
      setNeedHigherAmount(false);
      fetchLoans();
    }
  }

  // Handle Repayment Modes inside Modal
  useEffect(() => {
    if (selectedLoan && repayMode === "full") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRepayAmount(
        (
          selectedLoan.remaining_balance ||
          selectedLoan.repayable_amount ||
          selectedLoan.total_payable ||
          0
        ).toString(),
      );
    } else if (selectedLoan && repayMode === "scheduled") {
      // rough scheduled amount (just an estimate if not fully defined yet)
      const duration = selectedLoan.repayment_duration_value || selectedLoan.duration_months || 1;
      const total =
        selectedLoan.remaining_balance ||
        selectedLoan.repayable_amount ||
        selectedLoan.total_payable ||
        0;
      let divs = 1;
      if (selectedLoan.repayment_duration_type === "weekly") divs = duration * 4;
      if (selectedLoan.repayment_duration_type === "bi-weekly") divs = duration * 2;
      if (selectedLoan.repayment_duration_type === "monthly") divs = duration;

      const amt = total / (divs || 1);
      setRepayAmount(amt > total ? total.toString() : amt.toFixed(2));
    } else if (repayMode === "part") {
      setRepayAmount("");
    }
  }, [repayMode, selectedLoan]);

  async function handleRepayment() {
    if (!selectedLoan || !repayAmount) return;
    const amountToRepay = parseFloat(repayAmount);
    const balanceToCheck = repaySource === "general" ? totalBalance : withdrawableBalance;

    if (amountToRepay <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    if (amountToRepay > balanceToCheck) {
      toast.error(`Insufficient balance in ${repaySource} wallet for repayment`);
      return;
    }

    setRepaying(true);

    // Fetch proper plan IDs
    let planIdToDebit = null;
    if (repaySource === "withdrawable") {
      const { data: wPlan } = await supabase
        .from("user_plans")
        .select("plan_id, plans!inner(type)")
        .eq("user_id", user?.id)
        .eq("plans.type", "withdrawable_wallet")
        .single();
      planIdToDebit = wPlan?.plan_id;
    } else {
      const { data: gPlan } = await supabase
        .from("user_plans")
        .select("plan_id, plans!inner(type)")
        .eq("user_id", user?.id)
        .eq("plans.type", "general_wallet")
        .single();
      planIdToDebit = gPlan?.plan_id;
    }

    // We do a double entry basically: a debit from wallet, and credit to loan is handled natively if type=loan_repayment
    const { error: txError } = await supabase.from("transactions").insert({
      user_id: user?.id,
      amount: amountToRepay,
      type: "loan_repayment",
      status: "completed",
      description: `Repayment for ${selectedLoan.loan_number || "Loan"} from ${repaySource} wallet`,
      plan_id: planIdToDebit,
      loan_id: selectedLoan.id,
      charge: 0,
    });

    if (txError) {
      toast.error("Failed to process repayment transaction.");
      setRepaying(false);
      return;
    }

    toast.success(
      `Repayment submitted! Payment of ₦${formatCurrency(amountToRepay)} is being processed.`,
    );

    // Check if fully settled (roughly)
    const newBal =
      (selectedLoan.remaining_balance ||
        selectedLoan.repayable_amount ||
        selectedLoan.total_payable) - amountToRepay;
    if (newBal <= 0) {
      // The DB trigger handles status update, but let's notify user
      toast.success("Congratulations! Your loan is fully settled!");
      if (user?.email) {
        await notificationDispatcher.sendAlert({
          userId: user.id,
          email: user.email,
          type: "loan",
          title: "Loan Fully Settled 🎉",
          message: `Congratulations! Your loan ${selectedLoan.loan_number || "Loan"} has been fully paid off.`,
        });
      }
    } else {
      if (user?.email) {
        await notificationDispatcher.sendAlert({
          userId: user.id,
          email: user.email,
          type: "loan",
          title: "Loan Repayment Received",
          message: `Your repayment of ₦${formatCurrency(amountToRepay)} for loan number ${selectedLoan.loan_number || "Loan"} has been successfully processed.`,
        });
      }
    }

    setRepayOpen(false);
    setRepayAmount("");
    setSelectedLoan(null);

    // Refresh all data
    await fetchLoans();
    await fetchEligibilityData();
    await fetchLoanTransactions();
    setRepaying(false);
  }

  const loanForm = (
    <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto px-2">
      <div className="grid gap-2">
        <Label htmlFor="amount" className="dark:text-gray-300">
          Required Loan Amount
        </Label>
        <div className="flex justify-between text-xs mb-1">
          <span className="text-gray-500 dark:text-gray-400">
            Total Limit: <span className="font-medium">₦{formatCurrency(maxLoanAmount)}</span>
          </span>
          <span className="text-emerald-600 dark:text-emerald-400 font-medium">
            Available: ₦{formatCurrency(availableLoanLimit)}
          </span>
        </div>
        <Input
          id="amount"
          type="number"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          disabled={needHigherAmount}
          className="dark:bg-gray-800 dark:border-gray-700 dark:text-white"
        />
        {amount && parseFloat(amount) > availableLoanLimit && !needHigherAmount && (
          <p className="text-xs text-amber-600 font-medium flex items-center gap-1 mt-1">
            <AlertTriangle className="w-3 h-3" />
            Exceeds available limit. Requires Admin Review.
          </p>
        )}
      </div>

      <div className="flex items-center space-x-2 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border dark:border-slate-800">
        <Checkbox
          id="needHigherAmount"
          checked={needHigherAmount}
          onCheckedChange={(c) => setNeedHigherAmount(!!c)}
        />
        <Label htmlFor="needHigherAmount" className="text-sm cursor-pointer dark:text-white">
          I need a higher amount than my limit
        </Label>
      </div>

      {needHigherAmount && (
        <div className="grid gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
          <Label htmlFor="higherAmount" className="text-amber-900 dark:text-amber-100 text-sm">
            Enter required amount
          </Label>
          <Input
            id="higherAmount"
            type="number"
            placeholder="0.00"
            value={higherAmount}
            onChange={(e) => setHigherAmount(e.target.value)}
            className="bg-white dark:bg-gray-800 dark:text-white"
          />
          <p className="text-xs text-amber-700 dark:text-amber-400">
            Requests exceeding limits are subject to strict administrative review and KYC
            verification.
          </p>
        </div>
      )}

      <div className="grid gap-2">
        <Label htmlFor="duration" className="dark:text-gray-300">
          Duration of Repayment
        </Label>
        <select
          id="duration"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white"
        >
          {availableDurations.map((d) => (
            <option key={d.id} value={d.id}>
              {d.label}
            </option>
          ))}
        </select>
        <p className="text-xs text-gray-500">
          Max duration is unlocked based on your account age and savings volume.
        </p>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="repaymentType" className="dark:text-gray-300">
          Repayment Duration Type
        </Label>
        <select
          id="repaymentType"
          value={repaymentType}
          onChange={(e) => setRepaymentType(e.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white"
        >
          <option value="weekly">Weekly</option>
          <option value="bi-weekly">Bi-Weekly</option>
          <option value="monthly">Monthly</option>
          <option value="full_settlement">Full Settlement (One-time)</option>
        </select>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="bankAccount" className="dark:text-gray-300">
          Bank Account (For Disbursement)
        </Label>
        {bankAccounts.length === 0 ? (
          <div className="text-xs text-red-500 p-2 bg-red-50 rounded">
            You must add a bank account in your Profile Settings before requesting a loan.
          </div>
        ) : (
          <select
            id="bankAccount"
            value={selectedBankId}
            onChange={(e) => setSelectedBankId(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white"
          >
            {bankAccounts.map((b) => (
              <option key={b.id} value={b.id}>
                {b.bank_name} - {b.account_number} ({b.account_name})
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="bg-blue-50 p-3 rounded text-sm text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 space-y-1">
        <div className="flex justify-between">
          <span>Interest Rate:</span>
          <span className="font-medium">{interestRate}% Flat</span>
        </div>
        <div className="border-t border-blue-200 dark:border-blue-800 my-2 pt-2 flex justify-between font-bold">
          <span>Estimated Total Repayment:</span>
          <span>
            {amount || higherAmount
              ? `₦${formatCurrency(parseFloat(needHigherAmount ? higherAmount : amount) * (1 + interestRate / 100))}`
              : "₦0.00"}
          </span>
        </div>
      </div>
    </div>
  );

  // Pagination Logic
  const filteredLoans = useMemo(() => {
    return loans.filter(
      (l) =>
        l.loan_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.status.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [loans, searchQuery]);

  const totalPages = Math.ceil(filteredLoans.length / itemsPerPage);
  const paginatedLoans = filteredLoans.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Loans</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Apply for loans and manage active loans.
          </p>
        </div>

        <Button
          className="bg-emerald-600 hover:bg-emerald-700 dark:text-white shadow-sm"
          onClick={handleRequestLoanClick}
        >
          {loans.some((l) => l.status === "active" || l.status === "pending")
            ? "Request Another Loan"
            : "Request Loan"}
        </Button>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="dark:bg-gray-900 dark:border-gray-800 sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="dark:text-white">Request a Loan</DialogTitle>
              <DialogDescription className="dark:text-gray-400">
                You qualify for up to ₦{formatCurrency(maxLoanAmount)} (
                {accountAgeMonths >= 12 ? "70%" : "50%"} of balance).
              </DialogDescription>
            </DialogHeader>

            {loanForm}

            <DialogFooter>
              <Button
                onClick={handleRequestLoan}
                className="w-full dark:bg-emerald-600 dark:text-white dark:hover:bg-emerald-700"
                disabled={!selectedBankId || (!amount && !higherAmount)}
              >
                Submit Application
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Active Loan Countdown Highlight */}
      {loans
        .filter((l) => l.status === "active")
        .map((activeLoan) => (
          <div
            key={`active-${activeLoan.id}`}
            className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-xl shadow-lg p-6 text-white flex flex-col md:flex-row justify-between items-center gap-6"
          >
            <div>
              <h3 className="text-lg font-bold opacity-90">
                Active Loan: {activeLoan.loan_number}
              </h3>
              <div className="text-3xl font-extrabold tracking-tight mt-1">
                ₦
                {formatCurrency(
                  activeLoan.remaining_balance ||
                    activeLoan.repayable_amount ||
                    activeLoan.total_payable ||
                    0,
                )}
              </div>
              <p className="text-emerald-100 text-sm mt-1">Remaining Balance</p>
            </div>

            <div className="flex gap-3 w-full md:w-auto">
              <Button
                size="lg"
                className="bg-white text-emerald-700 hover:bg-gray-100 font-bold w-full md:w-auto shadow-sm"
                onClick={() => {
                  setSelectedLoan(activeLoan);
                  setRepayMode("scheduled");
                  setRepayOpen(true);
                }}
              >
                Repay Now
              </Button>
            </div>
          </div>
        ))}

      {/* Repayment Dialog */}
      <Dialog open={repayOpen} onOpenChange={setRepayOpen}>
        <DialogContent className="dark:bg-gray-900 dark:border-gray-800 sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="dark:text-white flex items-center justify-between">
              <span>Loan Repayment</span>
              {selectedLoan && <Badge variant="outline">{selectedLoan.loan_number}</Badge>}
            </DialogTitle>
            <DialogDescription className="dark:text-gray-400">
              Manage your loan repayment schedule.
            </DialogDescription>
          </DialogHeader>

          {selectedLoan && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <div>
                  <p className="text-xs text-gray-500">Total Approved</p>
                  <p className="font-medium dark:text-white">
                    ₦{formatCurrency(selectedLoan.approved_amount || selectedLoan.amount)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Remaining Balance</p>
                  <p className="font-bold text-emerald-600 dark:text-emerald-400">
                    ₦
                    {formatCurrency(
                      selectedLoan.remaining_balance ||
                        selectedLoan.repayable_amount ||
                        selectedLoan.total_payable,
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Duration type</p>
                  <p className="font-medium dark:text-white capitalize">
                    {(selectedLoan.repayment_duration_type || "monthly").replace("_", " ")}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Status</p>
                  <span className="text-sm font-medium capitalize text-emerald-600">
                    {selectedLoan.status}
                  </span>
                </div>
              </div>

              {(selectedLoan.status === "active" || selectedLoan.status === "defaulted") && (
                <div className="space-y-4 border-t border-gray-100 dark:border-gray-700 pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="dark:text-gray-300">Repayment Source</Label>
                      <select
                        value={repaySource}
                        onChange={(e) => setRepaySource(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                      >
                        <option value="general">
                          General Wallet (₦{formatCurrency(totalBalance)})
                        </option>
                        <option value="withdrawable">
                          Withdrawable Wallet (₦{formatCurrency(withdrawableBalance)})
                        </option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label className="dark:text-gray-300">Payment Type</Label>
                      <select
                        value={repayMode}
                        onChange={(e) => setRepayMode(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                      >
                        <option value="scheduled">
                          Scheduled Payment ({selectedLoan.repayment_duration_type?.split("_")[0]})
                        </option>
                        <option value="part">Part Payment</option>
                        <option value="full">Full Settlement</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="repayAmount" className="dark:text-gray-300">
                      Amount to Repay
                    </Label>
                    <Input
                      id="repayAmount"
                      type="number"
                      value={repayAmount}
                      onChange={(e) => setRepayAmount(e.target.value)}
                      disabled={repayMode === "full"}
                      className="text-lg font-bold dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                      placeholder="Enter amount"
                    />
                  </div>

                  <Button
                    className="w-full bg-emerald-600 hover:bg-emerald-700 h-12 text-lg font-semibold"
                    onClick={handleRepayment}
                    disabled={repaying || !repayAmount}
                  >
                    {repaying ? "Processing..." : `Pay ₦${formatCurrency(repayAmount || 0)}`}
                  </Button>
                </div>
              )}

              {/* Transaction History in modal */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold dark:text-white">Transaction History</h4>
                <div className="border rounded-md border-gray-100 dark:border-gray-700 max-h-[150px] overflow-y-auto">
                  {loanTransactions.filter((tx) => tx.loan_id === selectedLoan.id).length === 0 ? (
                    <p className="text-xs text-center py-4 text-gray-500">
                      No transactions recorded.
                    </p>
                  ) : (
                    loanTransactions
                      .filter((tx) => tx.loan_id === selectedLoan.id)
                      .map((tx) => (
                        <div
                          key={tx.id}
                          className="flex justify-between items-center p-2 text-xs border-b last:border-0 border-gray-100 dark:border-gray-800"
                        >
                          <span className="text-gray-500">
                            {new Date(tx.created_at).toLocaleDateString()}
                          </span>
                          <span className="font-medium">
                            {tx.type === "loan_repayment" ? "Repayment" : "Disbursement"}
                          </span>
                          <span
                            className={
                              tx.type === "loan_repayment"
                                ? "text-green-600"
                                : "text-gray-900 dark:text-white"
                            }
                          >
                            {tx.type === "loan_repayment" ? "-" : "+"}₦{formatCurrency(tx.amount)}
                          </span>
                        </div>
                      ))
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* NEW TABLE LAYOUT WITH PAGINATION */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
          <h2 className="font-semibold dark:text-white">Loans History</h2>
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search loans..."
              className="pl-9 h-9 dark:bg-gray-900 dark:border-gray-700"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[140px]">Loan ID</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Requested</TableHead>
              <TableHead>Repayable</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedLoans.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-gray-500">
                  <div className="flex flex-col items-center justify-center">
                    <FileText className="w-12 h-12 mb-4 opacity-50" />
                    <p>No records found.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              paginatedLoans.map((loan) => {
                return (
                  <TableRow key={loan.id}>
                    <TableCell className="font-medium font-mono text-xs">
                      {loan.loan_number || "LN----"}
                    </TableCell>
                    <TableCell>{new Date(loan.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      ₦{formatCurrency(loan.requested_amount_value || loan.amount)}
                    </TableCell>
                    <TableCell>
                      ₦{formatCurrency(loan.repayable_amount || loan.total_payable || 0)}
                    </TableCell>
                    <TableCell className="capitalize">
                      {(loan.repayment_duration_type || "monthly").replace("_", " ")}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          loan.status === "active"
                            ? "default"
                            : loan.status === "completed" || loan.status === "paid"
                              ? "secondary"
                              : loan.status === "defaulted" || loan.status === "rejected"
                                ? "destructive"
                                : "outline"
                        }
                      >
                        {loan.status === "paid" ? "completed" : loan.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-emerald-600 hover:bg-emerald-50"
                        onClick={() => {
                          setSelectedLoan(loan);
                          setRepayOpen(true);
                        }}
                      >
                        Details
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        {totalPages > 1 && (
          <div className="p-4 flex items-center justify-between border-t dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/20">
            <p className="text-sm text-gray-500">
              Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
              {Math.min(currentPage * itemsPerPage, filteredLoans.length)} of {filteredLoans.length}{" "}
              entries
            </p>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="text-sm font-medium px-2 text-slate-700 dark:text-slate-300">
                Page {currentPage} of {totalPages}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <KYCModal
        isOpen={kycModalOpen}
        onOpenChange={setKycModalOpen}
        onSuccess={handleKycSuccess}
        mode={kycModalMode}
      />
    </div>
  );
}
