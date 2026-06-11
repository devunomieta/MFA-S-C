import { useState, useEffect } from "react";

import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Home, Layout, Zap, Smartphone, Mail, ShieldCheck } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { BrandLogo } from "@/app/components/ui/BrandLogo";
import { Button } from "@/app/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/app/components/ui/dialog";
import { HoneypotField } from "@/app/components/ui/HoneypotField";
import { PasswordInput } from "@/app/components/ui/PasswordInput";
import { useAuth } from "@/app/context/AuthContext";
import { fetchHoneypotData, verifyHoneypot } from "@/lib/security";
import { supabase } from "@/lib/supabase";

export function Navbar() {
  const { user, lastActivity, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [appName, setAppName] = useState("Mary's Thrift Services");
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifyPassword, setVerifyPassword] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [website, setWebsite] = useState("");
  const [securityData, setSecurityData] = useState<{ timestamp: string; signature: string } | null>(
    null,
  );

  const closeVerifyModal = () => {
    setShowVerifyModal(false);
    setWebsite("");
    setSecurityData(null);
    setVerifyPassword("");
  };

  useEffect(() => {
    if (showVerifyModal) {
      fetchHoneypotData().then((data) => {
        if (data) setSecurityData(data);
      });
    }
  }, [showVerifyModal]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const fetchBranding = async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "general")
        .single();
      if (data?.value?.logo_url) {
        setLogoUrl(data.value.logo_url);
      }
      if (data?.value?.app_name) {
        setAppName(data.value.app_name);
      }
      if (data?.value?.favicon_url) {
        const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
        if (link) link.href = data.value.favicon_url;
      }
    };
    fetchBranding();
  }, []);

  const handleDashboardAction = () => {
    setIsOpen(false);
    if (!user) {
      navigate("/login");
      return;
    }
    const INACTIVITY_THRESHOLD = 30 * 60 * 1000; // 30 minutes
    const timeSinceLastActivity = Date.now() - lastActivity;

    if (timeSinceLastActivity > INACTIVITY_THRESHOLD) {
      setShowVerifyModal(true);
    } else {
      navigate(isAdmin ? "/admin" : "/dashboard");
    }
  };

  const handleAccessDashboard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.email) return;

    if (website) {
      console.warn("Dashboard Access Honeypot triggered");
      closeVerifyModal();
      navigate("/dashboard");
      return;
    }

    setVerifying(true);
    try {
      // Validate Honeypot and HMAC timestamp
      const isVerified = await verifyHoneypot(
        securityData?.timestamp,
        securityData?.signature,
        website,
      );

      if (!isVerified) {
        setVerifying(false);
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: verifyPassword,
      });

      if (error) throw error;

      closeVerifyModal();
      navigate(isAdmin ? "/admin" : "/dashboard");
    } catch (error: any) {
      console.error("Dashboard Access Verification Error:", error);
      toast.error(error.message || "Incorrect password");
    } finally {
      setVerifying(false);
    }
  };

  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    setIsOpen(false);
    if (href.startsWith("#")) {
      e.preventDefault();
      const element = document.getElementById(href.substring(1));
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    } else if (href.startsWith("/#")) {
      e.preventDefault();
      const id = href.split("#")[1];
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      } else {
        navigate(href);
      }
    }
  };

  return (
    <>
      <header
        className={`fixed left-0 right-0 z-50 flex justify-center transition-all duration-500 pointer-events-none ${
          scrolled ? "top-4 px-4 md:px-8" : "top-0 px-4"
        }`}
      >
        <div
          className={`pointer-events-auto w-full flex items-center justify-between transition-all duration-500 ease-out relative ${
            scrolled
              ? "max-w-5xl bg-white/70 dark:bg-slate-900/80 backdrop-blur-3xl border border-white/50 dark:border-slate-700/50 rounded-[2rem] shadow-[0_8px_30px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.4)] py-2 px-3 md:px-5"
              : "max-w-7xl bg-transparent py-4 md:py-6 px-2"
          }`}
        >
          {/* Logo Section */}
          <div className="flex-1 flex justify-start z-20">
            <Link
              to="/"
              className="flex items-center gap-2 group transition-all"
              onClick={() => setIsOpen(false)}
            >
              {logoUrl ? (
                <BrandLogo src={logoUrl} alt={appName} size="sm" transparent={true} />
              ) : (
                <>
                  <div className="size-9 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-600/30 group-hover:rotate-6 transition-transform">
                    <ShieldCheck className="text-white size-5" />
                  </div>
                  <span className="text-lg md:text-xl font-black tracking-tighter text-slate-950 dark:text-white group-hover:opacity-80">
                    {appName.includes(" ") ? (
                      <>
                        {appName.split(" ").slice(0, -1).join(" ")}
                        <span className="text-emerald-600 ml-1">
                          {appName.split(" ").slice(-1)}
                        </span>
                        <span className="text-emerald-600">.</span>
                      </>
                    ) : (
                      <>
                        {appName}
                        <span className="text-emerald-600">.</span>
                      </>
                    )}
                  </span>
                </>
              )}
            </Link>
          </div>

          {/* Centered Navigation */}
          <nav className="absolute left-1/2 -translate-x-1/2 hidden md:flex items-center gap-1 z-[100]">
            {[
              { name: "Plans", href: "/#plans" },
              { name: "Features", href: "#features" },
              { name: "How It Works", href: "#how-it-works" },
              { name: "Contact", href: "#contact" },
            ].map((link) => (
              <a
                key={link.name}
                href={link.href}
                onClick={(e) => scrollToSection(e, link.href)}
                className={`px-4 py-2 text-sm font-bold rounded-full transition-all ${
                  scrolled
                    ? "text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-white/60 dark:hover:bg-slate-800/60"
                    : "text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100/50 dark:hover:bg-slate-800/40"
                }`}
              >
                {link.name}
              </a>
            ))}
          </nav>

          {/* Right CTA Section */}
          <div className="flex-1 flex justify-end items-center gap-4 z-10">
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full px-6 md:px-8 font-bold shadow-lg shadow-emerald-600/20 active:scale-95 transition-all hidden sm:flex text-xs md:text-sm"
              onClick={handleDashboardAction}
            >
              Dashboard
            </Button>

            {/* Mobile Toggle Button */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="md:hidden size-10 flex items-center justify-center rounded-full bg-emerald-600 border border-emerald-500 shadow-lg shadow-emerald-600/20 active:scale-90 transition-all relative z-[120]"
              aria-label="Toggle Menu"
            >
              {isOpen ? (
                <X className="size-5 text-white" />
              ) : (
                <Menu className="size-5 text-white" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Overlay */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed inset-0 z-[110] md:hidden bg-white/98 dark:bg-slate-950/98 backdrop-blur-3xl rounded-none shadow-2xl flex flex-col p-8 overflow-hidden pointer-events-auto"
            >
              <div className="flex justify-between items-center mb-10">
                <Link to="/" onClick={() => setIsOpen(false)} className="flex items-center gap-2">
                  {logoUrl ? (
                    <BrandLogo src={logoUrl} alt={appName} size="sm" transparent={true} />
                  ) : (
                    <>
                      <div className="size-8 bg-emerald-600 rounded-lg flex items-center justify-center">
                        <ShieldCheck className="text-white size-5" />
                      </div>
                      <span className="text-lg md:text-xl font-black tracking-tighter">
                        {appName.includes(" ") ? (
                          <>
                            {appName.split(" ").slice(0, -1).join(" ")}
                            <span className="text-emerald-600 ml-1">
                              {appName.split(" ").slice(-1)}
                            </span>
                          </>
                        ) : (
                          appName
                        )}
                        <span className="text-emerald-600">.</span>
                      </span>
                    </>
                  )}
                </Link>
                <button
                  onClick={() => setIsOpen(false)}
                  className="size-10 rounded-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center active:scale-90 transition-all"
                >
                  <X className="size-5" />
                </button>
              </div>

              <div className="flex flex-col gap-4 overflow-y-auto scrollbar-none pb-8">
                {[
                  { name: "Home", href: "/", icon: <Home className="size-6" /> },
                  { name: "Plans", href: "/#plans", icon: <Layout className="size-6" /> },
                  { name: "Features", href: "#features", icon: <Zap className="size-6" /> },
                  {
                    name: "How It Works",
                    href: "#how-it-works",
                    icon: <Smartphone className="size-6" />,
                  },
                  { name: "Contact", href: "#contact", icon: <Mail className="size-6" /> },
                ].map((item, i) => (
                  <motion.a
                    key={item.name}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 + 0.1 }}
                    href={item.href}
                    className="text-lg md:text-xl font-black text-slate-900 dark:text-white flex items-center gap-5 group"
                    onClick={(e) => scrollToSection(e, item.href)}
                  >
                    <div className="size-10 md:size-11 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-600 group-active:bg-emerald-600 group-active:text-white transition-all">
                      {item.icon}
                    </div>
                    {item.name}
                  </motion.a>
                ))}
              </div>

              <div className="mt-auto pt-8 border-t border-slate-100 dark:border-slate-800">
                <Button
                  className="w-full h-14 rounded-[1.2rem] text-base md:text-lg font-bold bg-emerald-600 text-white shadow-xl shadow-emerald-600/20 active:scale-95 transition-all"
                  onClick={handleDashboardAction}
                >
                  Dashboard
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Verification Modal */}
      <Dialog
        open={showVerifyModal}
        onOpenChange={(open) => {
          if (!open) closeVerifyModal();
          else setShowVerifyModal(open);
        }}
      >
        <DialogContent className="sm:max-w-md rounded-[2rem] z-[200]">
          <DialogHeader>
            <DialogTitle className="text-lg md:text-2xl font-black tracking-tight">
              Security Check
            </DialogTitle>
            <DialogDescription className="font-medium text-slate-600 dark:text-slate-400 text-xs md:text-sm">
              Please enter your password to access your dashboard.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAccessDashboard} className="space-y-6 pt-4">
            <div className="space-y-2">
              <PasswordInput
                placeholder="Your Password"
                value={verifyPassword}
                onChange={(e) => setVerifyPassword(e.target.value)}
                required
                autoFocus
                className="h-12 md:h-14 rounded-xl md:rounded-2xl border-slate-200 dark:border-slate-800 text-xs md:text-sm"
              />
              <HoneypotField value={website} onChange={(e) => setWebsite(e.target.value)} />
            </div>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                className="flex-1 h-12 md:h-14 rounded-xl md:rounded-2xl font-bold border-2 text-xs md:text-sm"
                onClick={closeVerifyModal}
                disabled={verifying}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 h-12 md:h-14 rounded-xl md:rounded-2xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20 text-xs md:text-sm"
                disabled={verifying}
              >
                {verifying ? "Verifying..." : "Access Now"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
