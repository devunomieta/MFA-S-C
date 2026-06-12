import { useState, useEffect } from "react";

import {
  Loader2,
  Calendar,
  Settings,
  Users,
  CheckSquare,
  AlertTriangle,
  PiggyBank,
} from "lucide-react";
import { toast } from "sonner";

import { ActionConfirmModal } from "@/app/components/ui/ActionConfirmModal";
import { Badge } from "@/app/components/ui/badge";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/components/ui/table";
import { supabase } from "@/lib/supabase";

export function AjoCircleAdminView() {
  const [subscribers, setSubscribers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [newDuration, setNewDuration] = useState(10);
  const [newStartDate, setNewStartDate] = useState("");
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    desc: string;
    action: () => Promise<void>;
  } | null>(null);

  const [reviewedUser, setReviewedUser] = useState<any | null>(null);
  const [reviewedProfile, setReviewedProfile] = useState<any | null>(null);
  const [reviewedPlans, setReviewedPlans] = useState<any[]>([]);
  const [reviewedWalletBalance, setReviewedWalletBalance] = useState(0);
  const [reviewedWithdrawableBalance, setReviewedWithdrawableBalance] = useState(0);
  const [assignedWeeks, setAssignedWeeks] = useState<number[]>([]);
  const [loadingReview, setLoadingReview] = useState(false);

  const fetchSubscribers = async () => {
    // Get Plan ID
    const { data: planData } = await supabase
      .from("plans")
      .select("id, config")
      .eq("type", "ajo_circle")
      .single();

    if (planData) {
      if (planData.config?.duration_weeks) {
        setNewDuration(planData.config.duration_weeks);
      }
      if (planData.config?.season_start_date) {
        setNewStartDate(planData.config.season_start_date);
      }

      const { data, error } = await supabase
        .from("user_plans")
        .select("*, profiles(full_name, email, phone, created_at, is_red_flagged, is_frozen)")
        .eq("plan_id", planData.id)
        .neq("status", "cancelled");

      if (error) {
        console.error("Error fetching subscribers:", error);
        toast.error("Failed to load subscribers");
      } else {
        setSubscribers(data || []);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    Promise.resolve().then(() => fetchSubscribers());
  }, []);

  const syncMetadataForTurns = (meta: any, newTurns: number[]) => {
    let newSlots = [...(meta.slots || [])];
    if (newTurns.length < newSlots.length) {
      newSlots = newSlots.slice(0, newTurns.length);
    } else {
      const defaultAmt = newSlots[0]?.amount || 3000;
      while (newSlots.length < newTurns.length) {
        newSlots.push({ proposed_week: newTurns[newSlots.length], amount: defaultAmt });
      }
    }
    newSlots = newSlots.map((slot, index) => ({
      ...slot,
      proposed_week: newTurns[index],
    }));

    const totalAmt = newSlots.reduce((acc, s) => acc + s.amount, 0);

    return {
      ...meta,
      picking_turns: newTurns,
      slots: newSlots,
      fixed_amount: totalAmt,
      total_expected_per_cycle: totalAmt,
    };
  };

  const openReviewModal = async (sub: any) => {
    setReviewedUser(sub);
    setLoadingReview(true);
    setReviewedProfile(null);
    setReviewedPlans([]);
    setReviewedWalletBalance(0);
    setReviewedWithdrawableBalance(0);

    const meta = sub.plan_metadata || {};
    const initialWeeks =
      meta.picking_turns?.length > 0
        ? [...meta.picking_turns]
        : meta.slots?.map((s: any) => s.proposed_week) || meta.proposed_turns || [];
    setAssignedWeeks(initialWeeks);

    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone, created_at, is_red_flagged, is_frozen")
        .eq("id", sub.user_id)
        .single();

      if (profile) {
        setReviewedProfile(profile);
      }

      const { data: plans } = await supabase
        .from("user_plans")
        .select("*, plan:plans(*)")
        .eq("user_id", sub.user_id)
        .neq("status", "cancelled");
      if (plans) {
        setReviewedPlans(plans);
      }

      const { data: txs } = await supabase
        .from("transactions")
        .select("*, plan:plans(type, name)")
        .eq("user_id", sub.user_id)
        .eq("status", "completed");

      if (txs) {
        const gBal = txs.reduce((acc, curr) => {
          const amt = Number(curr.amount);
          const chg = Number(curr.charge || 0);
          if (curr.plan_id === null) {
            if (
              ["deposit", "loan_disbursement", "payout", "maturity_payout", "credit"].includes(
                curr.type,
              )
            ) {
              return acc + amt - chg;
            }
            if (
              [
                "withdrawal",
                "loan_repayment",
                "fee",
                "service_charge",
                "penalty",
                "debit",
              ].includes(curr.type)
            ) {
              return acc - amt - chg;
            }
            if (curr.type === "transfer" || curr.type === "internal_transfer") {
              return acc - amt - chg;
            }
            if (curr.type === "auto_save") {
              return acc - amt - chg;
            }
          }
          return acc;
        }, 0);
        setReviewedWalletBalance(gBal);

        const wBal = txs.reduce((acc, curr) => {
          const amt = Number(curr.amount);
          const chg = Number(curr.charge || 0);
          if (curr.plan?.type === "withdrawable_wallet") {
            if (
              ["deposit", "loan_disbursement", "payout", "maturity_payout", "credit"].includes(
                curr.type,
              )
            ) {
              return acc + amt - chg;
            }
            if (
              [
                "withdrawal",
                "loan_repayment",
                "fee",
                "service_charge",
                "penalty",
                "debit",
              ].includes(curr.type)
            ) {
              return acc - amt - chg;
            }
            if (curr.type === "transfer" || curr.type === "internal_transfer") {
              return acc + amt - chg;
            }
          }
          return acc;
        }, 0);
        setReviewedWithdrawableBalance(wBal);
      }
    } catch (err) {
      console.error("Error fetching review details:", err);
      toast.error("Failed to load user review profile");
    } finally {
      setLoadingReview(false);
    }
  };

  const handleToggleFreeze = async () => {
    if (!reviewedProfile) return;
    const newVal = !reviewedProfile.is_frozen;
    const { error } = await supabase
      .from("profiles")
      .update({ is_frozen: newVal })
      .eq("id", reviewedProfile.id);

    if (error) {
      toast.error("Failed to update freeze status.");
    } else {
      toast.success(newVal ? "User frozen successfully." : "User unfrozen successfully.");
      setReviewedProfile({ ...reviewedProfile, is_frozen: newVal });
      fetchSubscribers();
    }
  };

  const handleToggleRedFlag = async () => {
    if (!reviewedProfile) return;
    const newVal = !reviewedProfile.is_red_flagged;
    const { error } = await supabase
      .from("profiles")
      .update({ is_red_flagged: newVal })
      .eq("id", reviewedProfile.id);

    if (error) {
      toast.error("Failed to update red flag status.");
    } else {
      toast.success(newVal ? "User marked with red flag." : "Red flag cleared.");
      setReviewedProfile({ ...reviewedProfile, is_red_flagged: newVal });
      fetchSubscribers();
    }
  };

  const handleApproveTurn = async (userPlanId: string, accept: boolean, customWeeks?: number[]) => {
    setProcessing(true);
    const subscriber = subscribers.find((s) => s.id === userPlanId);
    if (!subscriber) {
      setProcessing(false);
      return;
    }

    try {
      const meta = subscriber.plan_metadata || {};
      let updatedMetadata = { ...meta };

      if (accept) {
        const proposed = meta.proposed_turns || [];
        updatedMetadata = syncMetadataForTurns(meta, proposed);

        const { error } = await supabase
          .from("user_plans")
          .update({
            status: "pending_activation",
            plan_metadata: updatedMetadata,
          })
          .eq("id", userPlanId);

        if (error) throw error;
        toast.success("Turns approved! Plan set to pending activation.");
      } else {
        const targetWeeks = customWeeks || assignedWeeks;
        if (!targetWeeks || targetWeeks.length === 0) {
          toast.error("Please assign weeks first.");
          setProcessing(false);
          return;
        }

        // Map reassigned weeks to slots, preserving amounts!
        const originalSlots = meta.slots || [];
        const newSlots = originalSlots.map((slot: any, idx: number) => ({
          ...slot,
          proposed_week: targetWeeks[idx] !== undefined ? targetWeeks[idx] : slot.proposed_week,
        }));

        const totalAmt = newSlots.reduce((acc: number, s: any) => acc + s.amount, 0);

        updatedMetadata = {
          ...meta,
          picking_turns: targetWeeks,
          slots: newSlots,
          fixed_amount: totalAmt,
          total_expected_per_cycle: totalAmt,
        };

        const { error } = await supabase
          .from("user_plans")
          .update({
            status: "turn_reassigned",
            plan_metadata: updatedMetadata,
          })
          .eq("id", userPlanId);

        if (error) throw error;
        toast.success("Turns reassigned! User notified to accept.");
      }
      fetchSubscribers();
    } catch (err: any) {
      toast.error(err.message || "Failed to process turn action");
    } finally {
      setProcessing(false);
    }
  };

  const handleUpdateAssignedTurnsOnly = async () => {
    if (!reviewedUser) return;
    setProcessing(true);
    try {
      const meta = reviewedUser.plan_metadata || {};
      const originalSlots = meta.slots || [];
      const newSlots = originalSlots.map((slot: any, idx: number) => ({
        ...slot,
        proposed_week: assignedWeeks[idx] !== undefined ? assignedWeeks[idx] : slot.proposed_week,
      }));

      const totalAmt = newSlots.reduce((acc: number, s: any) => acc + s.amount, 0);

      const updatedMetadata = {
        ...meta,
        picking_turns: assignedWeeks,
        slots: newSlots,
        fixed_amount: totalAmt,
        total_expected_per_cycle: totalAmt,
      };

      const { error } = await supabase
        .from("user_plans")
        .update({ plan_metadata: updatedMetadata })
        .eq("id", reviewedUser.id);

      if (error) throw error;
      toast.success("Assigned turns updated successfully.");
      fetchSubscribers();
      setReviewedUser(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to update turns");
    } finally {
      setProcessing(false);
    }
  };

  const triggerWeeklySettlement = async () => {
    setConfirmAction({
      title: "Settle Ajo Week",
      desc: "Are you sure you want to settle the week? This will apply penalties for missed payments and advance the week.",
      action: async () => {
        setProcessing(true);
        const { error } = await supabase.rpc("settle_ajo_circle_week");
        if (error) {
          toast.error(`Settlement failed: ${error.message}`);
        } else {
          toast.success("Weekly settlement completed.");
          fetchSubscribers();
        }
        setProcessing(false);
        setIsConfirmOpen(false);
      },
    });
    setIsConfirmOpen(true);
  };

  const updateSeasonConfig = async () => {
    setProcessing(true);
    const { data: plan } = await supabase
      .from("plans")
      .select("config")
      .eq("type", "ajo_circle")
      .single();
    if (!plan) return;

    const newConfig = {
      ...plan.config,
      duration_weeks: newDuration,
      season_start_date: newStartDate,
    };

    const { error } = await supabase
      .from("plans")
      .update({
        config: newConfig,
        duration_weeks: newDuration,
      })
      .eq("type", "ajo_circle");

    if (error) {
      toast.error("Failed to update season config");
    } else {
      toast.success("Season configuration updated!");
      fetchSubscribers();
    }
    setProcessing(false);
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "NGN" }).format(val);

  // Stats Calculations
  const totalSubscribers = subscribers.length;
  const pendingApprovals = subscribers.filter((s) => s.status === "pending_turn_approval").length;
  const redFlaggedCount = subscribers.filter(
    (s) => s.profiles?.is_red_flagged || s.profiles?.is_frozen,
  ).length;
  const totalPoolBalance = subscribers.reduce((sum, s) => sum + (s.current_balance || 0), 0);

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 md:px-0">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-[#0f172a] text-white p-6 md:p-8 rounded-[2.5rem] shadow-xl border border-gray-800 gap-6 relative overflow-hidden group">
        <div className="absolute -top-10 -right-10 size-40 bg-emerald-500/10 rounded-full blur-3xl group-hover:bg-emerald-500/20 transition-all duration-700" />
        <div>
          <h2 className="text-2xl font-black text-emerald-400 tracking-tight">
            Digital Ajo Plan Dashboard
          </h2>
          <p className="text-gray-400 text-xs font-semibold mt-1">
            Manage subscriber picking turns, configure weekly durations, and perform payouts.
          </p>
        </div>
        <div className="flex gap-3 shrink-0">
          <Dialog>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="border-gray-700 hover:bg-gray-800 text-white font-bold rounded-2xl"
              >
                <Settings className="w-4 h-4 mr-2 text-emerald-400" /> Ajo Settings
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-3xl bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold tracking-tight">
                  Configure Ajo Season
                </DialogTitle>
                <DialogDescription className="text-sm text-gray-500">
                  Set the duration and start date for the next plan cycle.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
                    Duration (Weeks)
                  </label>
                  <Input
                    type="number"
                    value={newDuration}
                    className="rounded-xl border-gray-100 dark:border-gray-800"
                    onChange={(e) => setNewDuration(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
                    Start Date
                  </label>
                  <Input
                    type="date"
                    value={newStartDate}
                    className="rounded-xl border-gray-100 dark:border-gray-800"
                    onChange={(e) => setNewStartDate(e.target.value)}
                  />
                </div>
                <Button
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl h-11"
                  onClick={updateSeasonConfig}
                  disabled={processing}
                >
                  {processing ? "Updating..." : "Update Season"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Button
            variant="destructive"
            className="font-bold rounded-2xl"
            onClick={triggerWeeklySettlement}
            disabled={processing}
          >
            <Calendar className="w-4 h-4 mr-2" /> Settle Week
          </Button>
        </div>
      </div>

      <ActionConfirmModal
        isOpen={isConfirmOpen}
        onOpenChange={setIsConfirmOpen}
        onConfirm={confirmAction?.action || (() => {})}
        title={confirmAction?.title || "Confirm Action"}
        description={confirmAction?.desc || "Are you sure?"}
        confirmText="Proceed"
        variant={confirmAction?.title.includes("Settle") ? "destructive" : "info"}
        isLoading={processing}
      />

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-950 p-6 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm space-y-2 relative overflow-hidden group">
          <div className="absolute top-4 right-4 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 size-10 rounded-2xl flex items-center justify-center">
            <Users className="size-5" />
          </div>
          <p className="text-[10px] font-black uppercase text-gray-400 tracking-wider">
            Subscribers
          </p>
          <p className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">
            {totalSubscribers}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-950 p-6 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm space-y-2 relative overflow-hidden group">
          <div className="absolute top-4 right-4 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 size-10 rounded-2xl flex items-center justify-center">
            <CheckSquare className="size-5" />
          </div>
          <p className="text-[10px] font-black uppercase text-gray-400 tracking-wider">
            Pending Approvals
          </p>
          <p className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">
            {pendingApprovals}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-950 p-6 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm space-y-2 relative overflow-hidden group">
          <div className="absolute top-4 right-4 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 size-10 rounded-2xl flex items-center justify-center">
            <AlertTriangle className="size-5 animate-pulse" />
          </div>
          <p className="text-[10px] font-black uppercase text-gray-400 tracking-wider">
            Flagged / Frozen
          </p>
          <p className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">
            {redFlaggedCount}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-950 p-6 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm space-y-2 relative overflow-hidden group">
          <div className="absolute top-4 right-4 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 size-10 rounded-2xl flex items-center justify-center">
            <PiggyBank className="size-5" />
          </div>
          <p className="text-[10px] font-black uppercase text-gray-400 tracking-wider">
            Total Pool Value
          </p>
          <p className="text-2xl font-black text-gray-900 dark:text-white tracking-tight font-mono">
            {formatCurrency(totalPoolBalance)}
          </p>
        </div>
      </div>

      {/* Main Subscribers Card */}
      <Card className="rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden bg-white dark:bg-gray-950">
        <CardHeader className="pb-4 border-b border-gray-100 dark:border-gray-900">
          <CardTitle className="text-lg font-black text-gray-900 dark:text-white tracking-tight">
            Active Season Subscribers
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center p-12">
              <Loader2 className="animate-spin text-emerald-600 size-8" />
            </div>
          ) : subscribers.length === 0 ? (
            <p className="text-center p-12 text-gray-500 font-bold">No active subscribers found.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-gray-50 dark:bg-gray-900/50">
                  <TableRow className="border-b border-gray-100 dark:border-gray-900">
                    <TableHead className="font-bold text-gray-500 uppercase tracking-wider text-[10px] px-6 py-4">
                      User
                    </TableHead>
                    <TableHead className="font-bold text-gray-500 uppercase tracking-wider text-[10px] px-6 py-4">
                      Contribution
                    </TableHead>
                    <TableHead className="font-bold text-gray-500 uppercase tracking-wider text-[10px] px-6 py-4">
                      Cycle Week
                    </TableHead>
                    <TableHead className="font-bold text-gray-500 uppercase tracking-wider text-[10px] px-6 py-4">
                      Assigned Week(s)
                    </TableHead>
                    <TableHead className="font-bold text-gray-500 uppercase tracking-wider text-[10px] px-6 py-4">
                      Status
                    </TableHead>
                    <TableHead className="font-bold text-gray-500 uppercase tracking-wider text-[10px] px-6 py-4 text-right">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100 dark:divide-gray-900">
                  {subscribers.map((sub) => {
                    const meta = sub.plan_metadata || {};
                    const turns = meta.picking_turns || [];
                    const currentWeek = meta.current_week || 1;
                    const weekPaid = meta.week_paid || false;
                    const initials = (sub.profiles?.full_name || "U")
                      .split(" ")
                      .map((n: string) => n[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2);

                    return (
                      <TableRow
                        key={sub.id}
                        className="hover:bg-gray-50/50 dark:hover:bg-gray-900/30 transition-colors border-b border-gray-100 dark:border-gray-900"
                      >
                        <TableCell className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="size-9 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-black flex items-center justify-center text-xs shrink-0 select-none">
                              {initials}
                            </div>
                            <div>
                              <div
                                className="font-bold cursor-pointer text-gray-900 dark:text-white hover:text-emerald-600 dark:hover:text-emerald-400 flex items-center gap-1.5"
                                onClick={() => openReviewModal(sub)}
                              >
                                {sub.profiles?.full_name || "Unknown User"}
                                {sub.profiles?.is_red_flagged && (
                                  <Badge className="bg-red-500 text-white text-[9px] px-1.5 h-4 font-bold rounded">
                                    FLAGGED
                                  </Badge>
                                )}
                                {sub.profiles?.is_frozen && (
                                  <Badge className="bg-slate-700 text-white text-[9px] px-1.5 h-4 font-bold rounded">
                                    FROZEN
                                  </Badge>
                                )}
                              </div>
                              <div className="text-[11px] text-gray-500 font-semibold">
                                {sub.profiles?.email}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="px-6 py-4 font-mono font-bold text-gray-950 dark:text-gray-100">
                          {formatCurrency(meta.fixed_amount)}
                        </TableCell>
                        <TableCell className="px-6 py-4 font-bold text-gray-600 dark:text-gray-400">
                          Week {currentWeek}
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          <div className="flex flex-wrap gap-1.5">
                            {sub.status === "pending_turn_approval" &&
                            meta.proposed_turns?.length > 0 ? (
                              <div className="flex flex-col gap-1">
                                {turns.length > 0 && (
                                  <div className="text-[10px] text-gray-400">
                                    Current: {turns.map((t: any) => `W${t}`).join(", ")}
                                  </div>
                                )}
                                <div className="flex gap-1">
                                  {meta.proposed_turns.map((t: number) => (
                                    <Badge
                                      key={t}
                                      className="bg-amber-500/10 text-amber-600 border border-amber-500/20 rounded-full font-bold"
                                    >
                                      Proposed: W{t}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            ) : turns.length > 0 ? (
                              turns.map((t: number) => (
                                <Badge
                                  key={t}
                                  className="bg-indigo-500/10 text-indigo-600 border border-indigo-500/20 rounded-full font-bold"
                                >
                                  Week {t}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-gray-400 text-xs font-semibold">
                                None Assigned
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          {sub.status === "pending_turn_approval" ? (
                            <Badge className="bg-amber-500/10 text-amber-600 border border-amber-500/20 rounded-full font-bold">
                              Pending Approval
                            </Badge>
                          ) : sub.status === "pending_activation" ? (
                            <Badge className="bg-orange-500/10 text-orange-600 border border-orange-500/20 rounded-full font-bold">
                              Pending Activation
                            </Badge>
                          ) : sub.status === "turn_reassigned" ? (
                            <Badge className="bg-blue-500/10 text-blue-600 border border-blue-500/20 rounded-full font-bold">
                              Reassigned
                            </Badge>
                          ) : weekPaid ? (
                            <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 rounded-full font-bold">
                              Paid
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="rounded-full font-bold">
                              Due
                            </Badge>
                          )}
                          {meta.missed_weeks > 0 && (
                            <div className="text-[10px] text-red-500 mt-1 font-bold">
                              {meta.missed_weeks} Missed
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="px-6 py-4 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-xl font-bold"
                            onClick={() => openReviewModal(sub)}
                          >
                            Review User
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* User Review Dialog */}
      <Dialog open={!!reviewedUser} onOpenChange={(open) => !open && setReviewedUser(null)}>
        <DialogContent className="max-w-3xl bg-white dark:bg-gray-950 border border-gray-100 dark:border-gray-900 rounded-[2.5rem] p-8 overflow-y-auto max-h-[90vh] shadow-2xl">
          <DialogHeader className="pb-4 border-b border-gray-100 dark:border-gray-900">
            <DialogTitle className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
              Subscriber Profile Review
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-500 font-medium">
              Review user savings behavior, compliance limits, and configure assigned weeks.
            </DialogDescription>
          </DialogHeader>

          {loadingReview ? (
            <div className="flex justify-center p-12">
              <Loader2 className="animate-spin text-emerald-600 size-8" />
            </div>
          ) : reviewedProfile ? (
            <div className="space-y-8 pt-6">
              {/* Profile Details & Status Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left side: Profile Info */}
                <div className="bg-gray-50/50 dark:bg-gray-900/50 p-6 rounded-[2rem] border border-gray-100 dark:border-gray-800 space-y-4">
                  <h4 className="text-xs uppercase font-extrabold tracking-wider text-gray-400">
                    Personal Details
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">
                        Full Name
                      </span>
                      <span className="text-sm font-bold text-gray-900 dark:text-white">
                        {reviewedProfile.full_name || "N/A"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">
                        Email Address
                      </span>
                      <span className="text-sm font-bold text-gray-900 dark:text-white">
                        {reviewedProfile.email || "N/A"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">
                        Phone Number
                      </span>
                      <div>
                        <a
                          href={`https://wa.me/${reviewedProfile.phone?.replace(/[^0-9]/g, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-bold text-emerald-600 hover:underline inline-flex items-center gap-1"
                        >
                          {reviewedProfile.phone || "N/A"}
                        </a>
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">
                        System Join Date
                      </span>
                      <span className="text-sm font-bold text-gray-900 dark:text-white">
                        {reviewedProfile.created_at
                          ? new Date(reviewedProfile.created_at).toLocaleDateString()
                          : "N/A"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right side: Balances & Active Savings */}
                <div className="space-y-4">
                  <h4 className="text-xs uppercase font-extrabold tracking-wider text-gray-400">
                    Financial Overview
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-2xl border border-emerald-500/10 text-emerald-800 dark:text-emerald-400">
                      <span className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70 font-bold uppercase tracking-wider block">
                        General Wallet
                      </span>
                      <span className="text-md font-black">
                        {formatCurrency(reviewedWalletBalance)}
                      </span>
                    </div>
                    <div className="p-4 bg-blue-500/5 dark:bg-blue-500/10 rounded-2xl border border-blue-500/10 text-blue-800 dark:text-blue-400">
                      <span className="text-[10px] text-blue-600/70 dark:text-blue-400/70 font-bold uppercase tracking-wider block">
                        Withdrawable
                      </span>
                      <span className="text-md font-black">
                        {formatCurrency(reviewedWithdrawableBalance)}
                      </span>
                    </div>
                  </div>

                  <div className="bg-gray-50/50 dark:bg-gray-900/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 space-y-3">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">
                      Other Savings
                    </span>
                    {reviewedPlans.length === 0 ? (
                      <p className="text-xs text-gray-500 font-semibold">
                        No other active savings plans.
                      </p>
                    ) : (
                      <div className="space-y-2 max-h-[120px] overflow-y-auto pr-1">
                        {reviewedPlans.map((up: any) => (
                          <div
                            key={up.id}
                            className="flex justify-between items-center text-xs py-1.5 border-b border-gray-100/50 dark:border-gray-800/50 last:border-0"
                          >
                            <span className="font-bold text-gray-800 dark:text-gray-200">
                              {up.plan?.name}
                            </span>
                            <span className="font-mono font-black text-gray-900 dark:text-gray-100">
                              {formatCurrency(up.current_balance || 0)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Compliance section */}
              <div className="bg-amber-50/50 dark:bg-amber-950/10 p-5 rounded-[2rem] border border-amber-200/40 dark:border-amber-900/20 flex flex-col md:flex-row gap-4 items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-1">
                    Risk & Compliance
                  </h4>
                  <p className="text-xs text-gray-500 font-medium">
                    Flag or freeze defaulting users to block withdrawals.
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant={reviewedProfile.is_red_flagged ? "outline" : "destructive"}
                    className="rounded-xl font-bold"
                    onClick={handleToggleRedFlag}
                  >
                    {reviewedProfile.is_red_flagged ? "Clear Red Flag" : "Red Flag User"}
                  </Button>
                  <Button
                    size="sm"
                    variant={reviewedProfile.is_frozen ? "outline" : "destructive"}
                    className="rounded-xl font-bold"
                    disabled={!reviewedProfile.is_red_flagged}
                    onClick={handleToggleFreeze}
                  >
                    {reviewedProfile.is_frozen ? "Unfreeze Account" : "Freeze Account"}
                  </Button>
                </div>
              </div>

              {/* Turning Slots assignment form */}
              <div className="bg-indigo-500/5 p-6 rounded-[2rem] border border-indigo-500/10 space-y-4">
                <h4 className="text-xs uppercase font-extrabold tracking-wider text-indigo-700 dark:text-indigo-400">
                  Picking Turn Administration
                </h4>

                <div className="grid grid-cols-2 gap-4 pb-4 border-b border-indigo-500/10">
                  <div>
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">
                      Proposed Turns
                    </span>
                    <span className="text-sm font-bold text-indigo-700 dark:text-indigo-400">
                      {reviewedUser.plan_metadata?.proposed_turns?.length > 0
                        ? reviewedUser.plan_metadata.proposed_turns
                            .map((t: any) => `Week ${t}`)
                            .join(", ")
                        : "None proposed"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">
                      Assigned Weeks
                    </span>
                    <span className="text-sm font-bold text-indigo-700 dark:text-indigo-400">
                      {assignedWeeks.length > 0
                        ? assignedWeeks.map((t: any) => `Week ${t}`).join(", ")
                        : "None assigned"}
                    </span>
                  </div>
                </div>

                <div className="space-y-4 pt-2">
                  <p className="text-xs text-gray-600 dark:text-gray-400 font-bold">
                    Reassign weeks to match corresponding proposed slot amounts:
                  </p>

                  <div className="space-y-3">
                    {(reviewedUser.plan_metadata?.slots || []).map((slot: any, index: number) => (
                      <div
                        key={index}
                        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-3 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800"
                      >
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-gray-900 dark:text-white">
                            Slot {index + 1}
                          </span>
                          <span className="text-[10px] text-gray-500 font-semibold">
                            Proposed: Week {slot.proposed_week} • Amount:{" "}
                            <strong className="text-emerald-600">
                              ₦{slot.amount?.toLocaleString()}
                            </strong>
                          </span>
                        </div>

                        <div className="w-full sm:w-[160px]">
                          <Select
                            value={String(assignedWeeks[index] || "")}
                            onValueChange={(val) => {
                              const updated = [...assignedWeeks];
                              updated[index] = parseInt(val);
                              setAssignedWeeks(updated);
                            }}
                          >
                            <SelectTrigger className="h-9 text-xs rounded-xl bg-gray-50 dark:bg-gray-800 border-gray-100 dark:border-gray-800 font-semibold">
                              <SelectValue placeholder="Assign Week" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border border-gray-100 dark:border-gray-800">
                              {Array.from({ length: newDuration || 10 }).map((_, i) => (
                                <SelectItem key={i + 1} value={String(i + 1)}>
                                  Week {i + 1}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Dialog Footer Actions */}
              <div className="flex gap-3 pt-4 border-t border-gray-100 dark:border-gray-900 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setReviewedUser(null)}
                  className="rounded-2xl font-bold"
                >
                  Cancel
                </Button>

                {reviewedUser.status === "pending_turn_approval" ? (
                  <>
                    <Button
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl"
                      disabled={processing}
                      onClick={() => {
                        handleApproveTurn(reviewedUser.id, true);
                        setReviewedUser(null);
                      }}
                    >
                      Approve Proposed Turns
                    </Button>
                    <Button
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl"
                      disabled={processing || assignedWeeks.length === 0}
                      onClick={() => {
                        handleApproveTurn(reviewedUser.id, false, assignedWeeks);
                        setReviewedUser(null);
                      }}
                    >
                      Assign Custom & Notify
                    </Button>
                  </>
                ) : (
                  <Button
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl"
                    disabled={processing}
                    onClick={handleUpdateAssignedTurnsOnly}
                  >
                    Save Assigned Turns
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <p className="p-8 text-center text-sm text-red-500 font-bold">
              Failed to load profile details.
            </p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
