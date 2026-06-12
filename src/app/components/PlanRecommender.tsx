import React, { useState, useEffect } from "react";

import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  Clock,
  Users,
  Target,
  Zap,
  ShieldCheck,
  ArrowRight,
  RefreshCcw,
  CheckCircle2,
  MessageSquare,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { Button } from "@/app/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/app/components/ui/dialog";
import { useAuth } from "@/app/context/AuthContext";
import { slugify } from "@/lib/slug";
import { supabase } from "@/lib/supabase";

interface PlanRecommenderProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  inline?: boolean;
  defaultTab?: "quiz" | "compare";
}

type Step = "frequency" | "goal" | "duration" | "result";

interface Selections {
  frequency: string;
  goal: string;
  duration: string;
}

const planComparisonMatrix = [
  {
    name: "Daily Savings",
    frequency: "Daily",
    duration: "Flexible (31 days min)",
    withdrawals: "Strictly locked until 31 days cycle completed",
    charge: "₦1,000 Setup Fee (Free afterwards)",
    benefit: "Best for building a continuous saving habit and inconsistent earners",
    dbType: "daily_drop",
  },
  {
    name: "30-Weeks Saving Sprint",
    frequency: "Weekly",
    duration: "Flexible (12 - 24 Weeks)",
    withdrawals: "Strictly locked during duration",
    charge: "₦100 per week",
    benefit: "Short/medium term target savings with automated deductions",
    dbType: "sprint",
  },
  {
    name: "Monthly Saving Plan",
    frequency: "Monthly",
    duration: "Flexible (3 - 12 Months)",
    withdrawals: "Strictly locked during duration",
    charge: "₦100 per month",
    benefit: "Stable salary earners budgeting for mid-to-long term goals",
    dbType: "monthly_bloom",
  },
  {
    name: "Marathon Target Savings",
    frequency: "Weekly",
    duration: "30 or 48 Weeks (Ends Dec)",
    withdrawals: "Strictly locked until December maturity",
    charge: "Tiered (₦20 - ₦100) per week",
    benefit: "Discipline builder for massive end-of-year lump-sum payouts",
    dbType: "marathon",
  },
  {
    name: "48-Weeks Saving Sprint",
    frequency: "Weekly",
    duration: "48 Weeks (Ends Dec)",
    withdrawals: "Strictly locked with auto-recovery protection",
    charge: "Tiered (₦20 - ₦100) per week",
    benefit: "Maximum saving discipline for long-term target accumulation",
    dbType: "anchor",
  },
  {
    name: "Rapid Fixed Savings",
    frequency: "Lump Sum",
    duration: "Flexible (Fixed lock)",
    withdrawals: "Strictly locked until set maturity date",
    charge: "Free / 0% Fee",
    benefit: "Guaranteed high-yield fixed returns on lump-sum deposits",
    dbType: "step_up",
  },
  {
    name: "Digital Ajo Plan",
    frequency: "Weekly",
    duration: "Group Cycles (e.g., 10 Weeks)",
    withdrawals: "Assigned turn payout only",
    charge: "₦100 flat fee per week",
    benefit: "Esusu pooling with friends; get big lump-sums when it's your turn",
    dbType: "ajo_circle",
  },
];

