import { useState, useEffect } from "react";

import { AnimatePresence, motion } from "framer-motion";
import { Home } from "lucide-react";
import { Link, Outlet, useLocation } from "react-router-dom";

import { BrandLogo } from "@/app/components/ui/BrandLogo";
import { supabase } from "@/lib/supabase";

const PANEL_CONTENT: Record<string, { title: string[]; subtitle: string }> = {
  "/login": {
    title: ["Welcome", "Back"],
    subtitle: "Sign in to continue your savings journey with Mary's Thrift.",
  },
  "/signup": {
    title: ["Start Saving", "Today"],
    subtitle: "Join 2,000+ Nigerians building their financial future with Mary's Thrift.",
  },
  "/forgot-password": {
    title: ["Reset", "Password"],
    subtitle: "We'll send a secure recovery link to your email address.",
  },
  "/verify-otp": {
    title: ["Verify", "Your Email"],
    subtitle: "Enter the 6-digit code we sent to your inbox.",
  },
  "/update-password": {
    title: ["New", "Password"],
    subtitle: "Choose a strong password for your account.",
  },
};

export function AuthLayout() {
  const location = useLocation();
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  const content = PANEL_CONTENT[location.pathname] ?? PANEL_CONTENT["/login"];

  useEffect(() => {
    supabase
      .from("app_settings")
      .select("value")
      .eq("key", "general")
      .single()
      .then(({ data }) => {
        if (data?.value?.logo_url) setLogoUrl(data.value.logo_url);
      });
  }, []);

  return (
    <div className="h-screen w-full flex items-center justify-center overflow-hidden bg-slate-50 dark:bg-slate-950 relative">
      {/* Background blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div
          animate={{ scale: [1, 1.15, 1], rotate: [0, 60, 0] }}
          transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-emerald-400/10 dark:bg-emerald-500/10 rounded-full blur-[120px]"
        />
        <motion.div
          animate={{ scale: [1.1, 1, 1.1], rotate: [0, -60, 0] }}
          transition={{ duration: 28, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-blue-400/10 dark:bg-blue-500/10 rounded-full blur-[120px]"
        />
      </div>

      {/* ── Persistent card shell — never unmounts ── */}
      <div className="relative z-10 w-full max-w-4xl mx-4 flex min-h-[400px] md:min-h-[450px] rounded-[2rem] overflow-hidden shadow-[0_24px_64px_rgba(0,0,0,0.12)] border border-slate-200/60 dark:border-slate-800/60">
        {/* Left branding panel (desktop/tablet) */}
        <div className="hidden md:flex flex-col justify-between w-[40%] shrink-0 bg-emerald-600 dark:bg-emerald-700 p-8 relative overflow-hidden">
          {/* Decorative rings */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-16 -right-16 w-64 h-64 bg-white/10 rounded-full" />
            <div className="absolute -bottom-24 -left-12 w-80 h-80 bg-white/5 rounded-full" />
          </div>

          {/* Logo — always shown */}
          <Link to="/" className="relative z-10 inline-block hover:opacity-85 transition-opacity">
            {logoUrl ? (
              <BrandLogo src={logoUrl} alt="Logo" size="sm" />
            ) : (
              <div className="bg-white/20 px-4 py-2 rounded-xl flex items-center justify-center font-black text-white tracking-widest text-sm">
                MTF Logo
              </div>
            )}
          </Link>

          {/* Page title — fades per route */}
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.08, ease: "easeInOut" }}
              className="relative z-10 space-y-2"
            >
              <h1 className="text-3xl font-black text-white leading-tight">
                {content.title.map((line, i) => (
                  <span key={i} className="block">
                    {line}
                  </span>
                ))}
              </h1>
              <p className="text-emerald-100 text-sm font-medium leading-relaxed pt-1">
                {content.subtitle}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Return to homepage — always shown */}
          <Link
            to="/"
            className="relative z-10 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-emerald-100 hover:text-white transition-colors group"
          >
            <Home className="size-3.5 group-hover:-translate-y-0.5 transition-transform" />
            Return to Homepage
          </Link>
        </div>

        {/* Right form panel */}
        <div className="flex-1 bg-white dark:bg-slate-900 flex flex-col justify-center relative overflow-hidden">
          {/* Mobile logo bar — always shown */}
          <div className="md:hidden flex items-center justify-between px-6 pt-6">
            <Link to="/" className="inline-block hover:opacity-80 transition-opacity">
              {logoUrl ? (
                <BrandLogo src={logoUrl} alt="Logo" size="sm" />
              ) : (
                <div className="bg-emerald-600 px-3 py-1.5 rounded-xl flex items-center justify-center font-black text-white tracking-widest text-xs">
                  MTF Logo
                </div>
              )}
            </Link>
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 transition-colors"
            >
              <Home className="size-3.5" /> Home
            </Link>
          </div>

          {/* Form content — fades per route, background stays solid */}
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.08, ease: "easeInOut" }}
              className="p-6 sm:p-8"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
