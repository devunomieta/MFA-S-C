import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/app/context/AuthContext";
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
  Star
} from "lucide-react";

const plans = [
  {
    id: "marathon",
    name: "Marathon",
    icon: <Target className="size-6" />,
    color: "bg-slate-900",
    price: "Long-Term",
    minAmount: "₦50k/month",
    duration: "6 - 24 Months",
    activeSavers: "12,402",
    description: "Targeted savings for major milestones.",
    features: ["Custom target", "Choose duration", "Flexible amounts", "Goal tracking", "Assisted management"],
    popular: true
  },
  {
    id: "sprint",
    name: "Sprint",
    icon: <Zap className="size-6" />,
    color: "bg-emerald-600",
    price: "Short-Term",
    minAmount: "₦5k/week",
    duration: "1 - 3 Months",
    activeSavers: "8,921",
    description: "Quick targeted savings for urgent needs.",
    features: ["Weekly circles", "Specific goals", "Automated saves", "Fast payouts"],
    popular: false
  },
  {
    id: "ajo_circle",
    name: "Ajo Circle",
    icon: <Users className="size-6" />,
    color: "bg-emerald-600",
    price: "Social",
    minAmount: "₦10k/month",
    duration: "Flexible",
    activeSavers: "25,188",
    description: "Traditional rotating community savings.",
    features: ["Social saving", "Rotating turns", "Accountability", "Secure payout", "Manual transfer supported"],
    popular: true
  },
  {
    id: "anchor",
    name: "Anchor",
    icon: <Anchor className="size-6" />,
    color: "bg-slate-900",
    price: "Stable",
    minAmount: "₦2k/day",
    duration: "3 - 12 Months",
    activeSavers: "5,301",
    description: "Daily or weekly fixed contributions.",
    features: ["Steady saving", "Automated saves", "Discipline builder", "Fixed amounts"],
    popular: false
  },
  {
    id: "daily_drop",
    name: "Daily Drop",
    icon: <Droplets className="size-6" />,
    color: "bg-teal-900",
    price: "Micro",
    minAmount: "₦1k/day",
    duration: "Ongoing",
    activeSavers: "15,224",
    description: "Small daily contributions that add up.",
    features: ["Daily micro-saves", "Tiny increments", "Loose change tool", "Auto-deduct"],
    popular: false
  },
  {
    id: "step_up",
    name: "Step Up",
    icon: <TrendingUp className="size-6" />,
    color: "bg-teal-900",
    price: "Habit",
    minAmount: "₦1k/week (Starts)",
    duration: "6 Months",
    activeSavers: "3,110",
    description: "Increasing amounts to build discipline.",
    features: ["Escalating saves", "Habit formation", "Completion bonus", "Weekly increments"],
    popular: false
  },
  {
    id: "monthly_bloom",
    name: "Monthly Bloom",
    icon: <Flower2 className="size-6" />,
    color: "bg-slate-900",
    price: "Monthly",
    minAmount: "₦20k/month",
    duration: "12 Months",
    activeSavers: "6,442",
    description: "Fixed monthly targets for seasonal needs.",
    features: ["Month-end goals", "Predictable saves", "Major payouts", "Low frequency", "Assisted management"],
    popular: false
  }
];

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

  return (
    <section id="plans" className="py-32 bg-slate-50 relative overflow-hidden">
      {/* Decorative blobs */}
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
            <span className="text-xs font-black uppercase tracking-widest">Flexible Options</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-slate-950">
            Tailored <span className="text-emerald-600">Savings Plans.</span>
          </h2>
          <p className="text-lg text-slate-600 font-medium max-w-2xl mx-auto">
            Choose the strategy that fits your lifestyle. From daily drops to monthly blooms, we've got you covered.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.05 }}
              whileHover={{ y: -5 }}
              className="relative group"
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                  <span className="bg-emerald-600 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 shadow-lg">
                    <Sparkles className="size-3" /> Popular
                  </span>
                </div>
              )}

              <Card className={`h-full border-2 transition-all duration-500 rounded-[2.5rem] overflow-hidden group-hover:shadow-[0_20px_50px_rgba(0,0,0,0.1)] ${plan.popular ? 'border-emerald-500 bg-white ring-4 ring-emerald-500/10' : 'border-white bg-white/70 backdrop-blur-sm'}`}>
                <CardHeader className="space-y-6 p-8 pb-0">
                  <div className={`p-4 rounded-2xl w-fit shadow-lg ${colorVariants[plan.color]}`}>
                    {plan.icon}
                  </div>
                  <div>
                    <CardTitle className="text-2xl font-black text-slate-950 tracking-tight">{plan.name}</CardTitle>
                    <p className="text-sm text-slate-500 font-medium mt-2 leading-relaxed">{plan.description}</p>
                  </div>
                  <div className="pt-2 border-b border-slate-100 pb-6 space-y-4">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-400 font-bold uppercase tracking-widest">Amount</span>
                      <span className="text-slate-900 font-black">{plan.minAmount}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-400 font-bold uppercase tracking-widest">Duration</span>
                      <span className="text-slate-900 font-black">{plan.duration}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-400 font-bold uppercase tracking-widest">Savers</span>
                      <span className="text-emerald-600 font-black">{plan.activeSavers} Active</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-8 space-y-8">
                  <ul className="space-y-4">
                    {plan.features.map((feature, fIdx) => (
                      <li key={fIdx} className="flex items-start gap-3 text-sm text-slate-600 font-medium">
                        <div className="p-0.5 rounded-full bg-emerald-100 shrink-0 mt-0.5">
                          <Check className="size-3 text-emerald-600" />
                        </div>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    className={`w-full h-14 rounded-2xl text-white font-bold transition-all active:scale-95 shadow-lg ${buttonVariants[plan.color]}`}
                    onClick={() => {
                      if (user) {
                        navigate(`/dashboard/plans?join=${plan.id}`);
                      } else {
                        navigate(`/signup?join=${plan.id}`);
                      }
                    }}
                  >
                    Join Circle
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

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