export function PlanRecommender({ open, onOpenChange, inline, defaultTab }: PlanRecommenderProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeView, setActiveView] = useState<"quiz" | "compare">("quiz");
  const [selectedComparePlans, setSelectedComparePlans] = useState<string[]>([
    "daily_drop",
    "sprint",
    "marathon",
  ]);

  const toggleComparePlan = (dbType: string) => {
    setSelectedComparePlans((prev) => {
      if (prev.includes(dbType)) {
        if (prev.length <= 1) {
          toast.error("Please keep at least one plan selected for comparison.");
          return prev;
        }
        return prev.filter((p) => p !== dbType);
      } else {
        if (prev.length >= 3) {
          toast.warning("You can compare up to 3 plans at a time.");
          return prev;
        }
        return [...prev, dbType];
      }
    });
  };

  const [step, setStep] = useState<Step>("frequency");
  const [selections, setSelections] = useState<Selections>({
    frequency: "",
    goal: "",
    duration: "",
  });
  const [dbPlans, setDbPlans] = useState<any[]>([]);

  useEffect(() => {
    if (defaultTab) {
      setActiveView(defaultTab);
    }
  }, [defaultTab, open]);

  useEffect(() => {
    const fetchPlans = async () => {
      const { data } = await supabase.from("plans").select("*").eq("is_active", true);
      if (data) setDbPlans(data);
    };
    fetchPlans();
  }, []);

  const reset = () => {
    setStep("frequency");
    setSelections({ frequency: "", goal: "", duration: "" });
  };

  const handleFrequency = (val: string) => {
    setSelections((prev) => ({ ...prev, frequency: val }));
    if (val === "Daily" || val === "Monthly" || val === "Lump Sum") {
      setStep("result");
    } else {
      setStep("goal");
    }
  };

  const handleGoal = (val: string) => {
    setSelections((prev) => ({ ...prev, goal: val }));
    if (val === "Community") {
      setStep("result");
    } else {
      setStep("duration");
    }
  };

  const handleDuration = (val: string) => {
    setSelections((prev) => ({ ...prev, duration: val }));
    setStep("result");
  };

  const getRecommendations = () => {
    const { frequency, goal, duration } = selections;

    let selected = [];
    if (frequency === "Daily") selected = [plans.daily];
    else if (frequency === "Monthly") selected = [plans.monthly];
    else if (frequency === "Lump Sum") selected = [plans.stepup];
    else if (goal === "Community") selected = [plans.ajo];
    else if (goal === "Discipline") selected = [plans.anchor];
    else if (duration === "Long Term") selected = [plans.marathon];
    else selected = [plans.sprint];

    // Link with DB IDs if possible
    return selected.map((rec) => {
      const dbMatch = dbPlans.find((dbp) => dbp.type === rec.dbType);
      return { ...rec, id: dbMatch?.id };
    });
  };

  const handleSelectPlan = (plan: any) => {
    if (onOpenChange) onOpenChange(false);
    const joinParam = plan.id ? plan.id : slugify(plan.name);
    if (user) {
      navigate(`/dashboard/plans?join=${joinParam}`);
    } else {
      navigate(`/login?join=${joinParam}`);
    }
  };

  const recommendations = getRecommendations();
  const comparedPlans = planComparisonMatrix.filter((p) => selectedComparePlans.includes(p.dbType));
  const planCount = comparedPlans.length;
  const gridColsClass =
    planCount === 1
      ? "md:grid-cols-1 md:max-w-md md:mx-auto"
      : planCount === 2
        ? "md:grid-cols-2 md:max-w-3xl md:mx-auto"
        : "md:grid-cols-3 md:max-w-6xl md:mx-auto";

  const Content = (
    <div
      className={
        inline
          ? "bg-white dark:bg-gray-900 rounded-3xl overflow-hidden border border-gray-100 dark:border-gray-800 shadow-xl w-full"
          : ""
      }
    >
      {/* View Tabs */}
      <div
        className={`px-6 sm:px-8 pt-6 pb-0 border-b border-slate-100 dark:border-slate-800 flex gap-6 bg-slate-50/50 dark:bg-slate-900/30 relative ${!inline ? "pr-12" : ""}`}
      >
        <button
          onClick={() => setActiveView("quiz")}
          className={`pb-3 text-sm font-bold border-b-2 transition-all relative ${
            activeView === "quiz"
              ? "border-emerald-600 text-emerald-600"
              : "border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-600"
          }`}
        >
          Savings Quiz
        </button>
        <button
          onClick={() => setActiveView("compare")}
          className={`pb-3 text-sm font-bold border-b-2 transition-all relative ${
            activeView === "compare"
              ? "border-emerald-600 text-emerald-600"
              : "border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-600"
          }`}
        >
          Compare All Plans
        </button>
      </div>

      <div className="p-6 sm:p-8">
        <AnimatePresence mode="wait">
          {activeView === "quiz" ? (
            <motion.div
              key="quiz-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {step === "frequency" && (
                <motion.div
                  key="freq"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 text-left">
                    How often do you want to save?
                  </h3>
                  <div className="grid grid-cols-1 gap-3">
                    <OptionButton
                      icon={<Zap className="size-5" />}
                      title="Daily"
                      description="Small frequent amounts"
                      onClick={() => handleFrequency("Daily")}
                    />
                    <OptionButton
                      icon={<Calendar className="size-5" />}
                      title="Weekly"
                      description="Structured weekly deposits"
                      onClick={() => handleFrequency("Weekly")}
                    />
                    <OptionButton
                      icon={<Clock className="size-5" />}
                      title="Monthly"
                      description="Once a month commitment"
                      onClick={() => handleFrequency("Monthly")}
                    />
                    <OptionButton
                      icon={<ShieldCheck className="size-5" />}
                      title="Lump Sum"
                      description="One-off fixed deposits"
                      onClick={() => handleFrequency("Lump Sum")}
                    />
                  </div>
                </motion.div>
              )}

              {step === "goal" && (
                <motion.div
                  key="goal"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 text-left">
                    What's your primary goal?
                  </h3>
                  <div className="grid grid-cols-1 gap-3">
                    <OptionButton
                      icon={<Target className="size-5" />}
                      title="Personal Target"
                      description="Saving for a specific project"
                      onClick={() => handleGoal("Target")}
                    />
                    <OptionButton
                      icon={<Users className="size-5" />}
                      title="Community Saving"
                      description="Ajo/Esusu style pooling"
                      onClick={() => handleGoal("Community")}
                    />
                    <OptionButton
                      icon={<ShieldCheck className="size-5" />}
                      title="Strict Discipline"
                      description="Avoid impulsive spending"
                      onClick={() => handleGoal("Discipline")}
                    />
                  </div>
                </motion.div>
              )}

              {step === "duration" && (
                <motion.div
                  key="duration"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 text-left">
                    How long are you saving for?
                  </h3>
                  <div className="grid grid-cols-1 gap-3">
                    <OptionButton
                      icon={<Clock className="size-5" />}
                      title="Short/Medium Term"
                      description="3 to 9 months"
                      onClick={() => handleDuration("Short Term")}
                    />
                    <OptionButton
                      icon={<Target className="size-5" />}
                      title="Long Term"
                      description="12 months or more"
                      onClick={() => handleDuration("Long Term")}
                    />
                  </div>
                </motion.div>
              )}

              {step === "result" && (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-6"
                >
                  <div className="text-center space-y-2">
                    <div className="inline-flex items-center justify-center p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-full mb-2">
                      <CheckCircle2 className="size-8 text-emerald-600" />
                    </div>
                    <h3 className="text-xl font-black text-slate-950 dark:text-white">
                      We found your match!
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400 text-sm">
                      Based on your preferences, these plans suit you best:
                    </p>
                  </div>

                  <div className="space-y-3">
                    {recommendations.map((p, i) => (
                      <div
                        key={i}
                        className="p-6 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl group hover:border-emerald-500 transition-all text-left"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-black text-slate-950 dark:text-white text-lg">
                            {p.name}
                          </h4>
                          <Badge className={p.badgeColor}>{p.type}</Badge>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                          {p.description}
                        </p>
                        <Button
                          onClick={() => handleSelectPlan(p)}
                          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold"
                        >
                          Select this Plan
                          <ArrowRight className="ml-2 size-4" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-3">
                    <Button
                      onClick={() => window.open("https://wa.me/2349074049667", "_blank")}
                      className="w-full bg-white dark:bg-slate-900 border-2 border-emerald-600 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/10 rounded-xl font-bold h-12"
                    >
                      <MessageSquare className="mr-2 size-5" />
                      Message Admin on WhatsApp
                    </Button>

                    <Button
                      variant="ghost"
                      onClick={reset}
                      className="w-full text-slate-500 hover:text-emerald-600 font-bold"
                    >
                      <RefreshCcw className="mr-2 size-4" />
                      Start Over
                    </Button>
                  </div>
                </motion.div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="compare-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-8 text-left"
            >
              {/* Interactive Plan Selector */}
              <div className="space-y-3">
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Select plans to compare (max 3):
                </p>
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  {planComparisonMatrix.map((item) => {
                    const isSelected = selectedComparePlans.includes(item.dbType);
                    return (
                      <button
                        key={item.dbType}
                        onClick={() => toggleComparePlan(item.dbType)}
                        className={`px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold transition-all border ${
                          isSelected
                            ? "bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-500/10"
                            : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-350 dark:hover:border-slate-700"
                        }`}
                      >
                        {item.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Responsive Comparison Column Grid */}
              <div className={`grid grid-cols-1 ${gridColsClass} gap-4 sm:gap-6 w-full`}>
                {comparedPlans.map((item, idx, arr) => {
                  const dbMatch = dbPlans.find((dbp) => dbp.type === item.dbType);
                  return (
                    <div
                      key={idx}
                      className={`relative flex flex-col p-5 sm:p-6 rounded-3xl overflow-hidden bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 text-left shadow-sm hover:shadow-md transition-shadow group w-full md:w-auto ${
                        arr.length === 1
                          ? "md:max-w-md md:mx-auto col-span-full"
                          : arr.length === 2 && idx === 0
                            ? "lg:col-start-1"
                            : ""
                      }`}
                    >
                      {/* Dynamic Top Stripe */}
                      <div
                        className={`absolute top-0 left-0 w-full h-1.5 rounded-t-3xl ${
                          item.dbType === "marathon"
                            ? "bg-emerald-500"
                            : item.dbType === "sprint"
                              ? "bg-blue-500"
                              : item.dbType === "anchor"
                                ? "bg-indigo-600"
                                : item.dbType === "daily_drop"
                                  ? "bg-cyan-500"
                                  : item.dbType === "step_up"
                                    ? "bg-teal-600"
                                    : item.dbType === "monthly_bloom"
                                      ? "bg-pink-500"
                                      : "bg-orange-500"
                        }`}
                      />

                      {/* Plan Header */}
                      <div className="mb-3 sm:mb-4 pt-1">
                        <h4 className="font-black text-slate-950 dark:text-white text-[17px] tracking-tight mb-1">
                          {item.name}
                        </h4>
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30">
                          {item.frequency}
                        </span>
                      </div>

                      {/* Comparison Parameters */}
                      <div className="space-y-3 sm:space-y-4 flex-1 text-xs border-t border-slate-100 dark:border-slate-850/50 pt-3 sm:pt-4">
                        <div>
                          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500 block mb-1">
                            Duration
                          </span>
                          <p className="font-bold text-slate-850 dark:text-slate-200 text-sm">
                            {item.duration}
                          </p>
                        </div>

                        <div>
                          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500 block mb-1">
                            Withdrawal Policy
                          </span>
                          <p className="font-medium text-slate-600 dark:text-slate-400 leading-relaxed">
                            {item.withdrawals}
                          </p>
                        </div>

                        <div>
                          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500 block mb-1">
                            Best For
                          </span>
                          <p className="font-medium text-slate-600 dark:text-slate-400 leading-relaxed">
                            {item.benefit}
                          </p>
                        </div>
                      </div>

                      {/* Action Button */}
                      <div className="mt-3.5 sm:mt-4 pt-3 border-t border-slate-150 dark:border-slate-850/50">
                        <Button
                          onClick={() => handleSelectPlan({ name: item.name, id: dbMatch?.id })}
                          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold h-12 shadow-md active:scale-95 transition-all"
                        >
                          Join {item.name}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );

  if (inline) return Content;

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        if (onOpenChange) onOpenChange(val);
        if (!val) setTimeout(reset, 300);
      }}
    >
      <DialogContent
        className={`${
          activeView === "compare" ? "sm:max-w-[950px]" : "sm:max-w-[500px]"
        } overflow-y-auto max-h-[90vh] md:max-h-[95vh] w-[95vw] p-0 dark:bg-slate-950 border-slate-200 dark:border-slate-800 transition-all duration-300`}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Save-Plan Explorer</DialogTitle>
          <DialogDescription>
            Explore and find the best savings plan for your financial goals.
          </DialogDescription>
        </DialogHeader>
        {Content}
      </DialogContent>
    </Dialog>
  );
}

function OptionButton({
  icon,
  title,
  description,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-4 p-4 text-left bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl hover:border-emerald-500 hover:shadow-lg hover:shadow-emerald-500/5 transition-all group active:scale-[0.98]"
    >
      <div className="size-12 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-600 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">
        {icon}
      </div>
      <div>
        <p className="font-bold text-slate-900 dark:text-white">{title}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">{description}</p>
      </div>
      <ArrowRight className="ml-auto size-4 text-slate-300 group-hover:text-emerald-500 transition-colors" />
    </button>
  );
}

function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${className}`}
    >
      {children}
    </span>
  );
}

const plans = {
  daily: {
    name: "Daily Drop",
    type: "Micro-Savings",
    dbType: "daily_drop",
    description: "Perfect for inconsistent income earners. Save daily and build a habit.",
    badgeColor: "bg-cyan-100 text-cyan-700 border-cyan-200",
  },
  sprint: {
    name: "Saving Sprint",
    type: "Growth",
    dbType: "sprint",
    description: "A fast-paced weekly saving challenge for target projects.",
    badgeColor: "bg-blue-100 text-blue-700 border-blue-200",
  },
  monthly: {
    name: "Monthly Bloom",
    type: "Stable",
    dbType: "monthly_bloom",
    description: "Set a monthly target and watch your wealth blossom steadily.",
    badgeColor: "bg-slate-100 text-slate-700 border-slate-200",
  },
  marathon: {
    name: "Marathon Savings",
    type: "Wealth",
    dbType: "marathon",
    description: "Long-term commitment for massive returns. 52-week strategy.",
    badgeColor: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },
  anchor: {
    name: "Anchor Sprint",
    type: "Discipline",
    dbType: "anchor",
    description: "Strict rules. No withdrawals until target. The ultimate discipline builder.",
    badgeColor: "bg-indigo-100 text-indigo-700 border-indigo-200",
  },
  stepup: {
    name: "Step-Up Fixed",
    type: "Premium",
    dbType: "step_up",
    description: "Deposit a lump sum and get fixed guaranteed returns. Rapid growth.",
    badgeColor: "bg-teal-100 text-teal-700 border-teal-200",
  },
  ajo: {
    name: "Digital Ajo Plan",
    type: "Community",
    dbType: "ajo_circle",
    description: "Traditional pooling made digital. Take turns cashing out with friends.",
    badgeColor: "bg-orange-100 text-orange-700 border-orange-200",
  },
};
