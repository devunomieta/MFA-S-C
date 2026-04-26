import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Phone, KeyRound, CheckCircle2, ArrowRight, LogOut, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/app/context/AuthContext";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { PasswordStrength } from "@/app/components/ui/PasswordStrength";
import { validatePassword } from "@/lib/validation";

interface SecurityOnboardingProps {
  onComplete: () => void;
}

export function SecurityOnboarding({ onComplete }: SecurityOnboardingProps) {
  const { user, signOut } = useAuth();
  const [step, setStep] = useState<"intro" | "phone" | "password" | "success">("intro");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  // Form states
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const passFeedback = validatePassword(password);

  const isGoogleUser = 
    user?.app_metadata?.provider === "google" || 
    (user?.app_metadata?.providers as string[] | undefined)?.includes("google");

  useEffect(() => {
    checkStatus();
  }, [user]);

  async function checkStatus() {
    if (!user) return;
    setChecking(true);
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("phone, onboarding_completed, has_password")
        .eq("id", user.id)
        .maybeSingle();

      const hasPhone = !!profile?.phone && profile.phone.trim().length > 3;
      const needsPassword = isGoogleUser && !profile?.has_password;

      if (profile?.onboarding_completed) {
        onComplete();
        return;
      }

      if (!hasPhone) {
        setStep("phone");
      } else if (needsPassword) {
        setStep("password");
      } else {
        // Everything set but flag not updated
        await completeOnboarding();
      }
    } catch (err) {
      console.error("Status check failed:", err);
    } finally {
      setChecking(false);
    }
  }

  async function handlePhoneSubmit() {
    if (phone.length < 10) {
      toast.error("Please enter a valid phone number");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ phone: phone })
        .eq("id", user?.id);

      if (error) throw error;

      await supabase.auth.updateUser({
        phone: phone,
        data: { phone: phone }
      });

      toast.success("Phone number saved!");
      
      if (isGoogleUser) {
        setStep("password");
      } else {
        await completeOnboarding();
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to save phone number");
    } finally {
      setLoading(false);
    }
  }

  async function handlePasswordSubmit() {
    if (!passFeedback.isValid) {
      toast.error("Please meet all password requirements");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
        data: { has_password: true }
      });

      if (error) throw error;

      // Update profile flag too
      await supabase.from("profiles").update({ has_password: true }).eq("id", user?.id);

      toast.success("Password created successfully!");
      await completeOnboarding();
    } catch (err: any) {
      toast.error(err.message || "Failed to set password");
    } finally {
      setLoading(false);
    }
  }

  async function completeOnboarding() {
    try {
      await supabase
        .from("profiles")
        .update({ onboarding_completed: true })
        .eq("id", user?.id);
      
      setStep("success");
      setTimeout(() => {
        onComplete();
      }, 2000);
    } catch (err) {
      console.error("Finalizing onboarding failed:", err);
      onComplete(); // Failsafe
    }
  }

  if (checking) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
      >
        <div className="p-8">
          <AnimatePresence mode="wait">
            {step === "intro" && (
              <motion.div 
                key="intro"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6 text-center"
              >
                <div className="mx-auto w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center mb-6">
                  <Shield className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h2 className="text-2xl font-bold dark:text-white">Secure Your Account</h2>
                <p className="text-slate-500 dark:text-slate-400">
                  Welcome to Mary's Thrift! To keep your funds safe, we need you to complete two quick security steps.
                </p>
                <Button onClick={() => setStep("phone")} className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 rounded-xl font-bold">
                  Start Setup <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
                <button onClick={signOut} className="text-sm text-slate-400 hover:text-red-500 flex items-center justify-center gap-2 mx-auto mt-4">
                  <LogOut className="w-4 h-4" /> Sign out for now
                </button>
              </motion.div>
            )}

            {step === "phone" && (
              <motion.div 
                key="phone"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center space-y-2">
                  <div className="mx-auto w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                    <Phone className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h2 className="text-xl font-bold dark:text-white">Add Phone Number</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Step 1 of {isGoogleUser ? "2" : "1"}: Your phone number is required for account recovery and login.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-slate-500">Phone Number</Label>
                  <Input 
                    type="tel" 
                    placeholder="e.g. +234 800 000 0000" 
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="h-12 rounded-xl dark:bg-slate-800 dark:border-slate-700"
                  />
                </div>

                <Button onClick={handlePhoneSubmit} disabled={loading} className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 rounded-xl font-bold shadow-lg shadow-emerald-500/20">
                  {loading ? <Loader2 className="animate-spin" /> : "Continue"}
                </Button>
              </motion.div>
            )}

            {step === "password" && (
              <motion.div 
                key="password"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center space-y-2">
                  <div className="mx-auto w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
                    <KeyRound className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h2 className="text-xl font-bold dark:text-white">Create a Password</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Step 2 of 2: Since you signed in with Google, creating a password allows you to login directly later.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-slate-500">New Password</Label>
                    <Input 
                      type="password" 
                      placeholder="••••••••" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-12 rounded-xl dark:bg-slate-800 dark:border-slate-700"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-slate-500">Confirm Password</Label>
                    <Input 
                      type="password" 
                      placeholder="••••••••" 
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="h-12 rounded-xl dark:bg-slate-800 dark:border-slate-700"
                    />
                  </div>
                  <PasswordStrength feedback={passFeedback} passwordLength={password.length} />
                </div>

                <Button onClick={handlePasswordSubmit} disabled={loading} className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 rounded-xl font-bold shadow-lg shadow-emerald-500/20">
                  {loading ? <Loader2 className="animate-spin" /> : "Complete Setup"}
                </Button>
              </motion.div>
            )}

            {step === "success" && (
              <motion.div 
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center space-y-4 py-8"
              >
                <div className="mx-auto w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center text-emerald-600">
                  <CheckCircle2 className="w-12 h-12" />
                </div>
                <h2 className="text-2xl font-bold dark:text-white">Setup Complete!</h2>
                <p className="text-slate-500 dark:text-slate-400">
                  Your account is now fully secured. Redirecting you to the dashboard...
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
