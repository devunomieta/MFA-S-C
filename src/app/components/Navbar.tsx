import { Button } from "@/app/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/app/context/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/app/components/ui/dialog";
import { PasswordInput } from "@/app/components/ui/PasswordInput";
import { toast } from "sonner";

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
                <img src={logoUrl} alt="AjoSave" className="h-10 w-auto object-contain" />
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
        {isOpen && (
          <div className="md:hidden py-4 border-t border-gray-200">
            <div className="flex flex-col gap-4">
              <a
                href="/#plans"
                className="text-gray-700 hover:text-emerald-600 transition-colors py-2"
                onClick={() => setIsOpen(false)}
              >
                Plans
              </a>
              <a
                href="#features"
                className="text-gray-700 hover:text-emerald-600 transition-colors py-2"
                onClick={() => setIsOpen(false)}
              >
                Features
              </a>
              <a
                href="#how-it-works"
                className="text-gray-700 hover:text-emerald-600 transition-colors py-2"
                onClick={() => setIsOpen(false)}
              >
                How It Works
              </a>
              <a
                href="#testimonials"
                className="text-gray-700 hover:text-emerald-600 transition-colors py-2"
                onClick={() => setIsOpen(false)}
              >
                Testimonials
              </a>
              <a
                href="#contact"
                className="text-gray-700 hover:text-emerald-600 transition-colors py-2"
                onClick={() => setIsOpen(false)}
              >
                Contact
              </a>
              <div className="flex flex-col gap-2 pt-4 border-t border-gray-200">
                {user ? (
                  <Button
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => {
                      setIsOpen(false);
                      handleDashboardClick();
                    }}
                  >
                    Access Dashboard
                  </Button>
                ) : (
                  <>
                    <Link to="/login" onClick={() => setIsOpen(false)}>
                      <Button variant="outline" className="w-full">Log In</Button>
                    </Link>
                    <Link to="/signup" onClick={() => setIsOpen(false)}>
                      <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
                        Sign Up
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
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