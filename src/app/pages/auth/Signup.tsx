import { useState, useEffect } from "react";

import { motion } from "framer-motion";
import { ArrowRight, Mail, LogIn } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import { Button } from "@/app/components/ui/button";
import { HoneypotField } from "@/app/components/ui/HoneypotField";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { logActivity } from "@/lib/activity";
import { fetchHoneypotData, verifyHoneypot } from "@/lib/security";
import { supabase } from "@/lib/supabase";

export function Signup() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const joinPlanId = searchParams.get("join");
  const [loading, setLoading] = useState(false);
  const [authMode, setAuthMode] = useState<"standard" | "magic">("standard");
  const [formData, setFormData] = useState({ email: "", honeypot: "" });
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [securityData, setSecurityData] = useState<{ timestamp: string; signature: string } | null>(
    null,
  );

  useEffect(() => {
    fetchHoneypotData().then((data) => {
      if (data) setSecurityData(data);
    });
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleStandardSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.honeypot) {
      console.warn("Honeypot triggered");
      navigate("/onboarding");
      return;
    }

    if (!termsAccepted) {
      toast.error("Please accept the Terms & Conditions");
      return;
    }

    setLoading(true);

    try {
      const isVerified = await verifyHoneypot(
        securityData?.timestamp,
        securityData?.signature,
        formData.honeypot,
      );

      if (!isVerified) {
        setLoading(false);
        return;
      }

      const { data: userAuth, error: signupError } = await supabase.auth.signUp({
        email: formData.email,
        password: Math.random().toString(36).slice(-8) + "Aa1!",
        options: {
          data: { signup_mode: "standard" },
        },
      });

      if (signupError) throw signupError;

      if (!userAuth.user) throw new Error("Signup failed. Please try again.");

      logActivity({ action: "USER_SIGNUP", details: { method: "email", mode: "standard" } });
      toast.success("Account created successfully!");
      
      if (!userAuth.session) {
        // Email confirmation is required
        navigate("/verify-otp", { state: { email: formData.email, mode: "signup", joinPlanId } });
      } else {
        navigate(`/dashboard${joinPlanId ? `?join=${joinPlanId}` : ""}`);
      }
    } catch (error: any) {
      console.error("Signup Error:", error);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMagicSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.honeypot) {
      console.warn("Honeypot triggered");
      toast.info("Magic Link sent! Please check your email.");
      return;
    }

    if (!termsAccepted) {
      toast.error("Please accept the Terms & Conditions");
      return;
    }

    setLoading(true);

    try {
      const isVerified = await verifyHoneypot(
        securityData?.timestamp,
        securityData?.signature,
        formData.honeypot,
      );

      if (!isVerified) {
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.signInWithOtp({
        email: formData.email,
        options: {
          data: { signup_mode: "magic" },
        },
      });

      if (error) throw error;

      logActivity({ action: "USER_SIGNUP", details: { method: "magic_link", mode: "magic" } });
      toast.info("Magic Link sent! Please check your email.");
      navigate("/verify-otp", { state: { email: formData.email, mode: "signup", joinPlanId } });
    } catch (error: any) {
      console.error("Magic Signup Error:", error);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    const redirectTo = joinPlanId
      ? `${window.location.origin}/dashboard?join=${joinPlanId}`
      : `${window.location.origin}/dashboard`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    if (error) toast.error(error.message);
  };

  return (
    <>
      {/* Mode toggle */}
      <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex items-center mb-5">
        <button
          type="button"
          onClick={() => setAuthMode("standard")}
          className={`flex-1 h-9 rounded-lg text-xs font-bold transition-all ${authMode === "standard"
            ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
            : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
        >
          Standard Signup
        </button>
        <button
          type="button"
          onClick={() => setAuthMode("magic")}
          className={`flex-1 h-9 rounded-lg text-xs font-bold transition-all ${authMode === "magic"
            ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
            : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
        >
          Passwordless Signup
        </button>
      </div>

      {/* Google */}
      <button
        type="button"
        onClick={handleGoogleSignUp}
        className="w-full h-11 flex items-center justify-center gap-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 hover:border-emerald-400 hover:bg-emerald-50/30 dark:hover:border-emerald-700 dark:hover:bg-emerald-900/10 transition-all active:scale-[0.98] shadow-sm mb-4"
      >
        <svg className="size-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
          Sign up with Google
        </span>
      </button>

      {/* Divider */}
      <div className="relative flex items-center gap-3 mb-4">
        <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
          or sign up with email
        </span>
        <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
      </div>

      {/* Form */}
      <form
        className="space-y-4"
        onSubmit={authMode === "standard" ? handleStandardSignup : handleMagicSignup}
      >
        <div className="space-y-1.5">
          <Label
            htmlFor="email"
            className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 ml-1"
          >
            Email Address
          </Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <Input
              id="email"
              name="email"
              type="email"
              required
              className="h-11 pl-10 rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
              placeholder="you@example.com"
              value={formData.email}
              onChange={handleChange}
            />
          </div>
        </div>

        <HoneypotField name="honeypot" value={formData.honeypot} onChange={handleChange} />

        <div className="flex items-center ml-1">
          <input
            id="terms"
            name="terms"
            type="checkbox"
            checked={termsAccepted}
            onChange={(e) => setTermsAccepted(e.target.checked)}
            className="size-3.5 text-emerald-600 focus:ring-emerald-500 border-slate-300 rounded cursor-pointer"
          />
          <label
            htmlFor="terms"
            className="ml-2 text-[11px] text-slate-600 dark:text-slate-400 font-medium cursor-pointer"
          >
            I agree to the{" "}
            <Link
              to="/terms"
              className="font-bold text-emerald-600 hover:text-emerald-500 transition-colors"
            >
              Terms & Conditions
            </Link>
          </label>
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/20"
        >
          {loading ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="size-5 border-2 border-white/30 border-t-white rounded-full"
            />
          ) : authMode === "standard" ? (
            <span className="flex items-center justify-center gap-2">
              Continue to Onboarding <ArrowRight className="size-4" />
            </span>
          ) : (
            "Send Magic Link"
          )}
        </Button>
      </form>

      {/* Footer */}
      <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-center gap-1.5">
        <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
          Already have an account?
        </span>
        <Link
          to="/login"
          className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-500 transition-colors"
        >
          <LogIn className="size-3.5" /> Sign In
        </Link>
      </div>
    </>
  );
}
