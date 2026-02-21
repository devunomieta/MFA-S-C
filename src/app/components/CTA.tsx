import { Button } from "@/app/components/ui/button";
import { ArrowRight, Sparkles, TrendingUp, ShieldCheck, Users } from "lucide-react";
import { motion } from "motion/react";

export function CTA() {
  return (
    <section className="py-24 relative overflow-hidden bg-[#0A0F1E]">
      {/* Premium background effects */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-emerald-600/20 rounded-full mix-blend-screen filter blur-[120px] animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-teal-600/20 rounded-full mix-blend-screen filter blur-[120px] animate-pulse" />
      </div>

      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <div className="max-w-5xl mx-auto bg-gradient-to-br from-emerald-600 to-teal-700 rounded-[2.5rem] p-8 md:p-16 text-center shadow-2xl relative overflow-hidden">
          {/* Subtle patterns */}
          <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="space-y-8"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-emerald-100 text-sm font-medium mb-4">
              <Sparkles className="size-4" /> Ready to build your future?
            </div>

            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white tracking-tight leading-tight">
              Start Your Savings <br className="hidden md:block" />
              Journey <span className="text-emerald-300">Today</span>
            </h2>

            <p className="text-lg md:text-xl text-emerald-50 max-w-2xl mx-auto leading-relaxed">
              Join thousands of savers who are building wealth through community-driven finance.
              Secure, transparent, and built for your success.
            </p>

            <div className="flex flex-col sm:flex-row gap-6 justify-center pt-4">
              <Button
                size="lg"
                className="bg-white text-emerald-700 hover:bg-emerald-50 text-lg px-10 h-14 rounded-full font-bold shadow-xl transition-all active:scale-95"
                onClick={() => window.location.href = '/signup'}
              >
                Get Started Now
                <ArrowRight className="ml-2 size-5" />
              </Button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-8 pt-12 border-t border-white/10">
              <div className="flex flex-col items-center gap-2">
                <div className="p-2 rounded-lg bg-white/10">
                  <ShieldCheck className="size-6 text-emerald-300" />
                </div>
                <span className="text-sm font-medium text-emerald-100">Bank-Grade Security</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="p-2 rounded-lg bg-white/10">
                  <TrendingUp className="size-6 text-emerald-300" />
                </div>
                <span className="text-sm font-medium text-emerald-100">High Growth</span>
              </div>
              <div className="hidden md:flex flex-col items-center gap-2">
                <div className="p-2 rounded-lg bg-white/10">
                  <Users className="size-6 text-emerald-300" />
                </div>
                <span className="text-sm font-medium text-emerald-100">Community Driven</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}