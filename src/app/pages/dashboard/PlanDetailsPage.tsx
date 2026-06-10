import { useEffect, useState } from "react";

import {
  Loader2,
  ArrowLeft,
  ShieldCheck,
  TrendingUp,
  History,
  Coins,
  Zap,
  Shield,
  Info,
  AlertTriangle,
  Plus,
} from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { PlanActivityHistory } from "@/app/components/dashboard/PlanActivityHistory";
import { PlanHealthCard } from "@/app/components/dashboard/PlanHealthCard";
import { DepositModal } from "@/app/components/DepositModal";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Dialog } from "@/app/components/ui/dialog";
import { useAuth } from "@/app/context/AuthContext";
import { notificationDispatcher } from "@/lib/notificationDispatcher";
import { unslugify, slugify } from "@/lib/slug";
import { supabase } from "@/lib/supabase";
import { Plan, UserPlan } from "@/types";

import { AjoPlanCard } from "./plans/AjoPlanCard";
import { AnchorPlanCard } from "./plans/AnchorPlanCard";
import { DailyDropPlanCard } from "./plans/DailyDropPlanCard";
import { MarathonPlanCard } from "./plans/MarathonPlanCard";
import { MonthlyBloomPlanCard } from "./plans/MonthlyBloomPlanCard";
import { SprintPlanCard } from "./plans/SprintPlanCard";
import { StepUpPlanCard } from "./plans/StepUpPlanCard";

