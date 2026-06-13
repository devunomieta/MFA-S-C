import { useState, useEffect } from "react";

import { CreditCard, Copy, Upload, Trash2, Wallet, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/app/components/ui/button";
import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { useAuth } from "@/app/context/AuthContext";
import { logActivity } from "@/lib/activity";
import { notificationDispatcher } from "@/lib/notificationDispatcher";
import { supabase } from "@/lib/supabase";
import { validateFile } from "@/lib/validation";
import { calculateBalance } from "@/lib/walletUtils";

interface DepositModalProps {
  onSuccess: () => void;
  defaultPlanId?: string;
  onClose: () => void;
  initialAdvanceMode?: boolean;
}

export function DepositModal({
  onSuccess,
  defaultPlanId,
  onClose,
  initialAdvanceMode,
}: DepositModalProps) {
  const { user } = useAuth();

  const [selectedPlanId, setSelectedPlanId] = useState<string>(defaultPlanId || "");

  const [uploading, setUploading] = useState(false);
  const [myPlans, setMyPlans] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<string>(defaultPlanId ? "wallet" : "external");
  const [bankDetails, setBankDetails] = useState({
    account_name: "HachStacks Technologies",
    bank_name: "Moniepoint",
    account_number: "7049898962",
  });
  const isPlanFunding = !!defaultPlanId;

  const [amount, setAmount] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  // Wallet Payment State
  const [generalBalance, setGeneralBalance] = useState(0);
  const [loadingBalance, setLoadingBalance] = useState(true);

  const [isAdvanceMode, setIsAdvanceMode] = useState(initialAdvanceMode || false);
  const [numUnits, setNumUnits] = useState("1");
  const [amountPerUnit, setAmountPerUnit] = useState("");
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number | "all">("all");

  async function fetchBankDetails() {
    const { data } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "bank_details")
      .single();
    if (data?.value) {
      setBankDetails(data.value);
    }
  }

  async function fetchPlans() {
    let query = supabase.from("user_plans").select("*, plan:plans(*)").eq("user_id", user?.id);

    if (defaultPlanId) {
      // Contextual Mode (Join Plan or Specific Plan Deposit)
      // Show ONLY the specifically targeted plan (whether pending or active)
      // Filter out cancelled or Archived ones to prevent duplicates/confusion
      query = query.eq("plan_id", defaultPlanId).in("status", ["active", "pending_activation"]);
    } else {
      // General Mode (Wallet Add Funds)
      // Show ONLY Active plans. Pending plans should not appear here.
      query = query.eq("status", "active");
    }

    const { data: userPlansData } = await query;

    if (userPlansData) {
      // Consolidate duplicates: If the user has multiple records for the same plan_id,
      // we ONLY keep the most "Active" one to prevent stale data from being targeted.
      const consolidated: any[] = [];
      const planIdsSeen = new Set<string>();

      // Sort so 'active' comes first, then 'pending_activation', then anything else
      const sortedData = [...userPlansData].sort((a, b) => {
        const statusA = (a.status || "").toLowerCase().trim();
        const statusB = (b.status || "").toLowerCase().trim();
        if (statusA === "active" && statusB !== "active") return -1;
        if (statusA !== "active" && statusB === "active") return 1;
        return 0;
      });

      sortedData.forEach((up) => {
        if (!planIdsSeen.has(up.plan_id)) {
          consolidated.push(up);
          planIdsSeen.add(up.plan_id);
        }
      });

      setMyPlans(consolidated);

      if (defaultPlanId && consolidated.length > 0) {
        const match = consolidated.find((up) => up.plan_id === defaultPlanId);
        if (match) setSelectedPlanId(match.id);
      }
    }
  }

  async function fetchGeneralBalance() {
    setLoadingBalance(true);
    const { data: txData } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", user?.id)
      .is("plan_id", null); // Only fetch general wallet transactions

    if (txData) {
      const bal = calculateBalance(txData as any, null);
      setGeneralBalance(bal);
    }
    setLoadingBalance(false);
  }

  async function fetchBankDetails() {
    const { data } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "bank_details")
      .single();

    if (data?.value) {
      setBankDetails(data.value);
    }
  }

  useEffect(() => {
    Promise.resolve().then(() => setIsAdvanceMode(initialAdvanceMode || false));
  }, [initialAdvanceMode]);

  useEffect(() => {
    if (user) {
      Promise.resolve().then(() => {
        fetchPlans();
        fetchGeneralBalance();
        fetchBankDetails();
      });
    }
  }, [user]);

  useEffect(() => {
    if (defaultPlanId) {
      Promise.resolve().then(() => {
        setSelectedPlanId(defaultPlanId);
        setActiveTab("wallet"); // Automatically switch to wallet if a plan is targeted
        fetchPlans(); // Refresh plans to ensure the newly joined plan is found
      });
    } else {
      Promise.resolve().then(() => setActiveTab("external"));
    }
  }, [defaultPlanId]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "decimal",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const checkIsActivated = (up: any) => {
    if (!up) return false;
    const status = (up.status || "").toLowerCase().trim();
    const balance = Number(up.current_balance || 0);
    const meta = up.plan_metadata || {};

    return (
      status === "active" ||
      balance > 0 ||
      !!meta.last_payment_date ||
      Number(meta.total_days_paid || 0) > 0 ||
      meta.is_setup_fee_paid === true ||
      (up.plan?.type === "ajo_circle" && Number(meta.current_cycle_paid || 0) > 0) ||
      (up.plan?.type === "daily_drop" && Number(meta.total_days_paid || 0) > 0)
    );
  };

  const handleFileChange = (file: File | null) => {
    if (file) {
      // Security: Strict File Validation
      const validation = validateFile(file, {
        maxSizeMB: 5,
        allowedTypes: ["image/jpeg", "image/png", "application/pdf"],
      });

      if (!validation.isValid) {
        toast.error(validation.error);
        return;
      }

      setReceiptFile(file);
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
    }
  };

  const removeFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setReceiptFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Account copied");
  };

  async function handleDeposit(method: "external" | "wallet") {
    if (!user || !amount) return;

    const finalAmount = parseFloat(amount);
    const isFlexibleGoalPlan =
      activeTab === "wallet" &&
      ["anchor", "sprint", "marathon", "monthly_bloom"].includes(
        selectedPlanObj?.plan?.type || selectedPlanObj?.type,
      );
    const effectiveMin =
      isFlexibleGoalPlan && mandatedAmount === 0
        ? 50
        : activeTab === "wallet" && selectedPlanObj?.plan?.min_amount
          ? Math.max(selectedPlanObj.plan.min_amount, 50)
          : 500;

    if (isNaN(finalAmount) || finalAmount < effectiveMin) {
      toast.error(
        mandatedAmount > 0
          ? `Minimum contribution is ₦${formatCurrency(mandatedAmount)}`
          : `Minimum amount for this ${activeTab === "external" ? "deposit" : "transfer"} is ₦${formatCurrency(effectiveMin)}`,
      );
      return;
    }

    if (finalAmount % 50 !== 0) {
      toast.error("Amount must be a whole value in multiples of 50 (e.g. 1000, 1500, 50, 100)");
      return;
    }

    // Real-time compliance check for flexible plans (Anchor, Sprint, Marathon, Monthly Bloom)
    if (!isAdvanceMode && finalAmount < mandatedAmount) {
      toast.error(
        `Initial payment for this period must be at least ₦${formatCurrency(mandatedAmount)}`,
      );
      return;
    }

    if (activeTab === "wallet" && (planType === "step_up" || planType === "ajo_circle")) {
      if (!isAdvanceMode) {
        if (finalAmount !== mandatedAmount) {
          toast.error(`Deposit must be exactly ₦${formatCurrency(mandatedAmount)}`);
          return;
        }
      } else {
        if (mandatedAmount <= 0) {
          toast.error("Invalid plan amount settings.");
          return;
        }
        if (finalAmount % mandatedAmount !== 0) {
          toast.error(`Deposit must be an integer multiple of ₦${formatCurrency(mandatedAmount)}`);
          return;
        }
      }
    }
    if (method === "external" && !receiptFile) {
      toast.error("Please upload payment receipt");
      return;
    }

    if (method === "wallet") {
      if (totalDeduction > generalBalance) {
        toast.error(
          `Insufficient wallet balance. You need ₦${formatCurrency(totalDeduction)} (incl. ₦${formatCurrency(fee)} fee)`,
        );
        setUploading(false);
        return;
      }
      if (!selectedPlanId) {
        toast.error("Please select a target plan for wallet transfer");
        setUploading(false);
        return;
      }
    }

    setUploading(true);
    let receiptUrl = null;

    if (receiptFile) {
      try {
        const fileExt = receiptFile.name.split(".").pop();
        // eslint-disable-next-line react-hooks/purity
        const fileName = `${user.id}-${receiptFile.size}-${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("receipts")
          .upload(fileName, receiptFile);

        if (uploadError) throw uploadError;

        const {
          data: { publicUrl },
        } = supabase.storage.from("receipts").getPublicUrl(fileName);

        receiptUrl = publicUrl;
      } catch (error: any) {
        console.error("Receipt Upload Error:", error);
        toast.error("Failed to upload receipt. Please try again.");
        setUploading(false);
        return;
      }
    }

    if (method === "external") {
      // Standard Deposit - REQUIRES ADMIN APPROVAL
      const { error } = await supabase.from("transactions").insert({
        user_id: user.id,
        amount: finalAmount,
        type: "deposit",
        status: "pending",
        description: "Wallet Top Up via External Deposit",
        plan_id: null,
        charge: 0,
        receipt_url: receiptUrl,
      });

      if (error) {
        toast.error(`Deposit failed: ${error.message}`);
        console.error(error);
      } else {
        logActivity({
          userId: user.id,
          action: "DEPOSIT",
          details: {
            amount: finalAmount,
            plan_name: selectedPlanId ? selectedPlanObj?.name : "Wallet",
            display_name: user.user_metadata?.full_name?.split(" ")[0] || "A user",
          },
        });

        // Trigger pending deposit alert
        if (user.email) {
          await notificationDispatcher.sendAlert({
            userId: user.id,
            email: user.email,
            type: "transaction",
            title: "Deposit Received (Pending Approval)",
            message: `Your deposit of ₦${formatCurrency(finalAmount)} has been received and is currently pending review. An administrator will verify and approve your deposit made via direct transfer shortly.`,
          });
        }

        finishSuccess("Deposit submitted for Admin Approval.");
      }
    } else {
      // Wallet Transfer

      // Special Handling for Marathon/Sprint/Anchor Plans: Use RPC Logic
      const planType = selectedPlanObj?.plan?.type || selectedPlanObj?.type; // Safe access

      if (
        planType === "marathon" ||
        planType === "sprint" ||
        planType === "anchor" ||
        planType === "step_up" ||
        planType === "monthly_bloom" ||
        planType === "ajo_circle" ||
        planType === "daily_drop"
      ) {
        // Process Deposit via RPC (Atomic Wallet Deduction + Metadata Update)
        let rpcName = "";
        if (planType === "marathon") rpcName = "process_marathon_deposit";
        else if (planType === "sprint") rpcName = "process_sprint_deposit";
        else if (planType === "anchor") rpcName = "process_anchor_deposit";
        else if (planType === "step_up") rpcName = "process_step_up_deposit";
        else if (planType === "monthly_bloom") rpcName = "process_monthly_bloom_deposit";
        else if (planType === "ajo_circle") rpcName = "process_ajo_circle_deposit";
        else if (planType === "daily_drop") rpcName = "process_daily_drop_deposit";
        else rpcName = "process_daily_drop_deposit";

        // Handle Upfront Fee Splitting strictly for Fixed Advance Payments
        const isUpfrontAdvance = isAdvanceMode && ["ajo_circle", "step_up"].includes(planType);

        const rpcPayload: any = {
          p_user_id: user.id,
          p_plan_id: selectedPlanObj.id,
          p_amount: isUpfrontAdvance ? Number(amount) || 0 : totalDeduction,
          p_num_units: isAdvanceMode ? parseInt(numUnits) : null,
        };

        if (isUpfrontAdvance) {
          rpcPayload.p_fee = fee;
        }

        const { data: rpcData, error: rpcError } = await supabase.rpc(rpcName, rpcPayload);

        if (rpcError) {
          console.error(`${planType} RPC Error:`, rpcError);
          toast.error(`Transfer failed: ${rpcError.message}`);
        } else {
          let msg = "Deposit Successful!";
          if (planType === "marathon")
            msg = `Marathon Contribution Successful! Week ${rpcData.week_paid} paid.`;
          else if (planType === "sprint")
            msg = `Sprint Goal Updated! Week Progress: ${formatCurrency(rpcData.week_total)}`;
          else if (planType === "anchor")
            msg = `Anchor Goal Updated! Week Progress: ${formatCurrency(rpcData.week_total)}`;
          else if (planType === "step_up")
            msg = `Step-Up Deposit Successful! Weekly Target Progress Updated.`;
          else if (planType === "monthly_bloom")
            msg = `Monthly Bloom Deposit Successful! Progress Updated.`;
          else if (planType === "ajo_circle")
            msg = `Ajo Circle Deposit Successful! Week ${rpcData.week} Paid.`;
          else if (planType === "daily_drop")
            msg = `Daily Drop Successful! ${rpcData.days_advanced} Days Advanced.`;

          logActivity({
            userId: user.id,
            action: "DEPOSIT",
            details: {
              amount: finalAmount,
              plan_name: selectedPlanObj?.plan?.name || selectedPlanObj?.name || "Savings Plan",
              display_name: user.user_metadata?.full_name?.split(" ")[0] || "A user",
            },
          });

          // Trigger notification for adding funds to plan
          if (user.email) {
            const planName = selectedPlanObj?.plan?.name || selectedPlanObj?.name || "Savings Plan";
            await notificationDispatcher.sendAlert({
              userId: user.id,
              email: user.email,
              type: "plan",
              title: `Funds Added to Plan: ${planName}`,
              message: `You have successfully transferred ₦${formatCurrency(finalAmount)} from your wallet to your "${planName}" savings plan.`,
              planId: selectedPlanObj?.id || selectedPlanId,
            });
          }

          // Fallback Activation: Ensure plan becomes active if it was pending
          if (
            selectedPlanObj?.status === "pending_activation" ||
            selectedPlanObj?.status === "pending_turn_approval" ||
            selectedPlanObj?.status === "turn_reassigned"
          ) {
            await supabase
              .from("user_plans")
              .update({ status: "active" })
              .eq("id", selectedPlanObj.id);
          }

          finishSuccess(msg);
        }
        setUploading(false);
        return;
      }

      // Standard Plan Logic (Double Insert + Manual Update)
      const relatedId = crypto.randomUUID();
      const { error: txError } = await supabase.from("transactions").insert([
        {
          user_id: user.id,
          amount: finalAmount,
          type: "transfer",
          status: "completed",
          description: `Transfer to ${selectedPlanObj?.name}`,
          plan_id: null, // From General
          charge: fee, // Apply fee to the debit record
          related_id: relatedId,
        },
        {
          user_id: user.id,
          amount: finalAmount, // Positive amount
          type: "transfer",
          status: "completed",
          description: `Transfer from Wallet`,
          plan_id: selectedPlanId, // To Plan
          charge: 0,
          related_id: relatedId,
        },
      ]);

      if (txError) {
        toast.error(`Transfer failed: ${txError.message}`);
        console.error(txError);
      } else {
        const updateSuccess = await updatePlanBalance(selectedPlanId);
        if (updateSuccess) {
          logActivity({
            userId: user.id,
            action: "DEPOSIT",
            details: {
              amount: finalAmount,
              plan_name: selectedPlanObj?.name || "Savings Plan",
              display_name: user.user_metadata?.full_name?.split(" ")[0] || "A user",
            },
          });

          // Trigger notification for adding funds to plan
          if (user.email) {
            const planName = selectedPlanObj?.name || "Savings Plan";
            await notificationDispatcher.sendAlert({
              userId: user.id,
              email: user.email,
              type: "plan",
              title: `Funds Added to Plan: ${planName}`,
              message: `You have successfully transferred ₦${formatCurrency(finalAmount)} from your wallet to your "${planName}" savings plan.`,
              planId: selectedPlanId,
            });
          }

          finishSuccess("Transfer successful!");
        }
      }
    }
    setUploading(false);
  }

  async function updatePlanBalance(userPlanId: string) {
    try {
      // Recalculate balance from transaction history for accuracy
      const { data: txs, error: txError } = await supabase
        .from("transactions")
        .select("amount, charge, type")
        .eq("plan_id", selectedPlanId)
        .eq("status", "completed");

      if (txError) {
        console.error("Error fetching transactions for balance update:", txError);
        return false;
      }

      let calculatedBalance = 0;
      if (txs) {
        calculatedBalance = txs.reduce((acc, tx) => {
          const amt = Number(tx.amount || 0);
          const chg = Number(tx.charge || 0);
          // Assume additive for plan deposits/transfers
          return acc + amt - chg;
        }, 0);
      }

      // Prepare update object
      const updates: any = { current_balance: calculatedBalance };

      // Check if we should activate the plan (if it has funds)
      if (calculatedBalance > 0) {
        // We could check current status first, but setting 'active' blindly if balance > 0 is safe for now
        // or we can fetch current status.
        updates.status = "active";
      }

      const { error: updateError } = await supabase
        .from("user_plans")
        .update(updates)
        .eq("id", userPlanId);

      if (updateError) {
        console.error("Error updating plan balance/status:", updateError);
        return false;
      }
      return true;
    } catch (err) {
      console.error("Unexpected error updating balance:", err);
      return false;
    }
  }

  function finishSuccess(msg: string) {
    toast.success(msg);
    setAmount("");
    setReceiptFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (!defaultPlanId) {
      setSelectedPlanId("");
    }
    onSuccess();
    onClose();
  }

  // Derived state for the currently selected plan
  // myPlans now contains unique, prioritized UserPlan objects.
  // Match by UserPlan ID (UUID) OR template Plan ID as fallback
  const selectedPlanObj =
    myPlans.find((p) => p.id === selectedPlanId) ||
    myPlans.find((p) => p.plan_id === selectedPlanId);

  // Basic plan info
  const planType = selectedPlanObj?.plan?.type || selectedPlanObj?.type;

  // Helper to get the mandated fixed amount (if any)
  const getMandatedAmount = (userPlan: any) => {
    if (!userPlan) return 0;
    // Advance mode resets mandated amount to 0 (user chooses any amount)
    // Wait, for Daily Drop, user says: "it's auto-calculated and allocated to days... based on their selected amount or duration."
    // So for advance mode, we don't MANDATE, but we ALLOW anything.

    const planType = userPlan.plan?.type || userPlan.type;
    const meta = userPlan.plan_metadata || {};

    let amount: any = 0;

    // 1. Monthly Bloom - Goal based flexible (CHECK THIS FIRST BECAUSE DB MIGHT BE MARKED AS FIXED)
    if (planType === "monthly_bloom" || userPlan.plan?.type === "monthly_bloom") {
      const currentMonthTotal = parseFloat(meta.month_paid_so_far || 0);
      const target = parseFloat(meta.target_amount || 20000);
      if (currentMonthTotal < target) {
        amount = target - currentMonthTotal;
      } else {
        amount = 0;
      }
    }
    // 2. Ajo Circle, Daily Drop, Rapid Fixed (Strictly Fixed ALWAYS)
    else if (
      planType === "ajo_circle" ||
      planType === "daily_drop" ||
      planType === "step_up" ||
      userPlan.plan?.contribution_type === "fixed"
    ) {
      if (
        planType === "ajo_circle" &&
        isAdvanceMode &&
        selectedSlotIndex !== "all" &&
        meta.slots?.length > 0
      ) {
        amount = meta.slots[selectedSlotIndex]?.amount || 0;
      } else {
        amount = meta?.fixed_amount || userPlan.plan?.fixed_amount || 0;
      }
    }
    // 3. Marathon, Sprint, Anchor (Flexible Weekly min ₦3k)
    else if (["marathon", "sprint", "anchor"].includes(planType)) {
      const currentWeekTotal = meta.current_week_total || 0;
      const target = 3000;
      if (currentWeekTotal < target) {
        amount = target - currentWeekTotal;
      } else {
        amount = 0; // Met, flexible
      }
    }

    // Ensure it's a number
    const num = parseFloat(amount);
    return isNaN(num) ? 0 : num;
  };

  const mandatedAmount = activeTab === "wallet" ? getMandatedAmount(selectedPlanObj) : 0;

  // Logic for determining if the input should be disabled
  const isInputLocked = () => {
    return planType === "step_up";
  };

  const getPeriodsCovered = () => {
    if (!selectedPlanObj || !amount || parseFloat(amount) <= 0) return 0;
    const planType = selectedPlanObj.plan?.type || selectedPlanObj.type;
    const amt = parseFloat(amount);

    if (["marathon", "sprint", "anchor"].includes(planType)) {
      return Math.floor(amt / 3000);
    }
    if (planType === "monthly_bloom") {
      const target = parseFloat(selectedPlanObj?.plan_metadata?.target_amount || 20000);
      return Math.floor(amt / target);
    }
    if (planType === "daily_drop") {
      const meta = selectedPlanObj.plan_metadata || {};
      const fixedAmt = meta.fixed_amount || selectedPlanObj.plan?.fixed_amount || 0;
      return fixedAmt > 0 ? Math.floor(amt / fixedAmt) : 1;
    }
    if (planType === "step_up") {
      const meta = selectedPlanObj.plan_metadata || {};
      const fixedAmt = meta.fixed_amount || selectedPlanObj.plan?.fixed_amount || 0;
      return fixedAmt > 0 ? Math.floor(amt / fixedAmt) : 1;
    }
    if (planType === "ajo_circle") {
      // For ajo_circle, we use getMandatedAmount instead of fixed amount globally since it handles slots
      const fixedAmt = getMandatedAmount(selectedPlanObj);
      return fixedAmt > 0 ? Math.floor(amt / fixedAmt) : 1;
    }
    return 1;
  };

  const periodsCovered = getPeriodsCovered();

  const getRemainingToGoal = () => {
    if (!selectedPlanObj) return 0;
    const planType = selectedPlanObj.plan?.type || selectedPlanObj.type;
    const meta = selectedPlanObj.plan_metadata || {};

    if (["marathon", "sprint", "anchor"].includes(planType)) {
      const totalGoal = 3000 * (selectedPlanObj.plan?.config?.duration_weeks || 10);
      const saved = meta.total_saved || 0;
      return totalGoal - saved;
    }
    if (planType === "monthly_bloom") {
      const target = parseFloat(meta.target_amount || 20000);
      const duration = selectedPlanObj.plan?.config?.duration_months || 3;
      const totalGoal = target * duration;
      const saved = meta.total_saved || 0;
      return totalGoal - saved;
    }
    if (planType === "daily_drop" || planType === "step_up" || planType === "ajo_circle") {
      const fixedAmt = meta.fixed_amount || selectedPlanObj.plan?.fixed_amount || 0;
      const duration =
        selectedPlanObj.plan?.config?.duration_days ||
        selectedPlanObj.plan?.config?.duration_weeks ||
        10;
      const totalGoal = fixedAmt * duration;
      const saved = meta.total_saved || 0;
      return totalGoal - saved;
    }
    return 0;
  };

  const remainingToGoal = getRemainingToGoal();
  const isExcess =
    remainingToGoal > 0 && parseFloat(amount || "0") > remainingToGoal && planType !== "step_up";

  const maxUnits =
    mandatedAmount > 0 && remainingToGoal > 0
      ? Math.max(1, Math.floor(remainingToGoal / mandatedAmount))
      : undefined;

  const periodLabel =
    selectedPlanObj?.plan?.type === "monthly_bloom"
      ? "Month"
      : selectedPlanObj?.plan?.type === "daily_drop"
        ? "Day"
        : "Week";

  useEffect(() => {
    if (selectedPlanObj) {
      const amt = getMandatedAmount(selectedPlanObj);
      // Use microtask to avoid cascading render lint error
      Promise.resolve().then(() => {
        if (amt > 0) {
          setAmount(amt.toString());
          setAmountPerUnit(amt.toString());
        } else {
          // If no mandated amount, reset to empty to avoid stale values from previous plans
          setAmount("");
          setAmountPerUnit("");
        }
      });
    }
  }, [selectedPlanId, selectedPlanObj]);

  // Update total amount when units change in advance mode
  useEffect(() => {
    if (isAdvanceMode) {
      let unitAmt = 0;
      if (selectedPlanObj) {
        const planType = selectedPlanObj.plan?.type || selectedPlanObj.type;
        if (["ajo_circle", "daily_drop", "step_up"].includes(planType)) {
          // Use mandated amount as the unit base for fixed plans
          unitAmt = getMandatedAmount(selectedPlanObj);
        } else {
          unitAmt = parseFloat(amountPerUnit) || 0;
        }
      }

      const total = (parseInt(numUnits) || 0) * unitAmt;
      // Use microtask to avoid cascading render lint error
      Promise.resolve().then(() => {
        if (unitAmt > 0) {
          setAmount(total > 0 ? total.toString() : "");
          // Also sync amountPerUnit purely for display
          setAmountPerUnit(unitAmt.toString());
        } else {
          const fallbackTotal = (parseInt(numUnits) || 0) * (parseFloat(amountPerUnit) || 0);
          setAmount(fallbackTotal > 0 ? fallbackTotal.toString() : "");
        }
      });
    }
  }, [isAdvanceMode, numUnits, amountPerUnit, selectedSlotIndex, selectedPlanObj]);

  const getFee = () => {
    if (!selectedPlanObj) return 0;
    const plan = selectedPlanObj.plan || selectedPlanObj;
    const userPlan = selectedPlanObj;

    // Deferred fee plans (fees collected at the end of the period via cron)
    const deferredFeePlans = [
      "anchor",
      "sprint",
      "marathon",
      "ajo_circle",
      "monthly_bloom",
      "step_up",
    ];
    if (deferredFeePlans.includes(plan.type)) {
      // Advance Mode Exception for Fixed Plans: Charge Upfront
      if (isAdvanceMode && ["ajo_circle", "step_up"].includes(plan.type)) {
        // Proceed to calculate upfront fee
      } else {
        return 0;
      }
    }

    // Fix: Don't show service fee for plans that have already been activated or have any previous activity
    // Use fortified shared activation check
    const isActivated = checkIsActivated(userPlan);
    const meta = userPlan.plan_metadata || {};
    const lastFeeDate = meta.last_fee_date ? new Date(meta.last_fee_date) : null;
    const now = new Date();
    const daysSinceLastFee = lastFeeDate
      ? Math.floor((now.getTime() - lastFeeDate.getTime()) / (1000 * 60 * 60 * 24))
      : 999;

    // Suppress fee if already activated AND (not recurring OR already paid this cycle/month)
    // Exception: If we are making an advance payment for fixed plans, ALWAYS calculate the fee!
    if (isActivated && !(isAdvanceMode && ["ajo_circle", "step_up"].includes(plan.type))) {
      if (!plan.service_charge_is_recurring) return 0;
      if (daysSinceLastFee < 30) return 0;
    }

    const amt = mandatedAmount > 0 ? mandatedAmount : Number(amount) || 0;

    if (plan.service_charge_type === "percentage") {
      return (amt * (plan.service_charge_percentage || 0)) / 100;
    }

    if (plan.service_charge_type === "tiered" && plan.service_charge_tiers) {
      const tiers = plan.service_charge_tiers as { min: number; max: number; fee: number }[];

      // Fix: Ajo Multi-slot Tiered Fee Calculation
      if (
        plan.type === "ajo_circle" &&
        selectedSlotIndex === "all" &&
        userPlan.plan_metadata?.slots?.length > 1
      ) {
        let totalFee = 0;
        const slots = userPlan.plan_metadata.slots;
        // The total units being paid for
        const units = isAdvanceMode ? parseInt(numUnits) || 1 : 1;

        for (const slot of slots) {
          const slotTier = tiers.find(
            (t) => slot.amount >= t.min && (slot.amount <= t.max || t.max === 0),
          );
          if (slotTier) {
            totalFee += slotTier.fee * units;
          }
        }
        return totalFee;
      }

      const tier = tiers.find((t) => amt >= t.min && (amt <= t.max || t.max === 0));
      return tier ? tier.fee : 0;
    }

    // Default to fixed or existing service_charge
    return Number(plan.service_charge_fixed || plan.service_charge || 0);
  };
  const fee = getFee();

  // Check if the plan is already fully activated (has balance, status, or activity)
  const currentIsActivated = checkIsActivated(selectedPlanObj);

  // CRITICAL: Total deduction from WALLET is amount + fee
  // EXCEPTION: Daily Drop 100% fees are "inclusive" (the user just pays the fixed amount)
  // Inclusive fee logic only applies during INITIAL setup (not activated yet)
  const isInclusiveFee = planType === "daily_drop" && !currentIsActivated;

  const totalDeduction = isInclusiveFee ? Number(amount) || 0 : (Number(amount) || 0) + fee;

  return (
    <DialogContent className="dark:bg-gray-900 dark:border-gray-800 max-w-md max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="dark:text-white">Add Funds</DialogTitle>
        <DialogDescription className="dark:text-gray-400">
          Choose a payment method to add funds.
        </DialogDescription>
      </DialogHeader>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        {/* 
                    Tabs Logic:
                    1. When TOPPING UP General Wallet (isPlanFunding = false), only show EXTERNAL tab.
                    2. When FUNDING a Plan (isPlanFunding = true), only show WALLET tab.
                */}
        <TabsList className="grid w-full grid-cols-1 mb-4 dark:bg-gray-800">
          {isPlanFunding ? (
            <TabsTrigger
              value="wallet"
              className="dark:data-[state=active]:bg-gray-700 dark:text-gray-400 dark:data-[state=active]:text-white"
            >
              Fund Plan from Wallet
            </TabsTrigger>
          ) : (
            <TabsTrigger
              value="external"
              className="dark:data-[state=active]:bg-gray-700 dark:text-gray-400 dark:data-[state=active]:text-white"
            >
              External Deposit to Wallet
            </TabsTrigger>
          )}
        </TabsList>

        {!isPlanFunding && (
          <TabsContent value="external" className="space-y-4">
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-indigo-900 via-indigo-800 to-emerald-900 p-6 text-white shadow-xl">
              <div className="absolute right-0 top-0 h-32 w-32 -translate-y-8 translate-x-8 rounded-full bg-white/5 blur-2xl"></div>
              <div className="mb-8 flex justify-between items-start">
                <div>
                  <p className="text-xs text-indigo-200 uppercase tracking-wider mb-1">
                    Payable ONLY TO
                  </p>
                  <h3 className="tex-lg font-bold">{bankDetails.account_name}</h3>
                </div>
                <CreditCard className="h-8 w-8 text-white/80" />
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-indigo-200">Bank Name</p>
                  <p className="font-semibold tracking-wide">{bankDetails.bank_name}</p>
                </div>
                <div>
                  <p className="text-xs text-indigo-200">Account Number</p>
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-xl tracking-widest">
                      {bankDetails.account_number}
                    </p>
                    <button
                      onClick={() => copyToClipboard(bankDetails.account_number)}
                      className="rounded-full bg-white/10 p-1.5 hover:bg-white/20 transition-colors"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-2">
              <Label className="dark:text-gray-300">Target Destination</Label>
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-emerald-600" />
                  <span className="text-sm font-medium dark:text-white">General Wallet</span>
                </div>
                <span className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 px-2 py-0.5 rounded font-bold uppercase">
                  Auto-Selected
                </span>
              </div>
              <p className="text-[10px] text-gray-500 dark:text-gray-400">
                External deposits are processed into your general wallet. You can fund specific
                plans from the "Pay from Wallet" tab after approval.
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="amount-ex" className="dark:text-gray-300">
                Amount
              </Label>
              <Input
                id="amount-ex"
                type="number"
                onKeyDown={(e) => {
                  if (["-", "+", ".", "e", "E"].includes(e.key)) e.preventDefault();
                }}
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={isInputLocked()}
                className={`dark:bg-gray-800 dark:border-gray-700 dark:text-white disabled:opacity-70 disabled:cursor-not-allowed ${!isInputLocked() && !isAdvanceMode && amount && parseFloat(amount) < mandatedAmount ? "border-red-500 focus-visible:ring-red-500" : ""}`}
              />
              {isAdvanceMode && periodsCovered > 0 && (
                <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider">
                  ✨ This covers {periodsCovered} {periodLabel}
                  {periodsCovered > 1 ? "s" : ""} in advance
                </p>
              )}
              {isExcess && (
                <p className="text-[10px] text-amber-600 font-bold bg-amber-50 dark:bg-amber-900/20 p-2 rounded border border-amber-100 dark:border-amber-800 flex items-center gap-2">
                  <AlertTriangle className="w-3 h-3 text-amber-500" />
                  <span>
                    Exceeds goal! You only need <strong>₦{formatCurrency(remainingToGoal)}</strong>{" "}
                    to reach your target.
                  </span>
                </p>
              )}
              {!isInputLocked() &&
                !isAdvanceMode &&
                amount &&
                parseFloat(amount) < mandatedAmount && (
                  <p className="text-[10px] text-red-500 font-medium">
                    Minimum contribution is ₦{formatCurrency(mandatedAmount)}
                  </p>
                )}
              {["anchor", "sprint", "marathon", "step_up", "monthly_bloom"].includes(planType) &&
                !isAdvanceMode && (
                  <p className="text-[10px] text-indigo-600 font-bold bg-indigo-50 dark:bg-indigo-900/20 p-2 rounded border border-indigo-100 dark:border-indigo-800 flex items-center gap-2">
                    💡{" "}
                    <span>You can deposit more than the minimum to reach your target faster!</span>
                  </p>
                )}
              {(isInputLocked() || mandatedAmount > 0 || fee > 0) && (
                <div className="mt-2 rounded-lg bg-gray-50 dark:bg-gray-800 p-3 border border-gray-100 dark:border-gray-700 space-y-2">
                  {(isInputLocked() || mandatedAmount > 0) && (
                    <div className="space-y-1 mb-2">
                      {selectedPlanObj?.plan_metadata?.arrears_amount > 0 && (
                        <div className="flex justify-between items-center text-[10px] text-red-600 font-bold uppercase tracking-wider">
                          <span>Arrears (Missed)</span>
                          <span>
                            ₦{formatCurrency(selectedPlanObj.plan_metadata.arrears_amount)}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between items-center text-xs font-semibold text-amber-700 dark:text-amber-500">
                        <span>
                          {isInputLocked()
                            ? "Fixed Contribution"
                            : planType === "monthly_bloom"
                              ? "Monthly Target"
                              : planType === "daily_drop"
                                ? "Daily Savings Amount"
                                : "Minimum Due Today"}
                        </span>
                        <span>
                          ₦
                          {formatCurrency(
                            selectedPlanObj?.plan_metadata?.due_today_amount || mandatedAmount,
                          )}
                        </span>
                      </div>
                    </div>
                  )}
                  {fee > 0 && (
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-500 dark:text-gray-400">Service Charge</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        ₦{formatCurrency(fee)}
                      </span>
                    </div>
                  )}
                  <div className="pt-2 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center text-sm font-bold">
                    <span className="text-gray-700 dark:text-gray-300">Total Deduction</span>
                    <span className="text-emerald-600 dark:text-emerald-400">
                      ₦{formatCurrency(totalDeduction)}
                    </span>
                  </div>
                  {fee > 0 && (
                    <div className="mt-2 p-2 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800 rounded flex items-start gap-2">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
                      <div className="space-y-1">
                        <p className="text-[10px] text-amber-700 dark:text-amber-400 leading-tight font-bold">
                          Deduction Notice
                        </p>
                        <p className="text-[10px] text-amber-600 dark:text-amber-500 leading-tight">
                          A service charge of ₦{formatCurrency(fee)} will be deducted immediately
                          from your general wallet in addition to your contribution. Total: ₦
                          {formatCurrency(totalDeduction)}.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="grid gap-2">
              <Label className="dark:text-gray-300">Payment Receipt</Label>
              <div className="flex items-center justify-center w-full">
                <label
                  htmlFor="dropzone-file-ex"
                  className={`relative flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-lg cursor-pointer transition-colors overflow-hidden ${receiptFile ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/10" : "border-gray-300 bg-gray-50 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-700 dark:hover:border-gray-500 dark:hover:bg-gray-600"}`}
                >
                  {previewUrl ? (
                    <div className="relative w-full h-full flex items-center justify-center group">
                      <img
                        src={previewUrl}
                        alt="Receipt preview"
                        className="w-full h-full object-contain p-2"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="bg-white/90 rounded-full p-2">
                          <Upload className="w-6 h-6 text-gray-700" />
                        </div>
                      </div>
                      <div className="absolute bottom-2 left-0 right-0 text-center">
                        <span className="text-xs text-white bg-black/50 px-2 py-1 rounded">
                          {receiptFile?.name}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center">
                      <Upload className="w-8 h-8 mb-3 text-gray-400" />
                      <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                        <span className="font-semibold">Click to upload</span> receipt
                      </p>
                    </div>
                  )}
                  <Input
                    id="dropzone-file-ex"
                    type="file"
                    className="hidden"
                    accept="image/*,application/pdf"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileChange(e.target.files[0]);
                      }
                    }}
                  />
                </label>
                {previewUrl && (
                  <div className="flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={removeFile}
                      className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 px-2 h-8"
                    >
                      <Trash2 className="w-3 h-3 mr-1.5" /> Remove File
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <Button
              onClick={() => handleDeposit("external")}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={uploading || !amount || !receiptFile || isExcess}
            >
              {uploading
                ? "Processing..."
                : isExcess
                  ? "Amount Exceeds Target"
                  : "Confirm External Deposit"}
            </Button>
          </TabsContent>
        )}

        <TabsContent value="wallet" className={isPlanFunding ? "pt-0 space-y-4" : "space-y-4"}>
          <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-full">
                <Wallet className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Available General Balance
                </p>
                <p className="text-xl font-bold dark:text-white">
                  {loadingBalance ? "Loading..." : `₦${formatCurrency(generalBalance)}`}
                </p>
              </div>
            </div>
          </div>

          {generalBalance <= 0 && !loadingBalance && (
            <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800 flex flex-col gap-2">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <p>
                  You need funds in your General Wallet to fund this plan. Please top up your wallet
                  first.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full border-amber-200 text-amber-700 hover:bg-amber-100 dark:border-amber-800 dark:text-amber-400 dark:hover:bg-amber-900/40"
                onClick={() => {
                  // Reset to Wallet Top-up mode
                  window.location.href = "/dashboard/wallet";
                }}
              >
                Go to Wallet to Top Up
              </Button>
            </div>
          )}

          {generalBalance > 0 && amount && totalDeduction > generalBalance && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800 flex flex-col gap-2 animate-in fade-in slide-in-from-top-1">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <p>
                  Insufficient funds. You need ₦{formatCurrency(totalDeduction)} but only have ₦
                  {formatCurrency(generalBalance)}.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full border-red-200 text-red-700 hover:bg-red-100 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/40"
                onClick={() => {
                  window.location.href = "/dashboard/wallet";
                }}
              >
                Top Up Wallet
              </Button>
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="plan-w" className="dark:text-gray-300">
              Target Plan
            </Label>
            <select
              id="plan-w"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
              value={selectedPlanId}
              onChange={(e) => setSelectedPlanId(e.target.value)}
            >
              <option value="" disabled>
                Select a Plan
              </option>
              {myPlans.map((up) => (
                <option key={up.id} value={up.id}>
                  {up.plan.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="amount-w" className="dark:text-gray-300">
              {isAdvanceMode ? `Amount per ${periodLabel}` : "Amount to Transfer"}
            </Label>

            {isAdvanceMode &&
              planType === "ajo_circle" &&
              selectedPlanObj?.plan_metadata?.slots?.length > 1 && (
                <div className="mb-2">
                  <Label className="text-[10px] text-gray-500 uppercase font-bold">
                    Payment Target
                  </Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-800 dark:border-gray-700 dark:text-white mt-1"
                    value={selectedSlotIndex.toString()}
                    onChange={(e) =>
                      setSelectedSlotIndex(
                        e.target.value === "all" ? "all" : parseInt(e.target.value),
                      )
                    }
                  >
                    <option value="all">
                      Full Weekly Commitment (₦
                      {formatCurrency(selectedPlanObj.plan_metadata.fixed_amount || 0)})
                    </option>
                    {selectedPlanObj.plan_metadata.slots.map((slot: any, idx: number) => (
                      <option key={idx} value={idx}>
                        Slot {idx + 1} - Week {slot.proposed_week} (₦{formatCurrency(slot.amount)})
                      </option>
                    ))}
                  </select>
                </div>
              )}

            {isAdvanceMode ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="num-units"
                      className="text-[10px] text-gray-500 uppercase font-bold"
                    >
                      Number of {periodLabel}s
                    </Label>
                    <Input
                      id="num-units"
                      type="number"
                      onKeyDown={(e) => {
                        if (["-", "+", ".", "e", "E"].includes(e.key)) e.preventDefault();
                      }}
                      min="1"
                      max={maxUnits}
                      value={numUnits}
                      onChange={(e) => {
                        let val = parseInt(e.target.value);
                        if (maxUnits && val > maxUnits) val = maxUnits;
                        setNumUnits(isNaN(val) ? "" : val.toString());
                      }}
                      className="dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="unit-amount"
                      className="text-[10px] text-gray-500 uppercase font-bold"
                    >
                      ₦ Per {periodLabel}
                    </Label>
                    <Input
                      id="unit-amount"
                      type="number"
                      step="50"
                      onKeyDown={(e) => {
                        if (["-", "+", ".", "e", "E"].includes(e.key)) e.preventDefault();
                      }}
                      placeholder="50"
                      value={amountPerUnit}
                      onChange={(e) => setAmountPerUnit(e.target.value)}
                      disabled={["step_up", "ajo_circle", "daily_drop"].includes(planType || "")}
                      className="dark:bg-gray-800 dark:border-gray-700 dark:text-white disabled:opacity-70 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                      Total Contribution
                    </span>
                    <span className="text-sm font-bold text-emerald-800 dark:text-emerald-200">
                      ₦{formatCurrency(Number(amount) || 0)}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <Input
                id="amount-w"
                type="number"
                step="50"
                onKeyDown={(e) => {
                  if (["-", "+", ".", "e", "E"].includes(e.key)) e.preventDefault();
                }}
                placeholder="50"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                max={generalBalance}
                disabled={isInputLocked()}
                className={`dark:bg-gray-800 dark:border-gray-700 dark:text-white disabled:opacity-70 disabled:cursor-not-allowed ${!isInputLocked() && !isAdvanceMode && amount && parseFloat(amount) < mandatedAmount ? "border-red-500 focus-visible:ring-red-500" : ""}`}
              />
            )}
            {["anchor", "sprint", "marathon", "step_up", "monthly_bloom"].includes(planType) &&
              !isAdvanceMode && (
                <p className="text-[10px] text-indigo-600 font-bold bg-indigo-50 dark:bg-indigo-900/20 p-2 rounded border border-indigo-100 dark:border-indigo-800 flex items-center gap-2">
                  💡 <span>You can deposit more than the minimum to reach your target faster!</span>
                </p>
              )}

            {isAdvanceMode && (Number(amount) || 0) > 0 && (
              <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider">
                ✨ This covers {numUnits} {periodLabel}
                {parseInt(numUnits) > 1 ? "s" : ""} in advance
              </p>
            )}
            {!isAdvanceMode &&
              selectedPlanId &&
              mandatedAmount === 0 &&
              (Number(amount) || 0) > 0 && (
                <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider">
                  ✨ Save More for the {planType === "monthly_bloom" ? "Month" : "Week"}
                </p>
              )}
            {isExcess && (
              <p className="text-[10px] text-amber-600 font-bold bg-amber-50 dark:bg-amber-900/20 p-2 rounded border border-amber-100 dark:border-amber-800 flex items-center gap-2">
                <AlertTriangle className="w-3 h-3 text-amber-500" />
                <span>
                  Exceeds goal! You only need <strong>₦{formatCurrency(remainingToGoal)}</strong> to
                  reach your target.
                </span>
              </p>
            )}
            {(isInputLocked() || mandatedAmount > 0 || fee > 0) && (
              <div className="mt-2 rounded-lg bg-gray-50 dark:bg-gray-800 p-3 border border-gray-100 dark:border-gray-700 space-y-2">
                {(isInputLocked() || mandatedAmount > 0) && (
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-500 dark:text-gray-400">
                      {isInputLocked()
                        ? "Fixed Contribution"
                        : planType === "monthly_bloom"
                          ? "Monthly Target"
                          : planType === "daily_drop"
                            ? "Daily Savings Amount"
                            : "Minimum Target"}
                    </span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      ₦{formatCurrency(mandatedAmount)}
                    </span>
                  </div>
                )}
                {fee > 0 && (
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-500 dark:text-gray-400">Service Charge</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      ₦{formatCurrency(fee)}
                    </span>
                  </div>
                )}
                <div className="pt-2 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center text-sm font-bold">
                  <span className="text-gray-700 dark:text-gray-300">Total Deduction</span>
                  <span className="text-emerald-600 dark:text-emerald-400">
                    ₦{formatCurrency(totalDeduction)}
                  </span>
                </div>
                {fee > 0 && (
                  <div className="mt-2 p-2 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800 rounded flex items-start gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
                    <div className="space-y-1">
                      <p className="text-[10px] text-amber-700 dark:text-amber-400 leading-tight font-bold">
                        Immediate Deduction
                      </p>
                      <p className="text-[10px] text-amber-600 dark:text-amber-500 leading-tight">
                        {isInclusiveFee
                          ? `Your ₦${formatCurrency(mandatedAmount)} payment will be deducted as a service charge.`
                          : `₦${formatCurrency(fee)} service charge + ₦${formatCurrency(Number(amount) || 0)} contribution will be deducted from your wallet.`}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <Button
            onClick={() => handleDeposit("wallet")}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
            disabled={
              uploading || !amount || !selectedPlanId || generalBalance < totalDeduction || isExcess
            }
          >
            {uploading ? "Processing..." : isExcess ? "Amount Exceeds Target" : "Confirm Transfer"}
          </Button>
        </TabsContent>
      </Tabs>
    </DialogContent>
  );
}
