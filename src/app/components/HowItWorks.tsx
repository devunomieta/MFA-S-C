import { motion } from "framer-motion";
import { Target, Users, Zap, TrendingUp } from "lucide-react";

const steps = [
  {
    title: "Set your savings goal",
    description:
      "Decide how much you want to save and how often. Whether it's for school fees, a new phone, or starting a business, we help you define a clear target.",
    icon: <Target className="size-8 text-emerald-600" />,
    color: "emerald",
  },
  {
    title: "Join the right plan",
    description:
      "Choose from existing daily, weekly, or monthly savings groups. Find the perfect fit for your budget and goals.",
    icon: <Users className="size-8 text-blue-600" />,
    color: "blue",
  },
  {
    title: "Automate your savings",
    description:
      "Whether it's daily, weekly, or monthly, our system automatically collects your contributions—making saving effortless and consistent.",
    icon: <Zap className="size-8 text-orange-600" />,
    color: "orange",
  },
  {
    title: "Receive your total savings",
    description:
      "Once your savings cycle is complete, the full amount is credited directly to your bank account. No delays, no complications.",
    icon: <TrendingUp className="size-8 text-emerald-600" />,
    color: "emerald",
  },
];

export function HowItWorks() {
  return (
    <section className="py-20 bg-slate-50 relative overflow-hidden" id="how-it-works">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-emerald-500/5 rounded-full blur-[120px]" />

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          className="text-center max-w-3xl mx-auto mb-20"
        >
          <h2 className="text-3xl md:text-4xl font-black text-slate-950 mb-6">How It Works</h2>
          <p className="text-slate-600 text-lg font-medium">
            From setting your goals to receiving your payout, we've designed a simple, transparent
            process that keeps you in control.
          </p>
        </motion.div>

        <div className="max-w-4xl mx-auto relative">
          {/* Vertical Line */}
          <div className="absolute left-[27px] md:left-1/2 md:-translate-x-1/2 top-4 bottom-4 w-1 bg-gradient-to-b from-emerald-500/0 via-emerald-500/20 to-emerald-500/0" />

          <div className="space-y-16">
            {steps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ margin: "-100px" }}
                className={`relative flex flex-col md:flex-row items-center gap-12 ${index % 2 !== 0 ? "md:flex-row-reverse" : ""}`}
              >
                {/* Dot */}
                <div className="absolute left-0 md:left-1/2 md:-translate-x-1/2 flex items-center justify-center">
                  <div className="w-14 h-14 rounded-full bg-white border-4 border-emerald-500 flex items-center justify-center z-20 shadow-xl shadow-emerald-500/10">
                    {step.icon}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 ml-20 md:ml-0">
                  <div
                    className={`p-8 rounded-[2rem] bg-white border border-slate-100 shadow-sm transition-all hover:shadow-md group ${index % 2 === 0 ? "md:text-right" : "md:text-left"}`}
                  >
                    <div
                      className={`text-emerald-600 font-black text-6xl opacity-5 absolute ${index % 2 === 0 ? "left-8" : "right-8"} top-4`}
                    >
                      0{index + 1}
                    </div>
                    <h3 className="text-xl font-bold text-slate-950 mb-3 group-hover:text-emerald-600 transition-colors">
                      {step.title}
                    </h3>
                    <p className="text-slate-600 font-medium leading-relaxed text-sm">
                      {step.description}
                    </p>
                  </div>
                </div>

                {/* Empty spacer for desktop layout */}
                <div className="hidden md:block flex-1" />
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
