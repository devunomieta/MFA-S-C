import { useState } from "react";
import { toast } from "sonner";
import { Timer, CheckCircle, AlertTriangle, Calendar, Lock, Plus, Trash2 } from "lucide-react";

import { Badge } from "@/app/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Progress } from "@/app/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/app/components/ui/alert-dialog";
import { Plan, UserPlan } from "@/types";

interface AjoPlanCardProps {
  plan: Plan;
  user_plan?: UserPlan;
  onJoin: (planId: string, subscriptions: { proposed_week: number; amount: number }[]) => void;
  onDeposit: () => void;
  onAdvanceDeposit?: () => void;
  onWithdraw?: () => void;
  onLeave?: () => void;
}

export function AjoPlanCard({
  plan,
  user_plan,
  onJoin,
  onDeposit,
  onAdvanceDeposit,
  onWithdraw,
  onLeave,
}: AjoPlanCardProps) {
  const [subscriptions, setSubscriptions] = useState<{ proposed_week: number; amount: number }[]>([
    { proposed_week: 1, amount: 10000 },
  ]);
  const [withdrawing, setWithdrawing] = useState(false);
  const [isAppealing, setIsAppealing] = useState(false);
  const [appealSubs, setAppealSubs] = useState<{ proposed_week: number; amount: number }[]>([]);
  const [pendingAction, setPendingAction] = useState<"accept" | "appeal" | "reject" | null>(null);

  const amounts = plan.config?.amounts || [10000, 15000, 20000, 25000, 30000, 50000, 100000];
  const duration = plan.config?.duration_weeks || 10;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "decimal",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const getTotalWeeklyContribution = () => subscriptions.reduce((sum, sub) => sum + sub.amount, 0);
  const getPayoutForAmt = (amt: number) => amt * duration;
  const getTotalPayout = () =>
    subscriptions.reduce((sum, sub) => sum + getPayoutForAmt(sub.amount), 0);

  const addSubscription = () => {
    if (subscriptions.length >= duration) return;
    setSubscriptions([...subscriptions, { proposed_week: 1, amount: 10000 }]);
  };

  const removeSubscription = (index: number) => {
    if (subscriptions.length <= 1) return;
    setSubscriptions(
      subscriptions.filter((_, i) => i !== index),
    );
  };

  const updateSubscription = (index: number, field: "amount", value: number) => {
    const newSubs = [...subscriptions];
    newSubs[index] = { ...newSubs[index], [field]: value };
    setSubscriptions(newSubs);
  };

  const handleJoin = () => {
    if (subscriptions.length === 0) return;
    onJoin(plan.id, subscriptions);
  };

  if (user_plan) {
    // Active State - Minimalist
    const metadata = user_plan.plan_metadata || {};
    const fixedAmount = metadata.fixed_amount || 0;
    const currentWeek = metadata.current_week || 1;
    const weekPaid = metadata.week_paid || false;
    const pickingTurns = metadata.picking_turns || [];
    const missedWeeks = metadata.missed_weeks || 0;
    const slots = metadata.slots || [];

    const payoutHistory = (metadata as any).payout_history || [];
    const turnCount = pickingTurns.filter((t: any) => Number(t) === currentWeek).length;
    const withdrawnCount = payoutHistory.filter((h: any) => Number(h) === currentWeek).length;
    const isMyTurn = turnCount > withdrawnCount;
    const canWithdraw = isMyTurn;

    const startAppeal = () => {
      setAppealSubs(pickingTurns.map(() => {
         let startWeek = 1;
         while (pickingTurns.map(String).includes(startWeek.toString()) && startWeek <= duration) {
             startWeek++;
         }
         return { proposed_week: startWeek > duration ? 1 : startWeek, amount: fixedAmount / pickingTurns.length };
      }));
      setIsAppealing(true);
    };

    const handleConfirmAction = async () => {
      if (!user_plan || !pendingAction) return;
      
      try {
        if (pendingAction === "accept") {
          await supabase.from("user_plans").update({ status: "active" }).eq("id", user_plan.id);
          toast.success("Successfully accepted turns.");
        } else if (pendingAction === "reject") {
          if (onLeave) await onLeave();
          return; // onLeave handles its own flow
        } else if (pendingAction === "appeal") {
          const metadata = { ...user_plan.plan_metadata, proposed_turns: appealSubs.map(s => s.proposed_week) };
          await supabase.from("user_plans").update({ status: "appeal_pending", plan_metadata: metadata }).eq("id", user_plan.id);
          toast.success("Appeal submitted successfully.");
        }
        setTimeout(() => window.location.reload(), 1500);
      } catch (err) {
        toast.error("An error occurred. Please try again.");
      } finally {
        setPendingAction(null);
        setIsAppealing(false);
      }
    };

    return (
      <>
      <Card className="flex flex-col relative overflow-hidden bg-white dark:bg-gray-900 border-l-4 border-l-orange-500 shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge
                  variant="outline"
                  className="text-emerald-700 border-emerald-200 bg-emerald-50"
                >
                  {plan.name}
                </Badge>
                <Badge
                  className={
                    user_plan.status === "pending_activation" || user_plan.status === "pending_turn_approval"
                      ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200"
                      : "bg-emerald-600 border-emerald-500 text-white"
                  }
                >
                  {user_plan.status === "pending_activation" ? "PENDING ACTIVATION" : user_plan.status === "pending_turn_approval" ? "PENDING APPROVAL" : user_plan.status === "turn_reassigned" ? "TURN REASSIGNED" : user_plan.status === "appeal_pending" ? "APPEAL PENDING" : "Active"}
                </Badge>
              </div>
              <CardTitle className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {plan.name}
              </CardTitle>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-500 uppercase font-bold tracking-wider">
                Total Payout
              </div>
              <div className="text-xl font-bold text-gray-900 dark:text-white">
                ₦{formatCurrency(getPayoutForAmt(fixedAmount))}
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 flex-1 pt-4 overflow-y-auto max-h-[60vh] custom-scrollbar">
          <div className="grid grid-cols-2 gap-3">
            {user_plan.status === "active" && (
              <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-800">
                <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" /> Current Week
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {currentWeek}{" "}
                  <span className="text-sm text-gray-400 font-normal">/ {duration}</span>
                </div>
              </div>
            )}
            <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-800">
              <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1 flex items-center gap-1.5">
                <Timer className="w-3.5 h-3.5" /> My Turn(s)
              </div>
              <div className="text-lg font-bold text-orange-600 dark:text-orange-400">
                {pickingTurns.length > 0 ? `Week ${pickingTurns.join(", ")}` : "Pending"}
              </div>
            </div>
          </div>

          {pickingTurns.length > 0 && slots.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Approved Turn(s) Breakdown</h4>
              {pickingTurns.map((turn: number, idx: number) => {
                const slot = slots[idx] || slots[0];
                const slotAmt = slot?.amount || (fixedAmount / pickingTurns.length);
                const slotPayout = slotAmt * duration;
                return (
                  <div key={idx} className="flex justify-between items-center p-3 bg-emerald-50 dark:bg-emerald-900/10 rounded-lg border border-emerald-100 dark:border-emerald-800/30">
                    <div>
                      <div className="text-sm font-bold text-emerald-800 dark:text-emerald-400">Week {turn}</div>
                      <div className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-500 uppercase tracking-wider mt-0.5">Contribution: ₦{formatCurrency(slotAmt)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-0.5">Payout</div>
                      <div className="text-sm font-black text-gray-900 dark:text-white tracking-tight">₦{formatCurrency(slotPayout)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {user_plan.status === "active" && (
            <div className="flex flex-col gap-2">
              {missedWeeks > 0 && (
                <div className="flex items-center gap-2 p-2 bg-red-50 text-red-700 rounded-md text-xs border border-red-100 font-medium animate-pulse">
                  <AlertTriangle className="w-3.5 h-3.5" /> {missedWeeks} Missed (₦
                  {formatCurrency(missedWeeks * 500)} Penalty)
                </div>
              )}

              <div
                className={`flex items-center gap-2 p-2 rounded-md text-xs border font-bold ${
                  weekPaid
                    ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                    : "bg-amber-50 text-amber-700 border-amber-100 shadow-sm"
                }`}
              >
                {weekPaid ? (
                  <CheckCircle className="w-3.5 h-3.5" />
                ) : (
                  <Timer className="w-3.5 h-3.5 animate-pulse" />
                )}
                <span>{weekPaid ? "Weekly Contribution Paid" : "Weekly Contribution Due"}</span>
              </div>
            </div>
          )}

          {user_plan.status === "active" && (
            <div className="space-y-4 pt-2 border-t border-gray-50 dark:border-gray-800">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400 font-medium">
                    Payout Progress
                  </span>
                  <span className="font-bold text-gray-900 dark:text-gray-200">
                    Week {currentWeek} / {duration}
                  </span>
                </div>
                <Progress
                  value={(currentWeek / duration) * 100}
                  className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full"
                />
                <div className="flex justify-between text-[10px] text-gray-400 font-medium">
                  <span>{Math.round((currentWeek / duration) * 100)}% through Season</span>
                  <span>₦{formatCurrency(getPayoutForAmt(fixedAmount))} Total Payout</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex flex-col gap-2 pt-2">
          {user_plan.status === "turn_reassigned" && (
            <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg mb-4 space-y-3">
              <p className="text-xs text-blue-800 font-medium">
                <AlertTriangle className="w-4 h-4 inline mr-1 text-blue-600" />
                Admin has assigned you new turns: <strong>{pickingTurns.join(", ")}</strong>. Please review:
              </p>
              
              {!isAppealing ? (
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setPendingAction("accept")}>Accept</Button>
                  <Button size="sm" variant="outline" className="flex-1 border-blue-300 text-blue-700" onClick={startAppeal}>Appeal</Button>
                  <Button size="sm" variant="destructive" className="flex-1" onClick={() => setPendingAction("reject")}>Reject</Button>
                </div>
              ) : (
                <div className="space-y-3 bg-white p-3 rounded-md border border-blue-100">
                  <p className="text-xs font-bold text-gray-700">Select preferred turn(s):</p>
                  {appealSubs.map((sub, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <span className="text-xs font-semibold text-gray-500 w-12">Slot {idx + 1}</span>
                      <Select
                        value={sub.proposed_week.toString()}
                        onValueChange={(v) => {
                          const newSubs = [...appealSubs];
                          newSubs[idx].proposed_week = parseInt(v);
                          setAppealSubs(newSubs);
                        }}
                      >
                        <SelectTrigger className="h-8 text-xs bg-white">
                          <SelectValue placeholder="Week" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: duration }).map((_, i) => {
                            const weekNum = i + 1;
                            const isAssigned = pickingTurns.map(String).includes(weekNum.toString());
                            return (
                              <SelectItem key={weekNum} value={weekNum.toString()} disabled={isAssigned}>
                                Week {weekNum} {isAssigned && "(Assigned)"}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white" onClick={() => setPendingAction("appeal")}>Submit Appeal</Button>
                    <Button size="sm" variant="ghost" className="flex-1" onClick={() => setIsAppealing(false)}>Cancel</Button>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {user_plan.status === "appeal_pending" && (
            <div className="bg-purple-50 border border-purple-200 p-3 rounded-lg mb-4">
              <p className="text-xs text-purple-800 font-medium flex items-center">
                <Timer className="w-4 h-4 inline mr-2 animate-spin" />
                Your appeal is pending admin review.
              </p>
            </div>
          )}

          {turnCount > 0 ? (
            <Button
              className={`w-full font-semibold ${!canWithdraw ? "bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-not-allowed" : "bg-emerald-600 hover:bg-emerald-700 text-white"}`}
              onClick={async () => {
                if (onWithdraw && canWithdraw) {
                  setWithdrawing(true);
                  await onWithdraw();
                  setWithdrawing(false);
                }
              }}
              disabled={withdrawing || !canWithdraw || user_plan.status !== "active"}
              variant={!canWithdraw ? "ghost" : "default"}
            >
              {withdrawing
                ? "Processing..."
                : !canWithdraw
                  ? `Withdrawn ₦${formatCurrency(getPayoutForAmt(fixedAmount))}`
                  : "Withdraw Payout"}
            </Button>
          ) : (
            <Button
              className="w-full bg-gray-100 text-gray-400 border border-gray-200 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-500 cursor-not-allowed"
              variant="ghost"
              disabled
            >
              <Lock className="w-3.5 h-3.5 mr-2" /> Payout Locked
            </Button>
          )}

          {(!weekPaid && user_plan.status === "active") ? (
            <Button
              className="w-full bg-gray-900 hover:bg-gray-800 text-white dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200 font-semibold"
              onClick={onDeposit}
            >
              Pay Weekly
            </Button>
          ) : (weekPaid && user_plan.status === "active") ? (
            <Button
              variant="secondary"
              className="w-full bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200 font-bold"
              onClick={onAdvanceDeposit}
            >
              Pay in Advance
            </Button>
          ) : null}
          {(user_plan.status === "pending_activation" || user_plan.status === "pending_turn_approval") && onLeave && (
            <Button
              variant="ghost"
              className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 text-xs font-semibold"
              onClick={onLeave}
            >
              Leave Plan
            </Button>
          )}
        </CardFooter>
      </Card>
      
      <AlertDialog open={!!pendingAction} onOpenChange={(open) => !open && setPendingAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingAction === "accept" && "Accept Reassigned Turns?"}
              {pendingAction === "reject" && "Reject and Leave Plan?"}
              {pendingAction === "appeal" && "Submit Appeal?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingAction === "accept" && "Are you sure you want to accept the turns assigned by the Admin? Your plan will become fully active."}
              {pendingAction === "reject" && "Are you sure you want to reject the reassigned turns? You will leave this plan."}
              {pendingAction === "appeal" && "Are you sure you want to submit this appeal for your new preferred turns? The admin will review it."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={pendingAction === "reject" ? "bg-red-600 hover:bg-red-700 text-white" : "bg-emerald-600 hover:bg-emerald-700 text-white"}
              onClick={handleConfirmAction}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </>
    );
  }

  // Available State (Multi-Turn Redesign)
  return (
    <Card className="flex flex-col relative overflow-hidden bg-white dark:bg-gray-900 border-l-4 border-l-orange-500 shadow-sm hover:shadow-md transition-shadow group">
      <CardHeader className="pb-4">
        <div className="flex justify-between items-start">
          <div>
            <Badge
              variant="secondary"
              className="mb-2 bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100"
            >
              Digital Ajo
            </Badge>
            <CardTitle className="text-xl font-bold text-gray-900 dark:text-white">
              {plan.name}
            </CardTitle>
          </div>
          {plan.config?.season_start_date && (
            <div className="flex flex-col items-end">
              <span className="text-[10px] uppercase text-gray-400 font-bold tracking-wider">
                Starts
              </span>
              <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded border border-emerald-100 dark:border-emerald-800">
                <Calendar className="w-3 h-3" />
                {new Date(plan.config.season_start_date).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 space-y-4 pt-2 overflow-y-auto max-h-[60vh] custom-scrollbar">
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
              Pick Your Turns & Amounts
            </label>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-[10px] font-bold uppercase gap-1 text-emerald-600 border-emerald-200"
              onClick={addSubscription}
              disabled={subscriptions.length >= duration}
            >
              <Plus className="w-3 h-3" /> Add Turn
            </Button>
          </div>

          <div className="space-y-3">
            {subscriptions.map((sub, idx) => (
              <div
                key={idx}
                className="flex gap-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 animate-in fade-in slide-in-from-top-1 items-center"
              >
                <div className="flex-1 min-w-[100px]">
                  <Select
                    value={sub.proposed_week.toString()}
                    onValueChange={(v) => updateSubscription(idx, "proposed_week", parseInt(v))}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Week" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: duration }).map((_, i) => (
                        <SelectItem key={i + 1} value={(i + 1).toString()}>
                          Week {i + 1}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-[2] min-w-[120px]">
                  <Select
                    value={sub.amount.toString()}
                    onValueChange={(v) => updateSubscription(idx, "amount", parseInt(v))}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Amount" />
                    </SelectTrigger>
                    <SelectContent>
                      {amounts
                        .filter((a: number) => a <= 100000)
                        .map((amt: number) => (
                          <SelectItem key={amt} value={amt.toString()}>
                            ₦{formatCurrency(amt)}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                {subscriptions.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-red-500 hover:text-red-600 hover:bg-red-50"
                    onClick={() => removeSubscription(idx)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-3 border border-emerald-100 dark:border-emerald-800 space-y-3">
          <div className="flex justify-between items-center pb-2 border-b border-emerald-200 dark:border-emerald-800/50">
            <div>
              <p className="text-emerald-900/60 dark:text-emerald-100/60 text-[10px] font-bold uppercase tracking-wider">
                Weekly Contribution
              </p>
              <p className="text-sm font-bold text-emerald-900 dark:text-emerald-100">
                ₦{formatCurrency(getTotalWeeklyContribution())}
              </p>
            </div>
            <div className="text-right">
              <p className="text-emerald-900/60 dark:text-emerald-100/60 text-[10px] font-bold uppercase tracking-wider">
                Turns
              </p>
              <p className="text-sm font-bold text-emerald-900 dark:text-emerald-100">
                {subscriptions.length} Slot{subscriptions.length > 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <div className="flex justify-between items-end">
            <div>
              <p className="text-emerald-900/60 dark:text-emerald-100/60 text-[10px] font-bold uppercase tracking-wider mb-0.5">
                Total Season Payout
              </p>
              <p className="text-xl font-black tracking-tight text-emerald-600 dark:text-emerald-400">
                ₦{formatCurrency(getTotalPayout())}
              </p>
            </div>
            <div className="text-right">
              <p className="text-emerald-900/60 dark:text-emerald-100/60 text-[10px] font-bold uppercase tracking-wider mb-0.5">
                Service Charge
              </p>
              <p className="text-xs font-bold text-orange-600">
                {plan.service_charge_type === "tiered"
                  ? "Tiered"
                  : formatCurrency(plan.service_charge_fixed || 0)}
              </p>
            </div>
          </div>
        </div>

        {plan.service_charge_type === "tiered" && plan.service_charge_tiers && (
          <div className="rounded-lg border border-gray-100 dark:border-gray-800 overflow-hidden">
            <table className="w-full text-[10px] text-left">
              <thead className="bg-gray-50 dark:bg-gray-800 font-bold text-gray-500 uppercase tracking-wider">
                <tr>
                  <th className="px-3 py-2">Weekly Slot Amount</th>
                  <th className="px-3 py-2 text-right">Fee/Slot</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {plan.service_charge_tiers.map((tier: any, idx: number) => (
                  <tr key={idx}>
                    <td className="px-3 py-2 text-gray-600 dark:text-gray-400 font-medium">
                      ₦{formatCurrency(tier.min)} -{" "}
                      {tier.max > 0 && tier.max < 9999999
                        ? `₦${formatCurrency(tier.max)}`
                        : "Above"}
                    </td>
                    <td className="px-3 py-2 text-right font-bold text-gray-900 dark:text-white">
                      ₦{formatCurrency(tier.fee)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-800">
          <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 font-bold">
            Benefit Summary
          </h4>
          <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed font-medium">
            You are committing to pay{" "}
            <strong>₦{formatCurrency(getTotalWeeklyContribution())}</strong> every week. In return,
            you will receive <strong>₦{formatCurrency(getTotalPayout())}</strong> total.
            <span className="block mt-2 text-amber-600 font-bold bg-amber-50 dark:bg-amber-900/10 p-2 rounded border border-amber-100 dark:border-amber-800/50">
              <Lock className="w-3 h-3 inline mr-1" /> Admin will review your proposed turns after your first payment.
            </span>
          </p>
        </div>
      </CardContent>

      <CardFooter className="pt-2">
        <Button
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-12 rounded-2xl shadow-lg shadow-emerald-500/20 transition-all duration-300 hover:-translate-y-0.5"
          onClick={handleJoin}
          disabled={subscriptions.length === 0 || !plan.config?.duration_weeks}
        >
          {plan.config?.duration_weeks
            ? `Join Plan with ${subscriptions.length} Turn${subscriptions.length > 1 ? "s" : ""}`
            : "Awaiting Config"}
        </Button>
      </CardFooter>
    </Card>
  );
}
