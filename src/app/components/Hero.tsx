import { motion } from "framer-motion";
import { ArrowRight, Sparkles, ShieldCheck, Users, TrendingUp, CheckCircle2 } from "lucide-react";

import { Button } from "@/app/components/ui/button";

export interface HeroProps {
  onExplorePlans?: (tab?: "quiz" | "compare") => void;
}

export function Hero({ onExplorePlans }: HeroProps) {
  return (
    <section className="relative min-h-[90vh] flex items-center pt-28 pb-16 overflow-hidden bg-white dark:bg-slate-950">
      {/* Subtle Premium Background */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            x: [0, 30, 0],
            y: [0, 20, 0],
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[-10%] left-[-5%] w-[500px] md:w-[600px] h-[500px] md:h-[600px] bg-emerald-50/50 dark:bg-emerald-900/10 rounded-full blur-[100px] md:blur-[120px]"
        />
        <motion.div
          animate={{
            scale: [1.1, 1, 1.1],
            x: [0, -30, 0],
            y: [0, -20, 0],
          }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-[-10%] right-[-5%] w-[500px] md:w-[600px] h-[500px] md:h-[600px] bg-blue-50/50 dark:bg-blue-900/10 rounded-full blur-[100px] md:blur-[120px]"
        />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center space-y-10">
          {/* Trust Badge */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center justify-center gap-1.5 sm:gap-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 px-3 sm:px-4 py-1.5 rounded-full shadow-sm max-w-[90vw] mx-auto"
          >
            <CheckCircle2 className="size-3.5 sm:size-4 text-emerald-600 shrink-0" />
            <span className="text-[10px] sm:text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide truncate">
              Join 2,000+ Disciplined Savers today
            </span>
          </motion.div>

          {/* Main Headline */}
          <div className="space-y-6">
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.8 }}
              className="text-4xl sm:text-5xl md:text-6xl font-extrabold leading-[1.1] tracking-tight text-slate-950 dark:text-white"
            >
              The Smartest Way <br />
              <span className="text-emerald-600">to Save!</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.8 }}
              className="text-base md:text-lg text-slate-600 dark:text-slate-400 font-medium max-w-2xl mx-auto leading-relaxed"
            >
              A secure platform to save and reach your goals. Put money away daily, weekly or
              monthly, and get your payout when it's your turn. Safe, automated, and built for you.
            </motion.p>
          </div>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Button
              size="lg"
              className="bg-emerald-600 hover:bg-emerald-700 text-white h-14 md:h-16 px-8 md:px-10 rounded-xl md:rounded-2xl text-base md:text-lg font-bold shadow-xl shadow-emerald-600/20 active:scale-95 transition-all w-full sm:w-auto"
              onClick={() =>
                document.getElementById("plans")?.scrollIntoView({ behavior: "smooth" })
              }
            >
              Start Saving Now
              <ArrowRight className="ml-2 size-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-14 md:h-16 px-8 md:px-10 rounded-xl md:rounded-2xl text-base md:text-lg font-bold border-2 bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-900 hover:text-slate-950 dark:hover:text-white active:scale-95 text-slate-600 dark:text-slate-400 transition-all w-full sm:w-auto"
              onClick={() =>
                document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })
              }
            >
              How it Works
            </Button>
          </motion.div>

          {onExplorePlans && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.8 }}
              className="text-xs md:text-sm text-slate-500 font-medium"
            >
              Not sure which strategy is for you? Use our{" "}
              <button
                onClick={() => onExplorePlans("quiz")}
                className="text-emerald-600 hover:text-emerald-700 hover:underline font-bold bg-transparent border-none p-0 cursor-pointer"
              >
                plan recommender
              </button>{" "}
              or{" "}
              <button
                onClick={() => onExplorePlans("compare")}
                className="text-emerald-600 hover:text-emerald-700 hover:underline font-bold bg-transparent border-none p-0 cursor-pointer"
              >
                compare plans
              </button>
            </motion.p>
          )}

          {/* Social Proof & Features */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 1 }}
            className="pt-12 md:pt-16 grid grid-cols-1 sm:grid-cols-3 gap-6 md:gap-8 border-t border-slate-100 dark:border-slate-800"
          >
            <div className="flex flex-col items-center space-y-2">
              <div className="p-2.5 md:p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl">
                <ShieldCheck className="size-5 md:size-6 text-emerald-600" />
              </div>
              <div className="text-center">
                <div className="text-sm md:text-base font-bold text-slate-950 dark:text-white">
                  Secure & Registered
                </div>
                <div className="text-[10px] md:text-xs text-slate-500 font-medium uppercase tracking-tight">
                  CAC: BN - 8950808
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center space-y-2">
              <div className="p-2.5 md:p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl">
                <TrendingUp className="size-5 md:size-6 text-emerald-600" />
              </div>
              <div className="text-center">
                <div className="text-sm md:text-base font-bold text-slate-950 dark:text-white">
                  5+ Active Plans
                </div>
                <div className="text-[10px] md:text-xs text-slate-500 font-medium">
                  Daily, Weekly or Monthly Plans
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center space-y-2">
              <div className="p-2.5 md:p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl">
                <Users className="size-5 md:size-6 text-emerald-600" />
              </div>
              <div className="text-center">
                <div className="text-sm md:text-base font-bold text-slate-950 dark:text-white">
                  Trusted Community
                </div>
                <div className="text-[10px] md:text-xs text-slate-500 font-medium">
                  Private and discipline-focused
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Floating Interactive Elements (Decorative) */}
      <div className="absolute inset-0 pointer-events-none hidden xl:block z-20">
        <motion.div
          animate={{ y: [0, -15, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[25%] left-[10%] p-5 bg-white dark:bg-slate-900 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-slate-100 dark:border-slate-800"
        >
          <div className="text-emerald-600 font-black text-2xl tracking-tighter">₦12.5M+</div>
          <div className="text-[10px] uppercase font-bold text-slate-400 mt-1">
            Total Saved This Month
          </div>
        </motion.div>

        <motion.div
          animate={{ y: [0, 15, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute bottom-[25%] right-[10%] p-5 bg-white dark:bg-slate-900 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-slate-100 dark:border-slate-800"
        >
          <Sparkles className="size-5 text-emerald-600 mb-2" />
          <div className="text-sm font-bold text-slate-950 dark:text-white">
            Smart Automated Savings
          </div>
          <div className="text-[10px] font-medium text-slate-400">Assistive Saving</div>
        </motion.div>
      </div>
    </section>
  );
}
