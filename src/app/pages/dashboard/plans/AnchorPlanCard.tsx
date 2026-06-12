import { useState } from "react";

import { CheckCircle, AlertOctagon, TrendingUp } from "lucide-react";

import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/app/components/ui/card";
import { getEstimatedMaturityDate } from "@/lib/planUtils";
import { formatNaira } from "@/lib/utils";
import { UserPlan, Plan } from "@/types";

import { SprintJoinModal } from "./SprintJoinModal"; // Re-use Sprint Modal as logic is identical, maybe rename later

interface AnchorPlanCardProps {
  plan: Plan;
  userPlan?: UserPlan;
  onJoin: () => void;
  onDeposit: (planId: string) => void;
  onAdvanceDeposit?: (planId: string) => void;
  onLeave?: () => void;
}

export function AnchorPlanCard({
  plan,
  userPlan,
  onJoin,
  onDeposit,
  onAdvanceDeposit,
  onLeave,
}: AnchorPlanCardProps) {
  const [showJoinModal, setShowJoinModal] = useState(false);

  const isJoined = !!userPlan;
  const meta = userPlan?.plan_metadata || {};

  // Anchor Specifics (48 weeks)
  const weeksCompleted = meta.weeks_completed || 0;
  const currentWeekTotal = meta.current_week_total || 0;
  const arrears = meta.arrears_amount || 0;
  const totalDuration = 48;

  const weeklyTarget = 3000;
  const progressPercent = Math.min((currentWeekTotal / weeklyTarget) * 100, 100);
  const totalProgress = (weeksCompleted / totalDuration) * 100;

  const estMaturity = getEstimatedMaturityDate(userPlan, totalDuration * 7);

  const handleJoinSuccess = () => {
    onJoin();
  };

  // Active State - Minimalist
  if (isJoined) {
    return (
      <Card className="flex flex-col relative overflow-hidden bg-white dark:bg-gray-900 border-l-4 border-l-indigo-500 shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="text-indigo-700 border-indigo-200 bg-indigo-50">
                  {plan.name}
                </Badge>
                <Badge
                  className={
                    userPlan?.status === "pending_activation"
                      ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200"
                      : "bg-indigo-600 hover:bg-indigo-700 text-white"
                  }
                >
                  {userPlan?.status === "pending_activation" ? "Pending Activation" : "Active"}
                </Badge>
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

        <CardContent className="space-y-6 flex-1 pt-4">
          <div
            className={`flex items-center gap-2 p-2 rounded-md text-xs border font-medium ${arrears > 0 ? "bg-red-50 text-red-700 border-red-100" : "bg-emerald-50 text-emerald-700 border-emerald-100"}`}
          >
            <AlertOctagon className="w-3.5 h-3.5" />
            <span>
              {arrears > 0
                ? `${arrears / 500} Missed Week(s) to be paid (Arrears: ${formatNaira(arrears)})`
                : `0 Missed Weeks (Cleared: ₦0.00)`}
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400 font-medium">Journey Progress</span>
              <span className="font-bold text-gray-900 dark:text-gray-200">
                {weeksCompleted} / {totalDuration} Weeks
              </span>
            </div>
            <div className="h-2 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full"
                style={{ width: `${totalProgress}%` }}
              />
            </div>
            {estMaturity && (
              <div className="text-[10px] text-emerald-600 font-bold mt-1 text-right">
                Est. Maturity: {estMaturity}
              </div>
            )}
          </div>

          <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-800 space-y-2">
            <div className="flex justify-between text-xs font-bold text-gray-700 dark:text-gray-300">
              <span className="flex items-center gap-1.5 uppercase tracking-wider text-[10px] text-gray-500">
                <TrendingUp className="w-3.5 h-3.5" /> This Week
              </span>
              <span className={progressPercent >= 100 ? "text-emerald-600" : "text-amber-600"}>
                {progressPercent >= 100
                  ? "Goal Met 🔒"
                  : `${formatNaira(currentWeekTotal)} / ${formatNaira(weeklyTarget)}`}
              </span>
            </div>
            <div className="h-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${progressPercent >= 100 ? "bg-emerald-500" : "bg-indigo-400"}`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-gray-400">
              <span>Left: {formatNaira(Math.max(0, weeklyTarget - currentWeekTotal))}</span>
              <span>Resets Sun 11:59PM</span>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-3 pt-2">
          <div className="grid grid-cols-2 gap-3 w-full">
            {userPlan?.status === "pending_activation" ? (
              <Button
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                onClick={() => onDeposit(plan.id)}
              >
                Activate Plan
              </Button>
            ) : currentWeekTotal < weeklyTarget ? (
              <Button
                className="w-full bg-gray-900 hover:bg-gray-800 text-white dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
                onClick={() => onDeposit(plan.id)}
              >
                {arrears > 0 ? "Pay Penalties" : "Add Funds"}
              </Button>
            ) : (
              <Button
                variant="secondary"
                className="w-full bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 font-bold"
                onClick={() => onAdvanceDeposit && onAdvanceDeposit(plan.id)}
              >
                Save More for the Week
              </Button>
            )}
            <Button variant="outline" asChild className="w-full">
              <a href={plan.whatsapp_link} target="_blank" rel="noopener noreferrer">
                Group Chat
              </a>
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
    <>
      <Card className="flex flex-col relative overflow-hidden bg-white dark:bg-gray-900 border-l-4 border-l-indigo-500 shadow-sm hover:shadow-md transition-shadow group">
        <CardHeader className="pb-4">
          <div className="flex justify-between items-start">
            <div>
              <Badge
                variant="secondary"
                className="mb-2 bg-indigo-50 text-indigo-700 border-indigo-100 hover:bg-indigo-100"
              >
                High Discipline
              </Badge>
              <CardTitle className="text-xl font-bold text-gray-900 dark:text-white">
                {plan.name}
              </CardTitle>
            </div>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium leading-relaxed mt-1 line-clamp-2">
            Build a rock-solid financial foundation with a robust, year-round savings commitment.
          </p>
        </CardHeader>

        <CardContent className="flex-1 space-y-6 pt-2">
          <div className="flex justify-between items-end border-b border-gray-100 dark:border-gray-800 pb-4">
            <div>
              <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">
                Weekly Min
              </p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">₦3,000</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">
                Duration
              </p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">48 Weeks</p>
              {estMaturity && (
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-1">
                  Est. Maturity: {estMaturity}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-4 pt-2">
            <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-100 dark:border-indigo-800">
              <h4 className="text-[10px] font-bold text-indigo-800 dark:text-indigo-400 uppercase tracking-wider mb-2">
                Rules & Features
              </h4>
              <ul className="space-y-1.5 mb-4">
                <li className="flex items-center gap-2 text-xs text-indigo-700 dark:text-indigo-400">
                  <div className="w-1 h-1 rounded-full bg-indigo-500" />
                  Robust 48-week savings commitment
                </li>
                <li className="flex items-center gap-2 text-xs text-indigo-700 dark:text-indigo-400">
                  <div className="w-1 h-1 rounded-full bg-indigo-500" />
                  Strictly locked; no early breakage
                </li>
                <li className="flex items-center gap-2 text-xs text-indigo-700 dark:text-indigo-400">
                  <div className="w-1 h-1 rounded-full bg-indigo-500" />
                  ₦500 penalty for missed weeks
                </li>
                <li className="flex items-center gap-2 text-xs text-indigo-700 dark:text-indigo-400">
                  <div className="w-1 h-1 rounded-full bg-indigo-500" />
                  Service charges auto deducted per week
                </li>
              </ul>

              <div className="rounded border border-indigo-100 dark:border-indigo-800 overflow-hidden">
                <table className="w-full text-[10px] text-left">
                  <thead className="bg-indigo-100/50 dark:bg-indigo-900/40 font-bold text-indigo-800 dark:text-indigo-400">
                    <tr>
                      <th className="px-2 py-1">Weekly Amount</th>
                      <th className="px-2 py-1 text-right">Service Charge</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-indigo-50 dark:divide-indigo-800 text-indigo-700 dark:text-indigo-400">
                    {plan.service_charge_type === "tiered" &&
                    plan.service_charge_tiers &&
                    plan.service_charge_tiers.length > 0 ? (
                      plan.service_charge_tiers.map((tier: any, idx: number) => (
                        <tr key={idx}>
                          <td className="px-2 py-1">
                            {formatNaira(tier.min)} -{" "}
                            {tier.max > 0 && tier.max < 9999999 ? formatNaira(tier.max) : "Above"}
                          </td>
                          <td className="px-2 py-1 text-right font-bold">
                            {formatNaira(tier.fee)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="px-2 py-1">All Ranges</td>
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
                <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
                <span>Disciplined</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-indigo-600" />
                <span>Auto-Recovery</span>
              </div>
            </div>
          </div>
        </CardContent>

        <CardFooter className="pt-2">
          <Button
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-12 rounded-2xl shadow-lg shadow-emerald-500/20 transition-all duration-300 hover:-translate-y-0.5"
            onClick={() => setShowJoinModal(true)}
          >
            Start The Anchor
          </Button>
        </CardFooter>
      </Card>

      <SprintJoinModal
        isOpen={showJoinModal}
        onClose={() => setShowJoinModal(false)}
        onSuccess={handleJoinSuccess}
        plan={plan}
        customTitle="Confirm Anchor Commitment"
        customTerms={[
          "Duration: 48 Weeks (Strict)",
          "Minimum Amount: ₦3,000",
          "Status Check: Sunday 11:59PM",
          "Penalty: ₦500 per missed week",
          "Withdrawal: Locked until completion (No Breakage)",
          "Auto-Recover: Arrears deducted automatically",
        ]}
      />
    </>
  );
}
