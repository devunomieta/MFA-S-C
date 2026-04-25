import { motion } from "framer-motion";
import { Shield, Eye, FileText, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export function PrivacyPolicy() {
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
              <Shield className="size-8" />
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
              Privacy Policy
            </h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium text-lg">
              Last Updated: April 24, 2026
            </p>
          </div>

          <div className="prose prose-slate dark:prose-invert max-w-none space-y-8">
            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">1. Introduction</h2>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                At Mary's Thrift Services, we value your privacy and are committed to protecting
                your personal data. This Privacy Policy explains how we collect, use, disclose, and
                safeguard your information when you visit our website or use our community savings
                platform.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                2. Information We Collect
              </h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="p-6 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3 mb-4 text-emerald-600">
                    <FileText className="size-5" />
                    <h3 className="font-bold">Personal Data</h3>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                    Name, email address, phone number, and financial information necessary for
                    managing your thrift contributions.
                  </p>
                </div>
                <div className="p-6 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3 mb-4 text-emerald-600">
                    <Eye className="size-5" />
                    <h3 className="font-bold">Usage Data</h3>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                    IP address, browser type, pages visited, and interaction data to improve our
                    service experience.
                  </p>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                3. How We Use Your Information
              </h2>
              <ul className="list-disc pl-6 space-y-2 text-slate-600 dark:text-slate-400 font-medium">
                <li>To provide and maintain our community savings platform.</li>
                <li>To manage your account and track your savings plans.</li>
                <li>To notify you about changes to our services or your payout turns.</li>
                <li>To provide customer support and handle inquiries.</li>
                <li>To detect, prevent, and address technical or security issues.</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                4. Data Security
              </h2>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                We implement industry-standard security measures, including end-to-end encryption
                and secure database management via Supabase, to protect your data. However, please
                remember that no method of transmission over the internet is 100% secure.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">5. Your Rights</h2>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                You have the right to access, update, or delete your personal information at any
                time. You can manage most of this directly from your dashboard or contact our
                support team for assistance.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">6. Contact Us</h2>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                If you have any questions about this Privacy Policy, please contact us at:
                <br />
                <strong>Email:</strong> marysthriftservices@gmail.com
                <br />
                <strong>WhatsApp:</strong> 09074049667
              </p>
            </section>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
