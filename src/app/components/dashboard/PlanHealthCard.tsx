import {
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  Wallet,
  Calendar,
  AlertTriangle,
} from "lucide-react";

import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { formatNaira } from "@/lib/utils";
import { UserPlan } from "@/types";

interface PlanHealthCardProps {
  userPlan: UserPlan;
  onDeposit?: () => void;
}

export function PlanHealthCard({ userPlan, onDeposit }: PlanHealthCardProps) {
  const metadata = (userPlan.plan_metadata || {}) as any;
  const fixedAmount = metadata.fixed_amount || userPlan.plan?.fixed_amount || 0;
  const targetAmount =
    metadata.target_amount || metadata.fixed_amount || userPlan.plan?.fixed_amount || 0;
  const planType = userPlan.plan?.type;

  let targetTitle = "Target Amount";
  if (planType === "daily_drop") {
    targetTitle = "Daily Target";
  } else if (planType === "sprint" || planType === "step_up" || planType === "marathon") {
    targetTitle = "Weekly Target";
  } else if (planType === "monthly_bloom") {
    targetTitle = "Monthly Target";
  } else if (planType === "anchor") {
    targetTitle = "Plan Target";
  } else if (planType === "ajo_circle") {
    targetTitle = "Weekly Contribution";
  }

  // Arrears Calculation
  const calculateArrears = () => {
    if (metadata.arrears_amount !== undefined && metadata.arrears_amount !== null) {
      return metadata.arrears_amount;
    }
    if (planType === "daily_drop") {
      const totalDaysPaid = parseInt(metadata.total_days_paid || "0", 10);
      const startDateStr = userPlan.start_date || userPlan.created_at;
      const startDate = new Date(startDateStr);
      startDate.setHours(0, 0, 0, 0);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const diffTime = today.getTime() - startDate.getTime();
      const expectedDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;

      const missedDays = Math.max(0, expectedDays - totalDaysPaid);
      return missedDays * fixedAmount;
    }

    return 0;
  };

  const arrears = calculateArrears();
  const isHealthy = arrears === 0;

  const formatCurrency = (val: number) => formatNaira(val);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="bg-white dark:bg-gray-950 p-6 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
          <Wallet className="size-12" />
        </div>
        <p className="text-[10px] font-black uppercase text-gray-400 tracking-wider mb-1">
          Total Saved
        </p>
        <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
          {formatCurrency(userPlan.current_balance || 0)}
        </p>
        <div className="mt-2 flex items-center gap-1.5">
          <TrendingUp className="size-3 text-emerald-500" />
          <span className="text-[10px] font-bold text-emerald-500 uppercase">Balance</span>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-950 p-6 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
          <AlertCircle className="size-12" />
        </div>
        <p className="text-[10px] font-black uppercase text-gray-400 tracking-wider mb-1">
          Arrears / Missed
        </p>
        <p
          className={`text-2xl font-black ${arrears > 0 ? "text-rose-600" : "text-gray-900 dark:text-white"}`}
        >
          {formatCurrency(arrears)}
        </p>
        <div className="mt-2 flex items-center gap-1.5">
          <AlertTriangle
            className={`size-3 ${arrears > 0 ? "text-rose-500" : "text-emerald-500"}`}
          />
          <span
            className={`text-[10px] font-bold uppercase ${arrears > 0 ? "text-rose-500" : "text-emerald-500"}`}
          >
            {arrears > 0 ? "Payment Required" : "All Caught Up"}
          </span>
        </div>
        {arrears > 0 && onDeposit && (
          <Button
            size="sm"
            onClick={onDeposit}
            className="w-full mt-3 bg-red-600 hover:bg-red-700 text-white font-bold h-7 text-xs"
          >
            Pay Arrears
          </Button>
        )}
      </div>

      <div className="bg-white dark:bg-gray-950 p-6 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
          <Calendar className="size-12" />
        </div>
        <p className="text-[10px] font-black uppercase text-gray-400 tracking-wider mb-1">
          {targetTitle}
        </p>
        <p className="text-2xl font-black text-gray-900 dark:text-white">
          {formatCurrency(targetAmount)}
        </p>
        <div className="mt-2 flex items-center gap-1.5 text-gray-400">
          <span className="text-[10px] font-bold uppercase">Target Amount</span>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-950 p-6 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
          {isHealthy ? <CheckCircle2 className="size-12" /> : <AlertTriangle className="size-12" />}
        </div>
        <p className="text-[10px] font-black uppercase text-gray-400 tracking-wider mb-1">
          Plan Health
        </p>
        <div className="flex items-center gap-2">
          <Badge
            className={`px-4 py-1 rounded-xl font-black text-[10px] uppercase tracking-wider ${
              isHealthy ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
            }`}
          >
            {isHealthy ? "Healthy" : "At Risk"}
          </Badge>
        </div>
        <p className="mt-2 text-[10px] font-medium text-gray-500 leading-tight">
          {isHealthy
            ? "You are doing great! Keep it up."
            : "Please cover your arrears to stay on track."}
        </p>
      </div>
    </div>
  );
}
