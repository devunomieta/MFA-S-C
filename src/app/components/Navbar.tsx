import { Button } from "@/app/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { Menu, X, ArrowRight, Home, Layout, Zap, Smartphone, Mail } from "lucide-react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
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

  useEffect(() => {
    const fetchBranding = async () => {
      const { data } = await supabase.from('app_settings').select('value').eq('key', 'general').single();
      if (data?.value?.logo_url) {
        setLogoUrl(data.value.logo_url);
      }
    };
    fetchBranding();
  }, []);

  const handleDashboardClick = () => {
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
      toast.error(error.message || "Incorrect password");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200">
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          {/* Logo */}
          <div className="text-2xl text-emerald-600 font-bold">
            <Link to="/">
              {logoUrl ? (
                <ImageWithFallback src={logoUrl} alt="AjoSave" className="h-10 w-auto object-contain" />
              ) : (
                "AjoSave"
              )}
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <a href="/#plans" className="text-gray-700 hover:text-emerald-600 transition-colors">
              Plans
            </a>
            <a href="#features" className="text-gray-700 hover:text-emerald-600 transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="text-gray-700 hover:text-emerald-600 transition-colors">
              How It Works
            </a>
            <a href="#contact" className="text-gray-700 hover:text-emerald-600 transition-colors">
              Contact
            </a>
          </div>

          {/* Desktop CTA Buttons */}
          <div className="hidden md:flex items-center gap-4">
            {user ? (
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={handleDashboardClick}
              >
                Access Dashboard
              </Button>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost">Log In</Button>
                </Link>
                <Link to="/signup">
                  <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
                    Sign Up
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center gap-4">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 text-gray-700 hover:text-emerald-600"
            >
              {isOpen ? <X className="size-6" /> : <Menu className="size-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="fixed inset-0 z-[100] md:hidden bg-white flex flex-col pt-20 px-6 h-[100dvh]"
            >
              <button
                onClick={() => setIsOpen(false)}
                className="absolute top-6 right-6 p-2 text-slate-900"
              >
                <X className="size-8" />
              </button>

              <div className="flex flex-col gap-8 items-center justify-center flex-1">
                {[
                  { name: "Home", href: "/", icon: <Home className="size-5" /> },
                  { name: "Plans", href: "/#plans", icon: <Layout className="size-5" /> },
                  { name: "Features", href: "#features", icon: <Zap className="size-5" /> },
                  { name: "How It Works", href: "#how-it-works", icon: <Smartphone className="size-5" /> },
                  { name: "Contact", href: "#contact", icon: <Mail className="size-5" /> }
                ].map((item, i) => (
                  <motion.a
                    key={item.name}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    href={item.href}
                    className="text-3xl font-black text-slate-900 flex items-center gap-4 hover:text-emerald-600 transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    {item.icon}
                    {item.name}
                  </motion.a>
                ))}
              </div>

              <div className="py-12 border-t border-slate-100 flex flex-col gap-4">
                {user ? (
                  <Button
                    size="lg"
                    className="w-full h-16 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-lg font-bold"
                    onClick={() => {
                      setIsOpen(false);
                      handleDashboardClick();
                    }}
                  >
                    Access Dashboard
                  </Button>
                ) : (
                  <>
                    <Link to="/login" onClick={() => setIsOpen(false)} className="w-full">
                      <Button variant="outline" size="lg" className="w-full h-16 border-2 rounded-2xl text-lg font-bold">Log In</Button>
                    </Link>
                    <Link to="/signup" onClick={() => setIsOpen(false)} className="w-full">
                      <Button size="lg" className="w-full h-16 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-lg font-bold">
                        Create Free Account
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <Dialog open={showVerifyModal} onOpenChange={setShowVerifyModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Verify Password</DialogTitle>
            <DialogDescription>
              Please enter your password to access the dashboard.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAccessDashboard} className="space-y-4 pt-4">
            <div className="space-y-2">
              <PasswordInput
                placeholder="Enter your password"
                value={verifyPassword}
                onChange={(e) => setVerifyPassword(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowVerifyModal(false)}
                disabled={verifying}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={verifying}
              >
                {verifying ? "Verifying..." : "Confirm"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </nav>
  );
}