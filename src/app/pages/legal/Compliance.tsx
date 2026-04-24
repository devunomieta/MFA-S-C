import { motion } from "framer-motion";
import { Landmark, ShieldCheck, FileCheck, Award, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export function Compliance() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 pt-24 pb-20">
      <div className="container mx-auto px-4 max-w-4xl">
        <Link to="/" className="inline-flex items-center gap-2 text-emerald-600 font-bold mb-12 hover:gap-3 transition-all">
          <ArrowLeft className="size-5" /> Back to Home
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-12"
        >
          <div className="space-y-6">
            <div className="size-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-900 dark:text-white">
              <Landmark className="size-8" />
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight">Compliance & Legal</h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium text-lg">
              Operating with Integrity and Accountability
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-16">
            <div className="p-8 bg-emerald-50 dark:bg-emerald-900/10 rounded-[2.5rem] border border-emerald-100 dark:border-emerald-800/50">
              <div className="w-12 h-12 bg-white dark:bg-slate-900 rounded-xl flex items-center justify-center shadow-sm mb-6">
                <FileCheck className="size-6 text-emerald-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">CAC Registered</h3>
              <p className="text-slate-600 dark:text-slate-400 font-medium text-sm leading-relaxed">
                Mary's Thrift Services is a legally registered business entity in Nigeria under the Corporate Affairs Commission (CAC) with Registration Number <strong>BN-8950808</strong>.
              </p>
            </div>
            <div className="p-8 bg-blue-50 dark:bg-blue-900/10 rounded-[2.5rem] border border-blue-100 dark:border-blue-800/50">
              <div className="w-12 h-12 bg-white dark:bg-slate-900 rounded-xl flex items-center justify-center shadow-sm mb-6">
                <ShieldCheck className="size-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Regulatory Standards</h3>
              <p className="text-slate-600 dark:text-slate-400 font-medium text-sm leading-relaxed">
                We adhere to the highest standards of financial conduct for community savings, ensuring transparency in every contribution and payout turn.
              </p>
            </div>
          </div>

          <div className="prose prose-slate dark:prose-invert max-w-none space-y-8">
            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">1. Anti-Money Laundering (AML)</h2>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                We are committed to preventing our platform from being used for illicit activities. We implement Know Your Customer (KYC) procedures and monitor transactions for suspicious activity to maintain a safe environment for all savers.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">2. User Protection</h2>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                Our platform structure ensures that payouts are handled with strict priority. Every member is verified before they can join high-value plans, protecting the collective interest of the group.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">3. Ethical Conduct</h2>
              <div className="p-6 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-slate-100 dark:border-slate-800 flex items-start gap-4">
                <Award className="size-6 text-emerald-600 shrink-0 mt-1" />
                <p className="text-sm text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
                  We operate with 100% transparency. There are no hidden fees or undisclosed payout delays. Our management team is accessible 24/7 to resolve any disputes or questions regarding plan mechanics.
                </p>
              </div>
            </section>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