export function PlanDetailsPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [userPlan, setUserPlan] = useState<UserPlan | null>(null);
  const [selectedPlanForDeposit, setSelectedPlanForDeposit] = useState<{
    id: string;
    isAdvance?: boolean;
  } | null>(null);

  useEffect(() => {
    if (id && user?.id) {
      fetchPlanDetails();
    }
  }, [id, user?.id]);

  async function fetchPlanDetails() {
    if (!id) return;
    setLoading(true);
    try {
      // Check if ID is a UUID
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

      let planData = null;
      if (isUUID) {
        const { data } = await supabase.from("plans").select("*").eq("id", id).single();
        if (data) planData = data;
      }

      if (!planData) {
        // Try fetching by name (unslugified)
        const possibleName = unslugify(id);
        const { data } = await supabase
          .from("plans")
          .select("*")
          .ilike("name", `%${possibleName}%`)
          .limit(1)
          .maybeSingle();

        if (data) {
          planData = data;
        } else {
          // Final fallback: fetch all and find matching slug
          const { data: allPlans } = await supabase.from("plans").select("*");
          planData = allPlans?.find((p) => slugify(p.name) === id) || null;
        }
      }

      if (!planData) {
        toast.error("Plan not found");
        navigate("/dashboard/plans");
        return;
      }

      setPlan(planData as Plan);

      const { data: userPlanData } = await supabase
        .from("user_plans")
        .select(`*, plan:plans(*)`)
        .eq("user_id", user?.id)
        .eq("plan_id", planData.id)
        .not("status", "eq", "cancelled")
        .maybeSingle();

      if (userPlanData) {
        setUserPlan(userPlanData as any);
      } else {
        setUserPlan(null);
      }
    } catch (err) {
      console.error("Error fetching plan details:", err);
    } finally {
      setLoading(false);
    }
  }

  const handleJoinPlan = async (planId: string, metadata?: any) => {
    if (!user) return;
    try {
      // Check for duplicates
      const { data: existing } = await supabase
        .from("user_plans")
        .select("id, status")
        .eq("user_id", user.id)
        .eq("plan_id", planId)
        .not("status", "in", '("cancelled", "completed")')
        .maybeSingle();

      if (existing) {
        if (existing.status === "pending_activation") {
          toast.info("Resuming setup for your pending plan...");
          setSelectedPlanForDeposit({ id: planId });
          return;
        }
        toast.error("You already have an active record for this plan.");
        return;
      }

      const { error } = await supabase.from("user_plans").insert({
        user_id: user.id,
        plan_id: planId,
        status: "pending_activation",
        current_balance: 0,
        plan_metadata: metadata || {},
      });

      if (error) throw error;
      toast.success("Successfully joined the plan! Make your first deposit to activate.");

      if (user.email && plan) {
        await notificationDispatcher.sendAlert({
          userId: user.id,
          email: user.email,
          type: "plan",
          title: `Welcome to the ${plan.name} Plan!`,
          message: `You have successfully joined the "${plan.name}" savings plan. Make your first deposit/contribution to activate and start saving.`,
        });
      }

      fetchPlanDetails();
      setSelectedPlanForDeposit({ id: planId });
    } catch (err: any) {
      toast.error(err.message || "Failed to join plan");
    }
  };

  const handleJoinAjoPlan = async (
    planId: string,
    subscriptions: { proposed_week: number; amount: number }[],
  ) => {
    if (!user) return;
    try {
      // Check for duplicates
      const { data: existing } = await supabase
        .from("user_plans")
        .select("id")
        .eq("user_id", user.id)
        .eq("plan_id", planId)
        .not("status", "in", '("cancelled", "completed")')
        .maybeSingle();

      if (existing) {
        toast.error("You already have an active or pending record for this plan.");
        return;
      }

      const totalAmount = subscriptions.reduce((acc, s) => acc + s.amount, 0);
      const { error } = await supabase.from("user_plans").insert({
        user_id: user.id,
        plan_id: planId,
        status: "pending_activation",
        current_balance: 0,
        plan_metadata: {
          slots: subscriptions,
          total_expected_per_cycle: totalAmount,
          fixed_amount: totalAmount,
          proposed_turns: subscriptions.map((s) => s.proposed_week),
        },
      });

      if (error) throw error;
      toast.success("Joined Ajo Plan! Make your first cycle payment to submit for review.");

      if (user.email && plan) {
        await notificationDispatcher.sendAlert({
          userId: user.id,
          email: user.email,
          type: "plan",
          title: `Welcome to the ${plan.name} Plan!`,
          message: `You have successfully joined the "${plan.name}" Ajo plan. Make your first cycle payment to activate and submit for review.`,
        });
      }

      fetchPlanDetails();
      setSelectedPlanForDeposit({ id: planId });
    } catch (err: any) {
      toast.error(err.message || "Failed to join plan");
    }
  };

  const handleLeavePlan = async (userPlanId: string) => {
    if (
      !window.confirm(
        "Are you sure you want to leave this plan? Any pending request will be deleted.",
      )
    ) {
      return;
    }
    try {
      const { error } = await supabase.from("user_plans").delete().eq("id", userPlanId);

      if (error) throw error;
      toast.success("Successfully left the plan");
      fetchPlanDetails();
    } catch (err: any) {
      toast.error(err.message || "Failed to leave plan");
    }
  };

  if (loading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!plan) return null;

  const isJoined = !!userPlan;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Premium Hero Section */}
      <div className="relative h-64 md:h-80 rounded-[2.5rem] overflow-hidden shadow-2xl group border border-gray-100 dark:border-gray-800">
        {/* Dynamic Gradient Background */}
        <div
          className={`absolute inset-0 opacity-90 transition-all duration-1000 group-hover:scale-105 bg-gradient-to-br ${
            plan.type === "marathon"
              ? "from-emerald-600 to-teal-900"
              : plan.type === "sprint"
                ? "from-blue-600 to-indigo-900"
                : plan.type === "anchor"
                  ? "from-indigo-600 to-purple-900"
                  : plan.type === "daily_drop"
                    ? "from-cyan-600 to-blue-900"
                    : plan.type === "step_up"
                      ? "from-teal-600 to-emerald-900"
                      : plan.type === "monthly_bloom"
                        ? "from-pink-600 to-rose-900"
                        : "from-emerald-500 to-emerald-900"
          }`}
        />

        {/* Decorative Elements */}
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Coins className="size-48 rotate-12" />
        </div>

        <div className="absolute inset-0 p-8 md:p-12 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <Button
              variant="secondary"
              size="icon"
              onClick={() => navigate("/dashboard/plans")}
              className="rounded-2xl bg-white/10 hover:bg-white/20 border-white/20 text-white backdrop-blur-md transition-all active:scale-95 shadow-lg shadow-black/10"
            >
              <ArrowLeft className="size-5" />
            </Button>

            <div className="flex gap-3">
              <Badge className="bg-white/10 text-white border-white/20 backdrop-blur-md px-4 py-1.5 rounded-xl font-bold uppercase tracking-tight text-[10px]">
                {plan.type.replace("_", " ")}
              </Badge>
              {isJoined && (
                <Badge className="bg-emerald-500 text-white border-none px-4 py-1.5 rounded-xl font-black uppercase tracking-tight text-[10px] shadow-lg shadow-emerald-500/20">
                  {userPlan.status.toUpperCase()}
                </Badge>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter drop-shadow-sm">
              {plan.name}
            </h1>
            <p className="text-white/70 max-w-2xl text-sm md:text-base font-medium leading-relaxed drop-shadow-sm line-clamp-2 md:line-clamp-none">
              {plan.description}
            </p>
          </div>
        </div>
      </div>

      <div
        className={`grid grid-cols-1 ${!isJoined || ["pending_activation", "pending_turn_approval", "turn_reassigned", "appeal_pending"].includes(userPlan?.status || "") ? "lg:grid-cols-3" : ""} gap-8`}
      >
        {/* Main Content Area */}
        <div
          className={`${!isJoined || ["pending_activation", "pending_turn_approval", "turn_reassigned", "appeal_pending"].includes(userPlan?.status || "") ? "lg:col-span-2" : ""} space-y-8`}
        >
          {/* Key Stats / Highlights */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-950 p-6 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm space-y-2">
              <div className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 size-10 rounded-2xl flex items-center justify-center mb-2">
                <Zap className="size-5" />
              </div>
              <p className="text-[10px] font-black uppercase text-gray-400 tracking-wider">
                Duration
              </p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {plan.duration_weeks
                  ? `${plan.duration_weeks} Weeks`
                  : plan.duration_months
                    ? `${plan.duration_months} Months`
                    : "Flexible"}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-950 p-6 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm space-y-2">
              <div className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 size-10 rounded-2xl flex items-center justify-center mb-2">
                <Shield className="size-5" />
              </div>
              <p className="text-[10px] font-black uppercase text-gray-400 tracking-wider">
                Commitment
              </p>
              <p className="text-lg font-bold text-gray-900 dark:text-white capitalize">
                {plan.contribution_type}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-950 p-6 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm space-y-2">
              <div className="bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 size-10 rounded-2xl flex items-center justify-center mb-2">
                <TrendingUp className="size-5" />
              </div>
              <p className="text-[10px] font-black uppercase text-gray-400 tracking-wider">
                Service Fee
              </p>
              <p className="text-sm md:text-md font-bold text-gray-900 dark:text-white">
                {plan.service_charge_type === "percentage" && plan.service_charge_percentage === 100
                  ? plan.service_charge_is_recurring
                    ? `1st Payment & every ${plan.service_charge_interval_days}d`
                    : "1st Payment"
                  : plan.service_charge_type === "percentage"
                    ? `${plan.service_charge_percentage}%`
                    : plan.service_charge_type === "tiered"
                      ? "Tiered"
                      : `₦${new Intl.NumberFormat("en-US").format(plan.service_charge_fixed || plan.service_charge || 0)}${plan.service_charge_is_recurring ? ` / ${plan.service_charge_interval_days}d` : ""}`}
              </p>
            </div>
            {isJoined &&
              ![
                "pending_activation",
                "pending_turn_approval",
                "turn_reassigned",
                "appeal_pending",
              ].includes(userPlan?.status || "") && (
                <div className="bg-white dark:bg-gray-950 p-6 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm space-y-2">
                  <div className="bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 size-10 rounded-2xl flex items-center justify-center mb-2">
                    <Coins className="size-5" />
                  </div>
                  <p className="text-[10px] font-black uppercase text-gray-400 tracking-wider">
                    Plan Progress
                  </p>
                  <div className="flex flex-col">
                    {(() => {
                      if (!isJoined) return <p className="text-lg font-bold text-gray-400">---</p>;
                      const meta = userPlan.plan_metadata || {};
                      let current = 0;
                      let total = 0;
                      let unit = "Days";

                      if (plan.type === "daily_drop") {
                        current = meta.total_days_paid || 0;
                        total = meta.selected_duration || 31;
                        unit = "Days";
                      } else if (plan.type === "step_up") {
                        current = meta.weeks_completed || 0;
                        total = meta.selected_duration || 52;
                        unit = "Weeks";
                      } else if (plan.type === "monthly_bloom") {
                        current = meta.months_completed || 0;
                        total = meta.selected_duration || 12;
                        unit = "Months";
                      } else if (plan.type === "ajo_circle") {
                        current = Math.floor(
                          (userPlan.current_balance || 0) / (meta.fixed_amount || 1),
                        );
                        total = plan.duration_weeks || 10;
                        unit = "Weeks";
                      } else {
                        current = meta.weeks_completed || 0;
                        total = plan.duration_weeks || 0;
                        unit = "Weeks";
                      }

                      if (total === -1)
                        return <p className="text-lg font-bold text-emerald-500">Continuous</p>;
                      return (
                        <p className="text-lg font-bold text-emerald-600">
                          {current}{" "}
                          <span className="text-xs text-gray-400">
                            / {total} {unit}
                          </span>
                        </p>
                      );
                    })()}
                  </div>
                </div>
              )}
          </div>

          {/* Plan Activities / Joined View */}
          <div className="space-y-8">
            {isJoined &&
            ![
              "pending_activation",
              "pending_turn_approval",
              "turn_reassigned",
              "appeal_pending",
            ].includes(userPlan?.status || "") ? (
              <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
                {plan.type === "ajo_circle" ? (
                  <AjoPlanCard
                    plan={plan}
                    user_plan={userPlan || undefined}
                    onJoin={(_, subs) => handleJoinAjoPlan(plan.id, subs)}
                    onDeposit={() => setSelectedPlanForDeposit({ id: plan.id })}
                    onAdvanceDeposit={() =>
                      setSelectedPlanForDeposit({ id: plan.id, isAdvance: true })
                    }
                    onWithdraw={() => {
                      /* Withdraw handled in card */
                    }}
                    onLeave={() => handleLeavePlan(userPlan.id)}
                  />
                ) : (
                  <>
                    <PlanHealthCard userPlan={userPlan} />
                    <div className="w-full">
                      <Button
                        onClick={() => setSelectedPlanForDeposit({ id: plan.id })}
                        className="w-full h-16 rounded-[2rem] bg-emerald-600 hover:bg-emerald-700 text-white font-black text-lg gap-3 shadow-xl shadow-emerald-500/20 transition-all active:scale-95"
                      >
                        <Plus className="size-6" />
                        Drop Funds
                      </Button>
                    </div>
                  </>
                )}

                {userPlan.plan_metadata?.missed_weeks_details &&
                  userPlan.plan_metadata.missed_weeks_details.length > 0 && (
                    <div className="bg-red-50 dark:bg-red-900/10 rounded-[2.5rem] p-8 border border-red-100 dark:border-red-900/30 shadow-sm overflow-hidden mb-8">
                      <h3 className="text-xl font-black text-red-900 dark:text-red-400 mb-4 flex items-center gap-2">
                        <AlertTriangle className="size-6" /> Arrears Status
                      </h3>
                      <div className="space-y-4">
                        {userPlan.plan_metadata.missed_weeks_details.map(
                          (detail: any, idx: number) => (
                            <div
                              key={idx}
                              className="flex justify-between items-center p-4 bg-white dark:bg-gray-950 rounded-2xl border border-red-100 dark:border-red-900/50"
                            >
                              <div>
                                <p className="text-sm font-bold text-gray-900 dark:text-white">
                                  Week {detail.week} Missed Payment
                                </p>
                                <p className="text-xs text-gray-500">
                                  Auto-deduction pending or failed
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-lg font-black text-red-600">
                                  ₦{detail.amount?.toLocaleString()}
                                </p>
                                <Badge
                                  variant="outline"
                                  className="text-red-600 border-red-200 mt-1 bg-red-50"
                                >
                                  Unpaid
                                </Badge>
                              </div>
                            </div>
                          ),
                        )}
                      </div>
                    </div>
                  )}

                <div className="bg-white dark:bg-gray-950 rounded-[2.5rem] p-8 border border-gray-100 dark:border-gray-800 shadow-xl overflow-hidden">
                  <PlanActivityHistory
                    key={userPlan.id}
                    userId={user?.id || ""}
                    planId={plan.id}
                    userPlanId={userPlan.id}
                  />
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-950 rounded-[2.5rem] shadow-xl overflow-hidden border border-gray-100 dark:border-gray-800 transition-all">
                {plan.type === "marathon" && (
                  <MarathonPlanCard
                    plan={plan}
                    userPlan={userPlan || undefined}
                    onJoin={(duration) => {
                      const now = new Date();
                      const start = new Date(now.getFullYear(), 0, 15); // Approx 3rd week of Jan
                      const diffTime = now.getTime() - start.getTime();
                      const diffWeeks = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));
                      const startingWeek = Math.max(1, diffWeeks + 1);

                      handleJoinPlan(plan.id, {
                        selected_duration: duration,
                        fixed_amount: 3000,
                        total_weeks_paid: 0,
                        starting_week: startingWeek,
                        last_payment_date: null,
                      });
                    }}
                    onDeposit={() => setSelectedPlanForDeposit({ id: plan.id })}
                    onAdvanceDeposit={() =>
                      setSelectedPlanForDeposit({ id: plan.id, isAdvance: true })
                    }
                    onLeave={userPlan ? () => handleLeavePlan(userPlan.id) : undefined}
                  />
                )}
                {plan.type === "sprint" && (
                  <SprintPlanCard
                    plan={plan}
                    userPlan={userPlan || undefined}
                    onJoin={() => {
                      handleJoinPlan(plan.id, {
                        selected_duration: 30,
                        target_amount: 3000,
                        weeks_completed: 0,
                        current_week_total: 0,
                        last_payment_date: null,
                      });
                    }}
                    onDeposit={() => setSelectedPlanForDeposit({ id: plan.id })}
                    onAdvanceDeposit={() =>
                      setSelectedPlanForDeposit({ id: plan.id, isAdvance: true })
                    }
                    onLeave={userPlan ? () => handleLeavePlan(userPlan.id) : undefined}
                  />
                )}
                {plan.type === "anchor" && (
                  <AnchorPlanCard
                    plan={plan}
                    userPlan={userPlan || undefined}
                    onJoin={() => {
                      handleJoinPlan(plan.id, {
                        target_amount: 3000,
                        weeks_completed: 0,
                        current_week_total: 0,
                        last_payment_date: null,
                      });
                    }}
                    onDeposit={() => setSelectedPlanForDeposit({ id: plan.id })}
                    onAdvanceDeposit={() =>
                      setSelectedPlanForDeposit({ id: plan.id, isAdvance: true })
                    }
                    onLeave={userPlan ? () => handleLeavePlan(userPlan.id) : undefined}
                  />
                )}
                {plan.type === "daily_drop" && (
                  <DailyDropPlanCard
                    plan={plan}
                    userPlan={userPlan || undefined}
                    onJoin={(pId: string, a: number, d: number) => {
                      handleJoinPlan(pId, {
                        selected_duration: d,
                        fixed_amount: a,
                        total_days_paid: 0,
                        last_payment_date: null,
                      });
                    }}
                    onRefresh={() => fetchPlanDetails()}
                    onDeposit={() => setSelectedPlanForDeposit({ id: plan.id })}
                    onAdvanceDeposit={() =>
                      setSelectedPlanForDeposit({ id: plan.id, isAdvance: true })
                    }
                    onLeave={userPlan ? () => handleLeavePlan(userPlan.id) : undefined}
                  />
                )}
                {plan.type === "step_up" && (
                  <StepUpPlanCard
                    plan={plan}
                    userPlan={userPlan || undefined}
                    onJoin={(_pId: string, a: number, d: number) => {
                      handleJoinPlan(plan.id, {
                        selected_duration: d,
                        fixed_amount: a,
                        weeks_completed: 0,
                        week_paid_so_far: 0,
                        last_payment_date: null,
                      });
                    }}
                    onDeposit={() => setSelectedPlanForDeposit({ id: plan.id })}
                    onAdvanceDeposit={() =>
                      setSelectedPlanForDeposit({ id: plan.id, isAdvance: true })
                    }
                    onLeave={userPlan ? () => handleLeavePlan(userPlan.id) : undefined}
                  />
                )}
                {plan.type === "monthly_bloom" && (
                  <MonthlyBloomPlanCard
                    plan={plan}
                    userPlan={userPlan || undefined}
                    onJoin={(_pId: string, a: number, d: number) => {
                      handleJoinPlan(plan.id, {
                        selected_duration: d,
                        target_amount: a,
                        months_completed: 0,
                        month_paid_so_far: 0,
                        last_payment_date: null,
                      });
                    }}
                    onDeposit={() => setSelectedPlanForDeposit({ id: plan.id })}
                    onAdvanceDeposit={() =>
                      setSelectedPlanForDeposit({ id: plan.id, isAdvance: true })
                    }
                    onLeave={userPlan ? () => handleLeavePlan(userPlan.id) : undefined}
                  />
                )}
                {plan.type === "ajo_circle" && (
                  <AjoPlanCard
                    plan={plan}
                    user_plan={userPlan || undefined}
                    onJoin={(_, subs) => handleJoinAjoPlan(plan.id, subs)}
                    onDeposit={() => setSelectedPlanForDeposit({ id: plan.id })}
                    onAdvanceDeposit={() =>
                      setSelectedPlanForDeposit({ id: plan.id, isAdvance: true })
                    }
                    onWithdraw={() => {
                      /* Withdraw handled in card */
                    }}
                    onLeave={userPlan ? () => handleLeavePlan(userPlan.id) : undefined}
                  />
                )}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar / Info Area - Hidden for Active Plans */}
        {(!isJoined ||
          [
            "pending_activation",
            "pending_turn_approval",
            "turn_reassigned",
            "appeal_pending",
          ].includes(userPlan?.status || "")) && (
          <div className="space-y-8">
            <div className="bg-[#0f172a] text-white p-8 rounded-[2.5rem] shadow-xl space-y-6 relative overflow-hidden group">
              <div className="absolute -top-10 -right-10 size-40 bg-emerald-500/10 rounded-full blur-3xl group-hover:bg-emerald-500/20 transition-all duration-700" />

              <div className="flex items-center gap-3">
                <div className="bg-emerald-500/20 p-2 rounded-xl">
                  <ShieldCheck className="size-6 text-emerald-400" />
                </div>
                <h3 className="text-xl font-black tracking-tight">Thrift Security</h3>
              </div>

              <p className="text-gray-400 text-sm leading-relaxed font-medium">
                Your savings are protected by Mary's Thrift high-standard security protocols. We
                ensure that every contribution is tracked and payouts are guaranteed.
              </p>

              <div className="space-y-4 pt-4">
                <div className="flex items-center gap-3">
                  <div className="size-2 rounded-full bg-emerald-500" />
                  <span className="text-xs font-bold text-gray-300">Automated Ledger Tracking</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="size-2 rounded-full bg-emerald-500" />
                  <span className="text-xs font-bold text-gray-300">Transparent Payout Cycles</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="size-2 rounded-full bg-emerald-500" />
                  <span className="text-xs font-bold text-gray-300">24/7 Support for Savings</span>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-950 p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm space-y-6">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-xl">
                  <History className="size-6 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">
                  How it Works
                </h3>
              </div>

              <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed font-medium">
                Join the plan, set your goals, and start making contributions. You can track your
                progress and withdraw your matured savings once the duration is complete.
              </p>

              <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl flex items-center gap-4">
                <div className="bg-blue-500/10 p-2 rounded-lg">
                  <Info className="size-5 text-blue-500" />
                </div>
                <p className="text-[10px] font-bold text-gray-500 leading-tight">
                  Missed payments may incur a service charge or penalty depending on the plan type.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <Dialog open={!!selectedPlanForDeposit} onOpenChange={() => setSelectedPlanForDeposit(null)}>
        <DepositModal
          onSuccess={() => {
            fetchPlanDetails();
          }}
          onClose={() => setSelectedPlanForDeposit(null)}
          defaultPlanId={selectedPlanForDeposit?.id || ""}
          initialAdvanceMode={selectedPlanForDeposit?.isAdvance}
        />
      </Dialog>
    </div>
  );
}
