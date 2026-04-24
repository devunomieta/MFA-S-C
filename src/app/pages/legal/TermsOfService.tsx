import { motion } from "framer-motion";
import { Scale, CheckCircle, AlertCircle, Info, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export function TermsOfService() {
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
            <div className="size-16 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center text-blue-600">
              <Scale className="size-8" />
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight">Terms of Service</h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium text-lg">
              Effective Date: April 24, 2026
            </p>
          </div>

          <div className="prose prose-slate dark:prose-invert max-w-none space-y-8">
            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">1. Agreement to Terms</h2>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                By accessing or using Mary's Thrift Services, you agree to be bound by these Terms of Service. If you do not agree to all of these terms, do not use our services.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">2. User Eligibility</h2>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                To use our platform, you must be at least 18 years old and capable of forming a binding contract. You are responsible for ensuring that your use of the service complies with all applicable laws and regulations in Nigeria.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">3. Saving Plans & Contributions</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-5 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2 mb-2 text-emerald-600">
                    <CheckCircle className="size-4" />
                    <h3 className="font-bold text-sm">Commitment</h3>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                    Users must adhere to the contribution schedule of their chosen plan. Late payments may result in penalties or delayed payouts.
                  </p>
                </div>
                <div className="p-5 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2 mb-2 text-blue-600">
                    <Info className="size-4" />
                    <h3 className="font-bold text-sm">Payouts</h3>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                    Payout turns are assigned based on the plan's structure. Withdrawals are processed within 24-48 hours of reaching your turn.
                  </p>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">4. Prohibited Activities</h2>
              <ul className="list-disc pl-6 space-y-2 text-slate-600 dark:text-slate-400 font-medium">
                <li>Providing false or misleading registration information.</li>
                <li>Using the platform for money laundering or illegal financial transactions.</li>
                <li>Attempting to interfere with the security or integrity of the platform.</li>
                <li>Failing to meet savings commitments repeatedly.</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">5. Limitation of Liability</h2>
              <div className="p-6 bg-amber-50 dark:bg-amber-900/10 rounded-3xl border border-amber-100 dark:border-amber-900/30">
                <div className="flex items-center gap-3 mb-4 text-amber-600">
                  <AlertCircle className="size-5" />
                  <h3 className="font-bold">Important Notice</h3>
                </div>
                <p className="text-sm text-amber-800 dark:text-amber-400 font-medium leading-relaxed">
                  Mary's Thrift Services is a community savings facilitator. We are not a bank or a licensed financial institution. We provide the digital infrastructure to manage traditional thrift (Ajo) contributions securely.
                </p>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">6. Modifications to Terms</h2>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                We reserve the right to modify these terms at any time. We will provide notice of significant changes through the platform or via email. Your continued use of the service after such changes constitutes acceptance of the new terms.
              </p>
            </section>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
