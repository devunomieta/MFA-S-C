import { Target, Users, Zap, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";

const steps = [
  {
    title: "Set Your Financial Goal",
    description: "Whether it's for a new business, school fees, or a home, start by defining what you're saving for.",
    icon: <Target className="size-8 text-emerald-600" />,
    color: "emerald"
  },
  {
    title: "Join a Circle",
    description: "Search for a savings group that matches your budget and schedule. P2P community at its best.",
    icon: <Users className="size-8 text-blue-600" />,
    color: "blue"
  },
  {
    title: "Save on Your Terms",
    description: "Daily, weekly, or monthly—our automated system ensures you stay consistent without the stress.",
    icon: <Zap className="size-8 text-orange-600" />,
    color: "orange"
  },
  {
    title: "Collect Your Payout",
    description: "When it's your turn, receive your total contributions directly to your bank account.",
    icon: <TrendingUp className="size-8 text-emerald-600" />,
    color: "emerald"
  }
];

export function HowItWorks() {
  return (
    <section className="py-32 bg-slate-50 relative overflow-hidden" id="how-it-works">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-emerald-500/5 rounded-full blur-[120px]" />

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          className="text-center max-w-3xl mx-auto mb-24"
        >
          <h2 className="text-4xl md:text-5xl font-black text-slate-950 mb-6">How AjoSave <span className="text-emerald-600">Works for You.</span></h2>
          <p className="text-slate-600 text-lg font-medium">Four simple steps to financial discipline. No paperwork, no hidden fees, just pure community savings.</p>
        </motion.div>

        <div className="max-w-4xl mx-auto relative">
          {/* Vertical Line */}
          <div className="absolute left-[27px] md:left-1/2 md:-translate-x-1/2 top-4 bottom-4 w-1 bg-gradient-to-b from-emerald-500/0 via-emerald-500/20 to-emerald-500/0" />

          <div className="space-y-24">
            {steps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ margin: "-100px" }}
                className={`relative flex flex-col md:flex-row items-center gap-12 ${index % 2 !== 0 ? 'md:flex-row-reverse' : ''}`}
              >
                {/* Dot */}
                <div className="absolute left-0 md:left-1/2 md:-translate-x-1/2 flex items-center justify-center">
                  <div className="w-14 h-14 rounded-full bg-white border-4 border-emerald-500 flex items-center justify-center z-20 shadow-xl shadow-emerald-500/10">
                    {step.icon}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 ml-20 md:ml-0">
                  <div className={`p-8 rounded-[2rem] bg-white border border-slate-100 shadow-sm transition-all hover:shadow-md group ${index % 2 === 0 ? 'md:text-right' : 'md:text-left'}`}>
                    <div className={`text-emerald-600 font-black text-6xl opacity-5 absolute ${index % 2 === 0 ? 'left-8' : 'right-8'} top-4`}>
                      0{index + 1}
                    </div>
                    <h3 className="text-2xl font-bold text-slate-950 mb-3 group-hover:text-emerald-600 transition-colors">{step.title}</h3>
                    <p className="text-slate-600 font-medium leading-relaxed">{step.description}</p>
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