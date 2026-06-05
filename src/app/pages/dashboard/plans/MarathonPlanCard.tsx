import { useState } from "react";

import { Trophy, Calendar, AlertTriangle, CheckCircle, ArrowRight, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/app/components/ui/alert-dialog";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/app/components/ui/card";
import { supabase } from "@/lib/supabase";
import { formatNaira } from "@/lib/utils";
import { Plan, UserPlan } from "@/types";

interface MarathonPlanCardProps {
  plan: Plan;
  userPlan?: UserPlan; // If user has joined
  onJoin: (duration: number) => void;
  onDeposit: () => void;
  onAdvanceDeposit?: () => void;
  onLeave?: () => void;
}

export function MarathonPlanCard({
  plan,
  userPlan,
  onJoin,
  onDeposit,
  onAdvanceDeposit,
  onLeave,
}: MarathonPlanCardProps) {
  const [extending, setExtending] = useState(false);
  const [showExtendDialog, setShowExtendDialog] = useState(false);
  const [joinDuration, setJoinDuration] = useState("48");
  const isJoined = !!userPlan;
  const metadata = userPlan?.plan_metadata || {};
  const duration = metadata.selected_duration || plan.config?.durations?.[1] || 48; // Default max
  const weeksPaid = metadata.total_weeks_paid || 0;
  const startingWeek = metadata.starting_week || 1;
  const currentWeekDisplay = Math.min(startingWeek - 1 + weeksPaid, duration);
  const isCurrentWeekPaid = metadata.current_week_paid;
  const arrears = metadata.arrears_amount || 0;
  const missedWeeksDetails = metadata.missed_weeks_details || [];
  const isFinished = currentWeekDisplay >= duration;

  const progress = Math.min((currentWeekDisplay / duration) * 100, 100);

  const handleExtend = async () => {
    if (!userPlan) return;

    setExtending(true);
    const newMeta = { ...metadata, selected_duration: 48 };

    const { error } = await supabase
      .from("user_plans")
      .update({ plan_metadata: newMeta })
      .eq("id", userPlan.id);

    if (error) {
      toast.error("Failed to extend plan");
    } else {
      toast.success("Plan extended to 48 weeks! Keep going!");
      // Ideally we should trigger a refresh here, but the parent uses realtime subscription so it might auto-update.
      // If not, a page reload or passing a refresh callback would be needed.
      // For now, prompt user.
      window.location.reload();
    }
    setExtending(false);
  };

  // Active State (Joined) - Minimalist
  if (isJoined) {
    return (
      <Card className="flex flex-col relative overflow-hidden bg-white dark:bg-gray-900 border-l-4 border-l-emerald-500 shadow-sm hover:shadow-md transition-shadow">
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
                <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white">Active</Badge>
              </div>
              <CardTitle className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {plan.name}
              </CardTitle>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-500 uppercase font-bold tracking-wider">
                Total Saved
              </div>
              <div className="text-xl font-bold text-gray-900 dark:text-white">
                {formatNaira(userPlan?.current_balance || 0)}
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 flex-1 pt-4 overflow-y-auto max-h-[60vh] custom-scrollbar">
          <div className="flex flex-col gap-2">
            {arrears > 0 && (
              <div className="flex flex-col gap-1 p-2 bg-red-50 text-red-700 rounded-md border border-red-100 shadow-sm">
                <div className="flex items-center gap-2 text-xs font-bold">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Arrears: {formatNaira(arrears)}</span>
                </div>
                {missedWeeksDetails.length > 0 && (
                  <div className="text-[10px] mt-1 space-y-0.5 border-t border-red-200/50 pt-1">
                    {missedWeeksDetails.map((detail: any, i: number) => (
                      <div key={i} className="flex justify-between font-medium opacity-90">
                        <span>Week {detail.week} Missed</span>
                        <span>{formatNaira(detail.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div
              className={`flex items-center gap-2 p-2 rounded-md text-xs border font-bold ${
                isCurrentWeekPaid
                  ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                  : "bg-amber-50 text-amber-700 border-amber-100 shadow-sm"
              }`}
            >
              {isCurrentWeekPaid ? (
                <CheckCircle className="w-3.5 h-3.5" />
              ) : (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              )}
              <span>
                {isCurrentWeekPaid ? "Current Week Paid" : "Current Week Pending Deposit"}
              </span>
            </div>
          </div>

          <div className="space-y-4 pt-2 border-t border-gray-50 dark:border-gray-800">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400 font-medium">Goal Progress</span>
                <span className="font-bold text-gray-900 dark:text-gray-200">
                  {currentWeekDisplay} / {duration} Weeks
                </span>
              </div>
              <div className="h-2 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-gray-400 font-medium">
                <span>
                  Week {currentWeekDisplay} of {duration} Completed
                </span>
                <span>{Math.round(progress)}% of Total Goal</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-800">
              <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1">
                Status
              </div>
              <div
                className={`text-sm font-bold flex items-center gap-1.5 ${
                  userPlan.status === "pending_activation"
                    ? "text-amber-600"
                    : isCurrentWeekPaid
                      ? "text-emerald-600"
                      : "text-amber-600"
                }`}
              >
                {userPlan.status === "pending_activation" ? (
                  <>
                    {" "}
                    <AlertTriangle className="w-3.5 h-3.5" /> PENDING ACTIVATION{" "}
                  </>
                ) : (
                  <>
                    {isCurrentWeekPaid ? (
                      <CheckCircle className="w-3.5 h-3.5" />
                    ) : (
                      <AlertTriangle className="w-3.5 h-3.5" />
                    )}
                    {isCurrentWeekPaid ? "Paid" : "Pending"}
                  </>
                )}
              </div>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-800">
              <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1">
                Completion
              </div>
              <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                {Math.round(progress)}%
              </div>
            </div>
          </div>

          {/* Extension Option */}
          {duration === 30 && (
            <AlertDialog open={showExtendDialog} onOpenChange={setShowExtendDialog}>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                  disabled={extending}
                >
                  {extending ? (
                    <Loader2 className="w-3 h-3 animate-spin mr-1" />
                  ) : (
                    <ArrowRight className="w-3 h-3 mr-1" />
                  )}
                  Extend to 48 Weeks
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Extend Marathon Challenge?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to extend your challenge to 48 weeks? This will increase
                    your total savings target and the duration of your commitment.
                    <div className="mt-2 p-3 bg-blue-50 text-blue-700 text-xs rounded-md border border-blue-100 font-medium italic">
                      "A longer marathon builds greater financial discipline."
                    </div>
                    <p className="mt-2 text-red-600 font-bold">This action cannot be reversed.</p>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={extending}>Maybe Later</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={(e: React.MouseEvent) => {
                      e.preventDefault();
                      handleExtend();
                    }}
                    disabled={extending}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {extending ? "Extending..." : "Yes, Extend Challenge"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </CardContent>

        <CardFooter className="flex flex-col gap-3 pt-2">
          <div className="grid grid-cols-2 gap-3 w-full">
            {!isCurrentWeekPaid || arrears > 0 ? (
              <Button
                className="w-full bg-gray-900 hover:bg-gray-800 text-white dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
                onClick={onDeposit}
              >
                {arrears > 0 ? "Pay Arrears" : "Add Funds"}
              </Button>
            ) : (
              !isFinished && (
                <Button
                  variant="secondary"
                  className="w-full bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 font-bold"
                  onClick={onAdvanceDeposit}
                >
                  Pay in Advance
                </Button>
              )
            )}
            <Button variant="outline" asChild className="w-full">
              <Link to={`/dashboard/wallet?planId=${userPlan?.plan.id}`}>Details</Link>
            </Button>
          </div>

          {userPlan.status === "pending_activation" && onLeave && (
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
    );
  }

  // Available State (Minimalist Redesign)
  return (
    <Card className="flex flex-col relative overflow-hidden bg-white dark:bg-gray-900 border-l-4 border-l-emerald-500 shadow-sm hover:shadow-md transition-shadow group">
      <CardHeader className="pb-4">
        <div className="flex justify-between items-start">
          <div>
            <Badge
              variant="secondary"
              className="mb-2 bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100"
            >
              Marathon
            </Badge>
            <CardTitle className="text-xl font-bold text-gray-900 dark:text-white">
              {plan.name}
            </CardTitle>
          </div>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium leading-relaxed mt-1 line-clamp-2">
          A disciplined, long-term savings plan starting every January to help you hit those massive
          end-of-year financial goals.
        </p>
      </CardHeader>

      <CardContent className="flex-1 space-y-6 pt-2 overflow-y-auto max-h-[60vh] custom-scrollbar">
        <div className="flex justify-between items-end border-b border-gray-100 dark:border-gray-800 pb-4">
          <div>
            <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">
              Weekly Min
            </p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">₦3,000</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">
              Duration
            </p>
            <div className="relative">
              <select
                value={joinDuration}
                onChange={(e) => setJoinDuration(e.target.value)}
                className="w-32 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-lg text-sm font-bold text-gray-900 dark:text-white px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 appearance-none"
              >
                <option value="30">30 Weeks</option>
                <option value="48">48 Weeks</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M19 9l-7 7-7-7"
                  ></path>
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4 pt-2">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-100 dark:border-emerald-800">
            <h4 className="text-[10px] font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider mb-2">
              Rules & Features
            </h4>
            <ul className="space-y-1.5 mb-4">
              <li className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400">
                <div className="w-1 h-1 rounded-full bg-emerald-500" />
                Starts counting continuously from the week you join
              </li>
              <li className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400">
                <div className="w-1 h-1 rounded-full bg-emerald-500" />
                Strictly locked until December completion
              </li>
              <li className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400">
                <div className="w-1 h-1 rounded-full bg-emerald-500" />
                Daily/Weekly top-ups allowed
              </li>
              <li className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400">
                <div className="w-1 h-1 rounded-full bg-emerald-500" />
                Service charges auto-deducted per deposit
              </li>
            </ul>

            <div className="rounded border border-emerald-100 dark:border-emerald-800 overflow-hidden">
              <table className="w-full text-[10px] text-left">
                <thead className="bg-emerald-100/50 dark:bg-emerald-900/40 font-bold text-emerald-800 dark:text-emerald-400">
                  <tr>
                    <th className="px-2 py-1">Deposit Amount</th>
                    <th className="px-2 py-1 text-right">Service Charge</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-emerald-50 dark:divide-emerald-800 text-emerald-700 dark:text-emerald-400">
                  {plan.service_charge_type === "tiered" &&
                  plan.service_charge_tiers &&
                  plan.service_charge_tiers.length > 0 ? (
                    plan.service_charge_tiers.map((tier: any, idx: number) => (
                      <tr key={idx}>
                        <td className="px-2 py-1">
                          {formatNaira(tier.min)} -{" "}
                          {tier.max > 0 && tier.max < 9999999 ? formatNaira(tier.max) : "Above"}
                        </td>
                        <td className="px-2 py-1 text-right font-bold">{formatNaira(tier.fee)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="px-2 py-1">All Deposits</td>
                      <td className="px-2 py-1 text-right font-bold">
                        {plan.service_charge_type === "percentage"
                          ? `${plan.service_charge_percentage}%`
                          : `₦${(plan.service_charge_fixed || plan.service_charge || 0).toLocaleString()}`}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs text-gray-500 dark:text-gray-400 font-medium">
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-emerald-600" />
              <span>Ends in Dec</span>
            </div>
            <div className="flex items-center gap-2">
              <Trophy className="w-3.5 h-3.5 text-emerald-600" />
              <span>Strictly Locked</span>
            </div>
          </div>
        </div>
      </CardContent>

      <CardFooter className="pt-2">
        <Button
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-12 rounded-2xl shadow-lg shadow-emerald-500/20 transition-all duration-300 hover:-translate-y-0.5"
          onClick={() => onJoin(parseInt(joinDuration))}
        >
          Start Marathon
        </Button>
      </CardFooter>
    </Card>
  );
}
