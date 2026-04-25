import { motion } from "framer-motion";
import { Lock, ShieldCheck, Zap, Database, ArrowLeft, Terminal } from "lucide-react";
import { Link } from "react-router-dom";

export function Security() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 pt-24 pb-20">
      <div className="container mx-auto px-4 max-w-4xl">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-emerald-600 font-bold mb-12 hover:gap-3 transition-all"
        >
          <ArrowLeft className="size-5" /> Back to Home
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-12"
        >
          <div className="space-y-6">
            <div className="size-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center text-emerald-600">
              <Lock className="size-8" />
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
              Security Standards
            </h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium text-lg">
              Bank-Grade Protection for Your Community Savings
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="p-6 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-slate-100 dark:border-slate-800 space-y-4">
              <div className="size-12 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center text-emerald-600 shadow-sm">
                <Zap className="size-6" />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white">Encryption</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                All data transmitted between your device and our servers is protected by AES-256
                end-to-end encryption.
              </p>
            </div>
            <div className="p-6 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-slate-100 dark:border-slate-800 space-y-4">
              <div className="size-12 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center text-blue-600 shadow-sm">
                <ShieldCheck className="size-6" />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white">Authentication</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                We use secure authentication protocols (OAuth2/JWT) and support Multi-Factor
                Authentication for sensitive actions.
              </p>
            </div>
            <div className="p-6 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-slate-100 dark:border-slate-800 space-y-4">
              <div className="size-12 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center text-indigo-600 shadow-sm">
                <Database className="size-6" />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white">Redundancy</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                Our infrastructure is built on Supabase/PostgreSQL with automatic daily backups and
                high-availability architecture.
              </p>
            </div>
          </div>

          <div className="prose prose-slate dark:prose-invert max-w-none space-y-8">
            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                1. Real-Time Monitoring
              </h2>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                Our systems are monitored 24/7 for any unauthorized access attempts. We employ
                automated rate limiting and web application firewalls (WAF) to prevent DDoS attacks
                and brute-force entries.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                2. Financial Integrity
              </h2>
              <div className="p-8 bg-slate-900 text-slate-300 rounded-[2rem] border border-slate-800 relative overflow-hidden group">
                <Terminal className="absolute top-4 right-4 size-12 text-slate-800 opacity-20 group-hover:opacity-40 transition-opacity" />
                <h3 className="text-white font-bold mb-4">Atomic Transactions</h3>
                <p className="text-sm leading-relaxed font-mono">
                  Every contribution and payout is processed as an "Atomic Transaction". This means
                  the update either completes 100% or fails safely, ensuring your balance never
                  enters an inconsistent state.
                </p>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                3. Third-Party Audits
              </h2>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                We regularly review our security practices and conduct internal audits to ensure our
                platform remains the safest place for your community savings.
              </p>
            </section>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
