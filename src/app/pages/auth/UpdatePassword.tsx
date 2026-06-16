import { useState, useEffect } from "react";

import { motion } from "framer-motion";
import { Lock, CheckCircle2, Home } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";


import { Button } from "@/app/components/ui/button";
import { HoneypotField } from "@/app/components/ui/HoneypotField";
import { Label } from "@/app/components/ui/label";
import { PasswordInput } from "@/app/components/ui/PasswordInput";
import { PasswordStrength } from "@/app/components/ui/PasswordStrength";
import { fetchHoneypotData, verifyHoneypot } from "@/lib/security";
import { supabase } from "@/lib/supabase";
import { validatePassword } from "@/lib/validation";

export function UpdatePassword() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
    honeypot: "", // Honeypot
  });
  const [securityData, setSecurityData] = useState<{ timestamp: string; signature: string } | null>(
    null,
  );

  const passFeedback = validatePassword(formData.password);

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
      toast.success("Password updated successfully!");
      navigate("/login");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
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

      const { error } = await supabase.auth.updateUser({
        password: formData.password,
      });

      if (error) throw error;

      toast.success("Password updated successfully! Please login with your new password.");

      // Sign out to clear any partial sessions and ensure user logs in fresh
      await supabase.auth.signOut();

      // Redirect to login page
      navigate("/login");
    } catch (error: any) {
      console.error("Update Password Error:", error);
      toast.error(error.message || "Failed to update password");
      setLoading(false);
    }
  };

  return (
    <>


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

              <PasswordStrength feedback={passFeedback} passwordLength={formData.password.length} />

              {/* Honeypot field */}
              <HoneypotField name="honeypot" value={formData.honeypot} onChange={handleChange} />
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
    </>
  );
}
