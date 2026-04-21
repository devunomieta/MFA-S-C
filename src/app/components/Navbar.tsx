import { Button } from "@/app/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { Menu, X, Home, Layout, Zap, Smartphone, Mail, ShieldCheck } from "lucide-react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/app/context/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/app/components/ui/dialog";
import { PasswordInput } from "@/app/components/ui/PasswordInput";
import { toast } from "sonner";
import { ImageWithFallback } from "@/app/components/figma/ImageWithFallback";

export function Navbar() {
  const { user, lastActivity } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifyPassword, setVerifyPassword] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const { scrollY } = useScroll();
  const navbarWidth = useTransform(scrollY, [0, 100], ["100%", "92%"]);
  const navbarTop = useTransform(scrollY, [0, 100], ["0px", "20px"]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const fetchBranding = async () => {
      const { data, error } = await supabase.from('app_settings').select('value').eq('key', 'general').single();
      if (data?.value?.logo_url) {
        setLogoUrl(data.value.logo_url);
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
      navigate("/dashboard");
    }
  };

  const handleAccessDashboard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.email) return;

    setVerifying(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: verifyPassword,
      });

      if (error) throw error;

      setShowVerifyModal(false);
      setVerifyPassword("");
      navigate("/dashboard");
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
      <motion.header
        style={{ top: navbarTop }}
        className="fixed left-0 right-0 z-[100] flex justify-center pointer-events-none transition-all duration-500"
      >
        <motion.div
          style={{ width: navbarWidth }}
          className={`pointer-events-auto transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${
            scrolled 
              ? "bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl border border-slate-200/50 dark:border-slate-800/50 rounded-full shadow-[0_8px_40px_rgba(0,0,0,0.08)] px-2 py-2" 
              : "bg-transparent border-transparent pt-4"
          }`}
        >
          <div className="container mx-auto px-4 md:px-6 relative h-14 md:h-16 flex items-center justify-between">
            {/* Logo Section */}
            <div className="flex-1 flex justify-start z-10">
              <Link to="/" className="flex items-center gap-2 group transition-all" onClick={() => setIsOpen(false)}>
                {logoUrl ? (
                  <ImageWithFallback src={logoUrl} alt="AjoSave" className="h-8 w-auto object-contain" />
                ) : (
                  <>
                    <div className="size-9 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-600/30 group-hover:rotate-6 transition-transform">
                      <ShieldCheck className="text-white size-5" />
                    </div>
                    <span className="text-lg md:text-xl font-black tracking-tighter text-slate-950 dark:text-white group-hover:opacity-80">
                      Ajo<span className="text-emerald-600">Save</span>
                    </span>
                  </>
                )}
              </Link>
            </div>

            {/* Perfectly Centered Navigation Pill */}
            <nav className="absolute left-1/2 -translate-x-1/2 hidden md:flex items-center bg-slate-100/50 dark:bg-slate-800/40 px-5 py-1.5 rounded-full border border-slate-200/30 dark:border-slate-700/30 backdrop-blur-md">
              {[
                { name: "Plans", href: "/#plans" },
                { name: "Features", href: "#features" },
                { name: "How It Works", href: "#how-it-works" },
                { name: "Contact", href: "#contact" }
              ].map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  onClick={(e) => scrollToSection(e, link.href)}
                  className="px-4 py-1 text-xs md:text-sm font-bold text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all relative group whitespace-nowrap"
                >
                  {link.name}
                  <span className="absolute bottom-[-2px] left-1/2 w-0 h-0.5 bg-emerald-600 group-hover:w-1/3 group-hover:left-1/3 transition-all rounded-full" />
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
                className="md:hidden size-10 flex items-center justify-center rounded-full bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50 active:scale-90 transition-all relative z-[120]"
                aria-label="Toggle Menu"
              >
                {isOpen ? <X className="size-5 text-slate-900 dark:text-white" /> : <Menu className="size-5 text-white" />}
              </button>
            </div>
          </div>
        </motion.div>

        {/* Mobile Navigation Overlay */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed inset-4 z-[110] md:hidden bg-white/98 dark:bg-slate-950/98 backdrop-blur-3xl rounded-[2.5rem] border border-slate-200/50 dark:border-slate-800/50 shadow-2xl flex flex-col p-8 overflow-hidden pointer-events-auto"
            >
              <div className="flex justify-between items-center mb-10">
                <Link to="/" onClick={() => setIsOpen(false)} className="flex items-center gap-2">
                  {logoUrl ? (
                    <ImageWithFallback src={logoUrl} alt="AjoSave" className="h-8 w-auto object-contain" />
                  ) : (
                    <>
                      <div className="size-8 bg-emerald-600 rounded-lg flex items-center justify-center">
                        <ShieldCheck className="text-white size-5" />
                      </div>
                      <span className="text-lg md:text-xl font-black tracking-tighter">Ajo<span className="text-emerald-600">Save</span></span>
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

              <div className="flex flex-col gap-4 overflow-y-auto pb-8">
                {[
                  { name: "Home", href: "/", icon: <Home className="size-6" /> },
                  { name: "Plans", href: "/#plans", icon: <Layout className="size-6" /> },
                  { name: "Features", href: "#features", icon: <Zap className="size-6" /> },
                  { name: "How It Works", href: "#how-it-works", icon: <Smartphone className="size-6" /> },
                  { name: "Contact", href: "#contact", icon: <Mail className="size-6" /> }
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
      </motion.header>

      {/* Verification Modal */}
      <Dialog open={showVerifyModal} onOpenChange={setShowVerifyModal}>
        <DialogContent className="sm:max-w-md rounded-[2rem] z-[200]">
          <DialogHeader>
            <DialogTitle className="text-lg md:text-2xl font-black tracking-tight">Security Check</DialogTitle>
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
            </div>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                className="flex-1 h-12 md:h-14 rounded-xl md:rounded-2xl font-bold border-2 text-xs md:text-sm"
                onClick={() => setShowVerifyModal(false)}
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