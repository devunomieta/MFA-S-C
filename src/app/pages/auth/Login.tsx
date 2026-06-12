import { useState, useEffect } from "react";

import { motion } from "framer-motion";
import { ArrowRight, Mail, Lock, UserPlus, Home } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import { AuthHeader } from "@/app/components/auth/AuthHeader";
import { Button } from "@/app/components/ui/button";
import { HoneypotField } from "@/app/components/ui/HoneypotField";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { PasswordInput } from "@/app/components/ui/PasswordInput";
import { logActivity } from "@/lib/activity";
import { fetchHoneypotData, verifyHoneypot } from "@/lib/security";
import { supabase } from "@/lib/supabase";

export function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const joinPlanId = searchParams.get("join");
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ email: "", password: "", honeypot: "" });
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.honeypot) {
      console.warn("Honeypot triggered");
      toast.success("Welcome back!");
      navigate("/dashboard");
      return;
    }

    setLoading(true);

    try {
      // Validate Honeypot and HMAC timestamp
      const isVerified = await verifyHoneypot(
        securityData?.timestamp,
        securityData?.signature,
        formData.honeypot,
      );

      if (!isVerified) {
        setLoading(false);
        return;
      }

      const identifier = formData.email.trim();
      const isEmail = identifier.includes("@");

      const { data, error } = await supabase.auth.signInWithPassword({
        ...(isEmail ? { email: identifier } : { phone: identifier }),
        password: formData.password,
      });

      if (error) throw error;

      const user = data?.user;
      if (!user) throw new Error("No user found after sign in");

      toast.success("Welcome back!");

      let isAdminUser = false;
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("is_admin")
          .eq("id", user.id)
          .maybeSingle();
        isAdminUser = profile?.is_admin || false;

        if (!isAdminUser) {
          const { data: isRpcAdmin } = await supabase.rpc("is_admin_check", {
            p_email: user.email,
          });
          if (isRpcAdmin) isAdminUser = true;
        }
      } catch (adminError) {
        console.warn("Secondary admin check failed:", adminError);
      }

      if (isAdminUser) {
        navigate("/admin");
      } else if (joinPlanId) {
        navigate(`/dashboard/plans?join=${joinPlanId}`);
      } else {
        navigate("/dashboard");
      }
    } catch (error: any) {
      console.error("Login Error:", error);
      logActivity({
        action: "AUTH_FAILURE",
        details: { identifier: formData.email, error: error.message },
      });
      toast.error(error.message || "Incorrect details or password");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    const redirectTo = joinPlanId
      ? `${window.location.origin}/dashboard/plans?join=${joinPlanId}`
      : `${window.location.origin}/dashboard`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    if (error) toast.error(error.message);
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 overflow-hidden bg-white dark:bg-slate-950">
      <div className="absolute inset-0 pointer-events-none">
        <motion.div
          animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-emerald-50/50 dark:bg-emerald-900/10 rounded-full blur-[100px]"
        />
        <motion.div
          animate={{ scale: [1.2, 1, 1.2], rotate: [0, -90, 0] }}
          transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-50/50 dark:bg-blue-900/10 rounded-full blur-[100px]"
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-md w-full relative z-10"
      >
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl p-8 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-slate-200/50 dark:border-slate-800/50">
          <AuthHeader title="Welcome Back" subtitle="Sign in to continue your savings journey" />

          {/* Google Sign In — top CTA */}
          <div className="mb-6 space-y-4">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              className="w-full h-14 flex items-center justify-center gap-3 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 hover:border-emerald-400 hover:bg-emerald-50/30 dark:hover:border-emerald-700 dark:hover:bg-emerald-900/10 transition-all active:scale-[0.98] shadow-sm"
            >
              <svg className="size-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
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
                Continue with Google
              </span>
            </button>
            <div className="relative flex items-center gap-3">
              <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
                or sign in with email
              </span>
              <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
            </div>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label
                  htmlFor="identifier"
                  className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 ml-1"
                >
                  Email or Phone Number
                </Label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-slate-400" />
                  <Input
                    id="identifier"
                    name="email"
                    type="text"
                    autoComplete="username"
                    required
                    className="h-14 pl-12 rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:ring-emerald-500 transition-all text-base text-slate-900 dark:text-white"
                    placeholder="Email or Phone"
                    value={formData.email}
                    onChange={handleChange}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between ml-1">
                  <Label
                    htmlFor="password"
                    className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400"
                  >
                    Password
                  </Label>
                  <Link
                    to="/forgot-password"
                    className="text-xs font-bold text-emerald-600 hover:text-emerald-500 transition-colors"
                  >
                    Forgot Password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-slate-400 z-10" />
                  <PasswordInput
                    id="password"
                    name="password"
                    autoComplete="current-password"
                    required
                    className="h-14 pl-12 rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:ring-emerald-500 transition-all text-base text-slate-900 dark:text-white"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleChange}
                  />
                </div>
              </div>

              {/* Honeypot field */}
              <HoneypotField name="honeypot" value={formData.honeypot} onChange={handleChange} />
            </div>

            <div className="flex items-center ml-1">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="size-4 text-emerald-600 focus:ring-emerald-500 border-slate-300 rounded-lg cursor-pointer"
              />
              <label
                htmlFor="remember-me"
                className="ml-2 block text-sm text-slate-600 dark:text-slate-400 font-medium cursor-pointer"
              >
                Stay signed in for 30 days
              </label>
            </div>

            <Button
              type="submit"
              className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-lg font-bold shadow-xl shadow-emerald-600/20 active:scale-[0.98] transition-all"
              disabled={loading}
            >
              {loading ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="size-6 border-2 border-white/30 border-t-white rounded-full"
                />
              ) : (
                <span className="flex items-center gap-2">
                  Sign In <ArrowRight className="size-5" />
                </span>
              )}
            </Button>
          </form>

          <div className="mt-10 pt-8 border-t border-slate-100 dark:border-slate-800 text-center space-y-6">
            <p className="text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
              New to Mary's Thrift Services?{" "}
              <Link
                to="/signup"
                className="inline-flex items-center gap-1.5 font-bold text-emerald-600 hover:text-emerald-500 transition-all hover:gap-2"
              >
                <UserPlus className="size-4" /> Create Account
              </Link>
            </p>
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-slate-400 hover:text-emerald-600 transition-all group pt-2"
            >
              <Home className="size-3.5 group-hover:-translate-y-0.5 transition-transform" />
              Return to Homepage
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
