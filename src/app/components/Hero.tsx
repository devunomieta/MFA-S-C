import { Button } from "@/app/components/ui/button";
import { ArrowRight, Sparkles, ShieldCheck, Users, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import { ImageWithFallback } from "@/app/components/figma/ImageWithFallback";

export function Hero() {
  return (
    <section className="relative min-h-[90vh] flex items-center pt-20 pb-12 overflow-hidden bg-white">
      {/* Dynamic Background Elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-emerald-50 rounded-full blur-[120px] opacity-60" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-blue-50 rounded-full blur-[120px] opacity-40" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Content Block */}
          <div className="flex flex-col space-y-10 group">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-100 text-emerald-700 px-4 py-2 rounded-full w-fit shadow-sm"
            >
              <Sparkles className="size-4 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider">The Future of Traditional Saving</span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-6"
            >
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold leading-[1.05] tracking-tight text-slate-950">
                The Modern Ajo <br />
                for <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-600">Ambitious Savers.</span>
              </h1>
              <p className="text-xl text-slate-600 font-medium max-w-xl leading-relaxed">
                Experience the power of traditional group saving, reinvented with bank-grade security and smart-automation. Join existing circles, save with discipline, and reach your goals.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex flex-wrap gap-5"
            >
              <Button
                size="lg"
                className="bg-emerald-600 hover:bg-emerald-700 text-white h-16 px-10 rounded-2xl text-lg font-bold shadow-xl shadow-emerald-600/20 active:scale-95 transition-all"
                onClick={() => document.getElementById('plans')?.scrollIntoView({ behavior: 'smooth' })}
              >
                Join a Circle
                <ArrowRight className="ml-2 size-5" />
              </Button>
              <Button size="lg" variant="outline" className="h-16 px-10 rounded-2xl text-lg font-bold border-2 hover:bg-emerald-50 hover:text-emerald-700 active:scale-95 transition-all" onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}>
                How it Works
              </Button>
            </motion.div>

            {/* Value Props */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="grid grid-cols-3 gap-8 pt-10 border-t border-slate-100"
            >
              <div className="space-y-1 text-center sm:text-left">
                <div className="flex items-center gap-2 text-emerald-600 font-bold justify-center sm:justify-start">
                  <ShieldCheck className="size-5" />
                  <span>CAC Registered</span>
                </div>
                <p className="text-xs text-slate-500 font-medium whitespace-nowrap">BN - 8950808</p>
              </div>
              <div className="space-y-1 text-center sm:text-left">
                <div className="flex items-center gap-2 text-emerald-600 font-bold justify-center sm:justify-start">
                  <TrendingUp className="size-5" />
                  <span>Personal Choice</span>
                </div>
                <p className="text-xs text-slate-500 font-medium">Self or Assisted</p>
              </div>
              <div className="space-y-1 text-center sm:text-left">
                <div className="flex items-center gap-2 text-emerald-600 font-bold justify-center sm:justify-start">
                  <Users className="size-5" />
                  <span>50k+</span>
                </div>
                <p className="text-xs text-slate-500 font-medium">Active Community</p>
              </div>
            </motion.div>
          </div>

          {/* Visual Block */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="relative hidden lg:block"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-100 to-transparent rounded-[3rem] blur-2xl transform rotate-6 scale-95" />
            <div className="relative bg-slate-950 rounded-[3rem] p-4 shadow-2xl border-8 border-slate-900 aspect-[4/5] overflow-hidden group">
              <div className="absolute inset-0 bg-emerald-600/10 group-hover:bg-transparent transition-colors duration-700" />
              <ImageWithFallback
                src="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&q=80&w=1080"
                alt="Digital Community Finance"
                className="w-full h-full object-cover scale-110 group-hover:scale-100 transition-transform duration-1000"
              />
              {/* Floating Card Overlay */}
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-12 left-12 bg-white/95 backdrop-blur px-6 py-4 rounded-3xl shadow-2xl space-y-2 border border-white"
              >
                <div className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Collective Pot</div>
                <div className="text-2xl font-black text-emerald-600 tracking-tighter">₦12,500,000.00</div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section >
  );
}