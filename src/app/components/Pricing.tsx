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
    name: "Marathon Target Savings",
    icon: <Target className="size-6" />,
    color: "bg-slate-900",
    price: "Long-Term",
    minAmount: "₦3,000/week",
    duration: "30 or 48 Weeks",
    activeSavers: "184",
    description: "A disciplined, long-term savings plan starting every January to help you hit those massive end-of-year financial goals.",
    features: ["Starts 3rd week of Jan", "Top up any amount", "Extend to 48 weeks easily", "Strictly locked"],
    popular: true
  },
  {
    id: "sprint",
    name: "30-Weeks Saving Sprint",
    icon: <Zap className="size-6" />,
    color: "bg-emerald-600",
    price: "Rolling",
    minAmount: "₦3,000/week",
    duration: "30 Weeks",
    activeSavers: "156",
    description: "A fast-paced, rolling savings plan designed to help you crush your short-to-medium-term financial targets.",
    features: ["Start anytime", "Automated wallet deductions", "Flexible top-ups", "Strictly locked"],
    popular: false
  },
  {
    id: "anchor",
    name: "48-Weeks Saving Sprint",
    icon: <Anchor className="size-6" />,
    color: "bg-slate-900",
    price: "Rolling",
    minAmount: "₦3,000/week",
    duration: "48 Weeks",
    activeSavers: "128",
    description: "Build a rock-solid financial foundation with a robust, year-round savings commitment.",
    features: ["Maximum discipline", "Start anytime", "Auto-recovery protection", "Strictly locked"],
    popular: false
  },
  {
    id: "daily_drop",
    name: "Daily Savings",
    icon: <Droplets className="size-6" />,
    color: "bg-teal-900",
    price: "Daily",
    minAmount: "₦500/day",
    duration: "31 - 93 Days",
    activeSavers: "192",
    description: "Save small, fixed amounts every day and watch it grow effortlessly.",
    features: ["Zero late fees", "Bulk advance payments", "Easy rejoin feature", "Strictly locked"],
    popular: false
  },
  {
    id: "step_up",
    name: "Rapid Fixed Savings",
    icon: <TrendingUp className="size-6" />,
    color: "bg-teal-900",
    price: "Fixed",
    minAmount: "₦5k - ₦50k/week",
    duration: "10 - 20 Weeks",
    activeSavers: "167",
    description: "Step up your financial game by committing to a high-value fixed weekly amount for rapid growth.",
    features: ["Rapid goal achievement", "Strict weekly targets", "Short-term milestones", "Strictly locked"],
    popular: false
  },
  {
    id: "monthly_bloom",
    name: "Monthly Saving Plan",
    icon: <Flower2 className="size-6" />,
    color: "bg-slate-900",
    price: "Monthly",
    minAmount: "₦20,000/month",
    duration: "4 - 12 Months",
    activeSavers: "145",
    description: "Perfect for business owners or salary earners looking to lock away a chunk of income monthly for major projects.",
    features: ["Ideal for budgeting", "Automated month-end saves", "No maximum limit", "Strictly locked"],
    popular: false
  },
  {
    id: "ajo_circle",
    name: "Digital Ajo Circle",
    icon: <Users className="size-6" />,
    color: "bg-emerald-600",
    price: "Community",
    minAmount: "₦10k - ₦100k/week",
    duration: "Min 10 Weeks",
    activeSavers: "189",
    description: "A secure, digital version of the traditional Ajo/Esusu group savings. Contribute weekly and take turns cashing out!",
    features: ["Massive lump-sum payouts", "Multiple picking turns", "Exclusive entry", "Assigned turn withdrawal"],
    popular: true
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
