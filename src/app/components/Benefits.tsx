import { motion } from "framer-motion";
import { Zap, Shield, TrendingUp, Users, ArrowUpRight } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { ImageWithFallback } from "@/app/components/figma/ImageWithFallback";


export function Benefits() {
  return (
    <section className="py-32 bg-white overflow-hidden" id="features">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            className="max-w-2xl"
          >
            <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-6">
              Savings built for <br />
              <span className="text-emerald-600">how you live today.</span>
            </h2>
            <p className="text-lg text-slate-600 font-medium font-heading">
              We've taken everything you love about community savings and added the speed
              and security of modern digital finance. No interest, no over-promising—just pure discipline.
            </p>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:auto-rows-[320px]">
          {/* Main Feature - Bento 1 */}
          <motion.div
            whileHover={{ y: -5 }}
            className="md:col-span-8 bg-emerald-950 rounded-[2.5rem] p-10 relative overflow-hidden group shadow-2xl border border-emerald-800/50"
          >
            <div className="relative z-10 h-full flex flex-col justify-between">
              <div className="space-y-4 max-w-md">
                <div className="w-14 h-14 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                  <Shield className="size-8 text-slate-950" />
                </div>
                <h3 className="text-3xl font-bold text-white tracking-tight">Registered & 100% Secure.</h3>
                <p className="text-emerald-50/60 font-medium">Your money is protected by bank-level encryption and managed with strict accountability standards.</p>
              </div>
              <div className="flex gap-4">
                <div className="px-4 py-2 bg-white/5 rounded-full text-[10px] font-black text-emerald-400 uppercase tracking-widest border border-white/10 backdrop-blur-sm">PCIDSS Compliant</div>
                <div className="px-4 py-2 bg-white/5 rounded-full text-[10px] font-black text-emerald-400 uppercase tracking-widest border border-white/10 backdrop-blur-sm">CAC: BN-8950808</div>
              </div>
            </div>
            {/* Visual Decoration */}
            <div className="absolute top-1/2 right-[-10%] w-[400px] h-[400px] bg-emerald-500/10 rounded-full blur-[80px]" />
          </motion.div>

          {/* Social Savings - Bento 2 */}
          <motion.div
            whileHover={{ y: -5 }}
            className="md:col-span-4 bg-emerald-50 rounded-[2.5rem] p-8 relative overflow-hidden border border-emerald-100 shadow-sm transition-all"
          >
            <div className="flex flex-col h-full justify-between">
              <div className="space-y-4">
                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm border border-emerald-100">
                  <Users className="size-6 text-emerald-600" />
                </div>
                <h3 className="text-2xl font-bold text-emerald-950 tracking-tight">Community Driven.</h3>
                <p className="text-emerald-800/70 text-sm font-medium leading-relaxed">Join thousands of members saving together. Social accountability is our secret weapon for success.</p>
              </div>
              <div className="flex -space-x-3 pt-6">
                {[
                  "https://images.unsplash.com/photo-1531123897727-8f129e16fd3c?auto=format&fit=crop&q=80&w=100",
                  "https://images.unsplash.com/photo-1627161683077-e34782c24d81?auto=format&fit=crop&q=80&w=100",
                  "https://images.unsplash.com/photo-1664575602554-2087b04935a5?auto=format&fit=crop&q=80&w=100",
                  "https://images.unsplash.com/photo-1681545303529-b6beb2e19f02?auto=format&fit=crop&q=80&w=100"
                ].map((src, i) => (
                  <ImageWithFallback key={i} src={src} className="w-10 h-10 rounded-full border-2 border-white bg-slate-200 object-cover" />
                ))}
                <div className="w-10 h-10 rounded-full border-2 border-white bg-emerald-600 flex items-center justify-center text-[10px] font-bold text-white uppercase tracking-tighter shadow-lg">+50k</div>
              </div>
            </div>
          </motion.div>

          {/* Collective Power - Bento 3 */}
          <motion.div
            whileHover={{ y: -5 }}
            className="md:col-span-4 bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-xl overflow-hidden relative group"
          >
            <div className="relative z-10 flex flex-col h-full justify-between">
              <div className="space-y-3">
                <div className="text-4xl font-black text-emerald-600 tracking-tighter">Solid</div>
                <h3 className="text-xl font-bold text-slate-900">Collective Discipline.</h3>
                <p className="text-slate-500 text-sm font-medium">Shared accountability helps you hit targets without the pressure of growth promises. We keep you consistent.</p>
              </div>
              <Button
                variant="ghost"
                className="p-0 text-emerald-600 font-bold flex items-center gap-2 group-hover:gap-4 transition-all w-fit hover:bg-transparent"
                onClick={() => document.getElementById('plans')?.scrollIntoView({ behavior: 'smooth' })}
              >
                View Circles <ArrowUpRight className="size-4" />
              </Button>
            </div>
            <div className="absolute bottom-[-20%] right-[-10%] opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
              <TrendingUp className="size-48 text-emerald-900" />
            </div>
          </motion.div>

          {/* Automation - Bento 4 */}
          <motion.div
            whileHover={{ y: -5 }}
            className="md:col-span-8 bg-slate-50 rounded-[2.5rem] p-10 relative overflow-hidden border border-slate-200"
          >
            <div className="grid md:grid-cols-2 gap-10 items-center h-full">
              <div className="space-y-4">
                <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                  <Zap className="size-6 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-slate-950 tracking-tight">Seamless Savings.</h3>
                <p className="text-slate-600 font-medium">Set your goals and join existing circles. No manual hassle, just pure community-driven discipline.</p>
                <div className="flex gap-3 pt-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <div className="w-2 h-2 rounded-full bg-slate-300" />
                  <div className="w-2 h-2 rounded-full bg-slate-300" />
                </div>
              </div>
              <div className="bg-white rounded-2xl p-6 shadow-2xl border border-slate-100 relative group">
                <div className="flex justify-between items-center mb-6">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Auto-Contribution</div>
                  <div className="w-8 h-4 bg-emerald-600 rounded-full relative">
                    <div className="absolute top-1 right-1 w-2 h-2 bg-white rounded-full" />
                  </div>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: '75%' }}
                    className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                  />
                </div>
                <div className="flex justify-between mt-3">
                  <span className="text-[10px] font-bold text-slate-900 uppercase tracking-tighter">Progress</span>
                  <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-tighter">75%</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
