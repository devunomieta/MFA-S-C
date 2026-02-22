import { Button } from "@/app/components/ui/button";
import { motion } from "framer-motion";

export function CTA() {
  return (
    <section className="py-20 relative overflow-hidden bg-white">
      <div className="container mx-auto px-4 relative z-10">
        <div className="bg-slate-900 rounded-[3rem] p-12 md:p-16 text-center relative overflow-hidden shadow-2xl border border-slate-800">
          {/* Background decoration */}
          <div className="absolute top-0 left-0 w-full h-full">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[100px]" />
          </div>

          <div className="relative z-10 max-w-3xl mx-auto space-y-10">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="space-y-6"
            >
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-white leading-tight">
                Ready to save <br />
                <span className="text-emerald-400">together?</span>
              </h2>
              <p className="text-xl text-slate-400 font-medium leading-relaxed">
                Join over 50,000 members who are already revolutionizing their financial discipline with AjoSave. Simple, social, and secure.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <Button
                size="lg"
                className="w-full sm:w-auto px-10 h-16 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-lg font-bold shadow-xl shadow-emerald-500/20 active:scale-95 transition-all"
                onClick={() => document.getElementById('plans')?.scrollIntoView({ behavior: 'smooth' })}
              >
                Join a Circle
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto px-10 h-16 bg-transparent border-2 border-slate-700 text-white hover:bg-slate-800 hover:text-white rounded-2xl text-lg font-bold active:scale-95 transition-all"
                onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
              >
                How it Works
              </Button>
            </motion.div>

            {/* Trust Badges */}
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
              className="flex items-center justify-center gap-8 pt-4"
            >
              <div className="flex flex-col items-center">
                <span className="text-2xl font-black text-white">100%</span>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Secure</span>
              </div>
              <div className="w-px h-8 bg-slate-800" />
              <div className="flex flex-col items-center">
                <span className="text-2xl font-black text-white">#1</span>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Choice</span>
              </div>
              <div className="w-px h-8 bg-slate-800" />
              <div className="flex flex-col items-center">
                <span className="text-2xl font-black text-white">24/7</span>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Support</span>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}