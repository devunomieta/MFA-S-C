import { useEffect, useState } from "react";

import { motion } from "framer-motion";
import {
  Target,
  Zap,
  Users,
  Anchor,
  Droplets,
  TrendingUp,
  Flower2,
  Check,
  Sparkles,
  Star,
  Loader2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { useAuth } from "@/app/context/AuthContext";
import { supabase } from "@/lib/supabase";

// Premium UI Metadata mapping for DB plans
const PLAN_METADATA: Record<string, any> = {
  marathon: {
    icon: <Target className="size-6" />,
    color: "bg-slate-900",
    features: [
      "Starts 3rd week of Jan",
      "Top up any amount",
      "Extend to 48 weeks easily",
      "Strictly locked",
    ],
    popular: true,
  },
  sprint: {
    icon: <Zap className="size-6" />,
    color: "bg-emerald-600",
    features: [
      "Start anytime",
      "Automated wallet deductions",
      "Flexible top-ups",
      "Strictly locked",
    ],
    popular: false,
  },
  anchor: {
    icon: <Anchor className="size-6" />,
    color: "bg-slate-900",
    features: [
      "Maximum discipline",
      "Start anytime",
      "Auto-recovery protection",
      "Strictly locked",
    ],
    popular: false,
  },
  daily_drop: {
    icon: <Droplets className="size-6" />,
    color: "bg-teal-900",
    features: ["Zero late fees", "Bulk advance payments", "Easy rejoin feature", "Strictly locked"],
    popular: false,
  },
  step_up: {
    icon: <TrendingUp className="size-6" />,
    color: "bg-teal-900",
    features: [
      "Rapid goal achievement",
      "Strict weekly targets",
      "Short-term milestones",
      "Strictly locked",
    ],
    popular: false,
  },
  monthly_bloom: {
    icon: <Flower2 className="size-6" />,
    color: "bg-slate-900",
    features: [
      "Ideal for budgeting",
      "Automated month-end saves",
      "No maximum limit",
      "Strictly locked",
    ],
    popular: false,
  },
  ajo_circle: {
    icon: <Users className="size-6" />,
    color: "bg-emerald-600",
    features: [
      "Massive lump-sum payouts",
      "Multiple picking turns",
      "Exclusive entry",
      "Assigned turn withdrawal",
    ],
    popular: true,
  },
};

const colorVariants: Record<string, string> = {
  "bg-emerald-600": "border-emerald-600 text-emerald-600 bg-emerald-50",
  "bg-teal-900": "border-teal-900 text-teal-900 bg-teal-50",
  "bg-slate-900": "border-slate-900 text-slate-900 bg-slate-50",
};

const buttonVariants: Record<string, string> = {
  "bg-emerald-600": "bg-emerald-600 hover:bg-emerald-700",
  "bg-teal-900": "bg-teal-900 hover:bg-teal-800",
  "bg-slate-900": "bg-slate-900 hover:bg-slate-800",
};

export function Pricing() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [dbPlans, setDbPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPlans() {
      try {
        const { data, error } = await supabase
          .from("plans")
          .select("*")
          .eq("is_active", true)
          .order("min_amount", { ascending: true });

        if (error) throw error;
        setDbPlans(data || []);
      } catch (err) {
        console.error("Failed to fetch plans:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchPlans();
  }, []);

  return (
    <section id="plans" className="py-20 bg-slate-50 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-100/30 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-100/20 rounded-full blur-[120px] translate-y-1/2 -translate-x-1/2" />

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          className="text-center mb-20 space-y-4"
        >
          <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-700 px-4 py-2 rounded-full mb-4">
            <Star className="size-4 fill-emerald-600" />
            <span className="text-xs font-black uppercase tracking-widest">Growth Plans</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-slate-950">
            Personalized <span className="text-emerald-600">Savings Plans.</span>
          </h2>
          <p className="text-lg text-slate-600 font-medium max-w-2xl mx-auto">
            Pick the plan that best suits your financial goals and start saving with confidence.
          </p>
        </motion.div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <Loader2 className="size-10 text-emerald-600 animate-spin" />
            <p className="text-slate-500 font-bold animate-pulse">Fetching latest plans...</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {dbPlans.map((plan, index) => {
              const meta = PLAN_METADATA[plan.type] || PLAN_METADATA["marathon"];
              const durationText = plan.duration_weeks
                ? `${plan.duration_weeks} Weeks`
                : `${plan.duration_months} Months`;

              return (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.05 }}
                  whileHover={{ y: -5 }}
                  className="relative group"
                >
                  {meta.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                      <span className="bg-emerald-600 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 shadow-lg">
                        <Sparkles className="size-3" /> Popular
                      </span>
                    </div>
                  )}

                  <Card
                    className={`h-full border-2 transition-all duration-500 rounded-[2.5rem] overflow-hidden group-hover:shadow-[0_20px_50px_rgba(0,0,0,0.1)] ${meta.popular ? "border-emerald-500 bg-white ring-4 ring-emerald-500/10" : "border-white bg-white/70 backdrop-blur-sm"}`}
                  >
                    <CardHeader className="space-y-6 p-8 pb-0">
                      <div
                        className={`p-4 rounded-2xl w-fit shadow-lg ${colorVariants[meta.color]}`}
                      >
                        {meta.icon}
                      </div>
                      <div>
                        <CardTitle className="text-2xl font-black text-slate-950 tracking-tight">
                          {plan.name}
                        </CardTitle>
                        <div className="mt-4 flex flex-col">
                          <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">
                            Minimum Savings Amount
                          </span>
                          <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-black text-slate-950">
                              ₦{plan.min_amount.toLocaleString()}
                            </span>
                            <span className="text-xs font-bold text-slate-400">
                              / {plan.contribution_type}
                            </span>
                          </div>
                          <div className="mt-1 inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-lg w-fit">
                            <div className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[10px] font-bold uppercase tracking-tight">
                              No Maximum Limit
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="pt-4 border-b border-slate-100 pb-6 space-y-4">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">
                            Plan Duration
                          </span>
                          <span className="text-slate-900 font-black">{durationText}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">
                            Method
                          </span>
                          <span className="text-slate-900 font-black capitalize">
                            {plan.contribution_type} Deductions
                          </span>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-8 space-y-8">
                      <ul className="space-y-4">
                        {(meta.features || []).map((feature: string, fIdx: number) => (
                          <li
                            key={fIdx}
                            className="flex items-start gap-3 text-sm text-slate-600 font-medium"
                          >
                            <div className="p-0.5 rounded-full bg-emerald-100 shrink-0 mt-0.5">
                              <Check className="size-3 text-emerald-600" />
                            </div>
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>

                      <Button
                        className={`w-full h-14 rounded-2xl text-white font-bold transition-all active:scale-95 shadow-lg ${buttonVariants[meta.color]}`}
                        onClick={() => {
                          if (user) {
                            navigate(`/dashboard/plans?join=${plan.id}`);
                          } else {
                            navigate(`/signup?join=${plan.id}`);
                          }
                        }}
                      >
                        Join Plan
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="text-center mt-12 text-gray-600"
        >
          <p>All plans include bank-grade security and 24/7 customer support</p>
        </motion.div>
      </div>
    </section>
  );
}
