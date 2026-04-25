import { useState } from "react";

import { motion } from "framer-motion";
import { Lock, CheckCircle2, Home } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";

import { AuthHeader } from "@/app/components/auth/AuthHeader";
import { Button } from "@/app/components/ui/button";
import { Label } from "@/app/components/ui/label";
import { PasswordInput } from "@/app/components/ui/PasswordInput";
import { supabase } from "@/lib/supabase";

export function UpdatePassword() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.updateUser({
        password: formData.password,
      });

      if (error) throw error;

      const user = data?.user;
      toast.success("Password updated successfully");

      // Check if user is an admin
      let isAdmin = false;
      try {
        const { data: isRpcAdmin } = await supabase.rpc("is_admin_check", {
          p_email: user?.email,
        });
        if (isRpcAdmin) {
          isAdmin = true;
        }
      } catch (err) {
        console.warn("Admin check failed on update password:", err);
      }

      navigate(isAdmin ? "/admin" : "/dashboard");
    } catch (error: any) {
      console.error("Update Password Error:", error);
      toast.error(error.message || "Failed to update password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 overflow-hidden bg-white dark:bg-slate-950">
      {/* Premium Background Blobs */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-emerald-50/50 dark:bg-emerald-900/10 rounded-full blur-[100px]"
        />
        <motion.div
          animate={{
            scale: [1.2, 1, 1.2],
            rotate: [0, -90, 0],
          }}
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
          <AuthHeader title="New Password" subtitle="Secure your account with a strong password" />

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label
                  htmlFor="password"
                  className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 ml-1"
                >
                  New Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-slate-400 z-10" />
                  <PasswordInput
                    id="password"
                    name="password"
                    required
                    className="h-14 pl-12 rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-base text-slate-900 dark:text-white"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleChange}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="confirmPassword"
                  className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 ml-1"
                >
                  Confirm New Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-slate-400 z-10" />
                  <PasswordInput
                    id="confirmPassword"
                    name="confirmPassword"
                    required
                    className="h-14 pl-12 rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-base text-slate-900 dark:text-white"
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                  />
                </div>
              </div>
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
                <span className="flex items-center justify-center gap-2">
                  Update Password <CheckCircle2 className="size-5" />
                </span>
              )}
            </Button>
          </form>

          <div className="mt-10 pt-8 border-t border-slate-100 dark:border-slate-800 text-center">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-slate-400 hover:text-emerald-600 transition-all group"
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
