import { motion } from "motion/react";
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
  Sparkles
} from "lucide-react";

const plans = [
  {
    id: "marathon",
    name: "Marathon",
    icon: <Target className="size-6" />,
    color: "emerald",
    price: "Flexible",
    description: "Long-term targeted savings for big dreams",
    features: ["Custom target", "Choose duration", "Flexible amounts", "Goal tracking"],
    popular: true
  },
  {
    id: "sprint",
    name: "Sprint",
    icon: <Zap className="size-6" />,
    color: "blue",
    price: "Fixed",
    description: "Short-term targeted savings for quick wins",
    features: ["Quick cycles", "Specific goals", "Weekly payouts", "Low barrier"],
    popular: false
  },
  {
    id: "ajo_circle",
    name: "Ajo Circle",
    icon: <Users className="size-6" />,
    color: "rose",
    price: "Group",
    description: "Traditional rotating P2P savings and credit",
    features: ["Social saving", "Rotating turns", "Accountability", "Admin managed"],
    popular: false
  },
  {
    id: "anchor",
    name: "Anchor",
    icon: <Anchor className="size-6" />,
    color: "indigo",
    price: "Stability",
    description: "Consistent daily or weekly fixed savings",
    features: ["Steady growth", "Automated saves", "Discipline builder", "Fixed amounts"],
    popular: false
  },
  {
    id: "daily_drop",
    name: "Daily Drop",
    icon: <Droplets className="size-6" />,
    color: "cyan",
    price: "Micro",
    description: "Small daily contributions that add up",
    features: ["Daily micro-saves", "Tiny increments", "Loose change tool", "Auto-deduct"],
    popular: false
  },
  {
    id: "step_up",
    name: "Step Up",
    icon: <TrendingUp className="size-6" />,
    color: "purple",
    price: "Growth",
    description: "Increasing weekly amounts to build habit",
    features: ["Escalating saves", "Habit formation", "Interest bonus", "Weekly increments"],
    popular: false
  },
  {
    id: "monthly_bloom",
    name: "Monthly Bloom",
    icon: <Flower2 className="size-6" />,
    color: "pink",
    price: "Monthly",
    description: "Fixed monthly targets for seasonal needs",
    features: ["Month-end goals", "Predictable saves", "Major payouts", "Low frequency"],
    popular: false
  }
];

const colorVariants: Record<string, string> = {
  emerald: "border-emerald-500 text-emerald-600 bg-emerald-50",
  blue: "border-blue-500 text-blue-600 bg-blue-50",
  rose: "border-rose-500 text-rose-600 bg-rose-50",
  indigo: "border-indigo-500 text-indigo-600 bg-indigo-50",
  cyan: "border-cyan-500 text-cyan-600 bg-cyan-50",
  purple: "border-purple-500 text-purple-600 bg-purple-50",
  pink: "border-pink-500 text-pink-600 bg-pink-50",
};

const buttonVariants: Record<string, string> = {
  emerald: "bg-emerald-600 hover:bg-emerald-700",
  blue: "bg-blue-600 hover:bg-blue-700",
  rose: "bg-rose-600 hover:bg-rose-700",
  indigo: "bg-indigo-600 hover:bg-indigo-700",
  cyan: "bg-cyan-600 hover:bg-cyan-700",
  purple: "bg-purple-600 hover:bg-purple-700",
  pink: "bg-pink-600 hover:bg-pink-700",
};

export function Pricing() {
  const navigate = useNavigate();
  const { user } = useAuth();
  return (
    <section id="plans" className="py-20 md:py-32 bg-slate-50">
      <div className="container mx-auto px-4 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16 space-y-4"
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold">
            Tailored <span className="text-emerald-600">Savings Plans</span>
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Find the perfect strategy to achieve your financial goals with our diverse range of plans.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-7xl mx-auto">
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

              <Card className={`h-full border-2 transition-all group-hover:shadow-xl ${plan.popular ? 'border-emerald-500 ring-2 ring-emerald-500/10' : 'border-gray-100'}`}>
                <CardHeader className="space-y-4">
                  <div className={`p-3 rounded-xl w-fit ${colorVariants[plan.color]}`}>
                    {plan.icon}
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold">{plan.name}</CardTitle>
                    <p className="text-sm text-gray-500 mt-1">{plan.description}</p>
                  </div>
                  <div className="pt-2">
                    <span className="text-2xl font-bold text-gray-900">{plan.price}</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <ul className="space-y-3">
                    {plan.features.map((feature, fIdx) => (
                      <li key={fIdx} className="flex items-center gap-2 text-sm text-gray-600">
                        <Check className="size-4 text-emerald-500 shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    className={`w-full text-white font-semibold transition-transform active:scale-95 ${buttonVariants[plan.color]}`}
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
