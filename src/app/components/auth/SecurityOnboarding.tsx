import { useState, useEffect } from "react";

import { motion, AnimatePresence } from "framer-motion";
import { Shield, CheckCircle2, ArrowRight, LogOut, Loader2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { PasswordStrength } from "@/app/components/ui/PasswordStrength";
import { useAuth } from "@/app/context/AuthContext";
import { notificationDispatcher } from "@/lib/notificationDispatcher";
import { supabase } from "@/lib/supabase";
import { validatePassword } from "@/lib/validation";

interface SecurityOnboardingProps {
  onComplete: () => void;
}

export function SecurityOnboarding({ onComplete }: SecurityOnboardingProps) {
  const { user, signOut } = useAuth();
  const [step, setStep] = useState<"intro" | "phone" | "password" | "pin" | "success">("intro");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [requiresPin, setRequiresPin] = useState(false);

  // Form states
  const [phone, setPhone] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const passFeedback = validatePassword(password);

  const isGoogleUser =
    user?.app_metadata?.provider === "google" ||
    (user?.app_metadata?.providers as string[] | undefined)?.includes("google");

  const completeOnboarding = async () => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ onboarding_completed: true })
        .eq("id", user?.id);

      if (error) throw error;

      // Send Welcome Message
      if (user?.id && user?.email) {
        await notificationDispatcher.sendAlert({
          userId: user.id,
          email: user.email,
          type: "profile",
          title: "Welcome to Mary's Thrift Services!",
          message:
            "Thank you for securing your account and completing your onboarding. We are thrilled to have you here! You can now start depositing funds, joining plans, and borrowing loans. Welcome aboard!",
        });
      }

      setStep("success");
      setTimeout(() => {
        onComplete();
      }, 2000);
    } catch (err: any) {
      console.error("Finalizing onboarding failed:", err);
      toast.error(err.message || "Failed to finalize onboarding. Please try again.");
    }
  };

  useEffect(() => {
    const checkStatus = async () => {
      if (!user) return;
      setChecking(true);
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("phone, full_name, onboarding_completed, has_password, transaction_pin")
          .eq("id", user.id)
          .maybeSingle();

        setFullName(profile?.full_name || "");

        const hasPhone = !!profile?.phone && profile.phone.trim().length > 3;

        const isStandardSignup = user?.user_metadata?.signup_mode === "standard";
        const needsPassword = !profile?.has_password && (isGoogleUser || isStandardSignup);

        setRequiresPassword(!!needsPassword);

        const needsPin = !profile?.transaction_pin;
        setRequiresPin(needsPin);

        if (profile?.onboarding_completed && !needsPin && !needsPassword) {
          onComplete();
          return;
        }

        if (!hasPhone) {
          setStep("phone");
        } else if (needsPassword) {
          setStep("password");
        } else if (needsPin) {
          setStep("pin");
        } else {
          // Everything set but flag not updated
          await completeOnboarding();
        }
      } catch {
        // Fail silent
      } finally {
        setChecking(false);
      }
    };

    checkStatus();
  }, [user, isGoogleUser, onComplete]);

  // Live validation calculations for Phone
  const phoneDigitsOnly = phone.replace(/\D/g, "");
  const is11Digits = phoneDigitsOnly.length === 11 && phoneDigitsOnly.startsWith("0");
  const is13Digits = phoneDigitsOnly.length === 13 && phoneDigitsOnly.startsWith("234");
  const isPhoneValid = is11Digits || is13Digits;

  let phoneWarningText = "";
  if (phone.length > 0 && !isPhoneValid) {
    if (phoneDigitsOnly.startsWith("234")) {
      if (phoneDigitsOnly.length < 13) {
        phoneWarningText = `Needs ${13 - phoneDigitsOnly.length} more digits`;
      }
    } else if (phoneDigitsOnly.startsWith("0")) {
      if (phoneDigitsOnly.length < 11) {
        phoneWarningText = `Needs ${11 - phoneDigitsOnly.length} more digits`;
      }
    } else {
      phoneWarningText = "Must start with 0 (e.g. 080) or 234";
    }
  }

  // Live validation calculations for Name
  const validateFullName = (name: string) => {
    const trimmed = name.trim();
    const parts = trimmed.split(/\s+/);
    if (parts.length < 2) return false;
    const partRegex = /^[A-Za-z'-]+$/;
    const hasLetter = /[A-Za-z]/;
    return parts.every((part) => partRegex.test(part) && hasLetter.test(part));
  };

  const isNameValid = validateFullName(fullName);

  let nameWarningText = "";
  if (fullName.trim().length > 0 && !isNameValid) {
    const trimmed = fullName.trim();
    const parts = trimmed.split(/\s+/);
    if (parts.length < 2) {
      nameWarningText = "Please enter at least two names (first and last name)";
    } else {
      const partRegex = /^[A-Za-z'-]+$/;
      const hasLetter = /[A-Za-z]/;
      const invalidPart = parts.find((part) => !partRegex.test(part) || !hasLetter.test(part));
      if (invalidPart) {
        nameWarningText = "Names can only contain letters, apostrophes (') and hyphens (-)";
      }
    }
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    // Allow only digits and a leading '+'
    val = val.replace(/(?!^\+)[^\d]/g, "");

    const dOnly = val.replace(/\D/g, "");
    if (dOnly.startsWith("234") || dOnly.startsWith("23")) {
      // Limit to 13 digits (+1 for the plus sign if present)
      const maxLen = val.startsWith("+") ? 14 : 13;
      if (val.length > maxLen) {
        val = val.slice(0, maxLen);
      }
    } else if (dOnly.startsWith("0")) {
      // Limit to 11 digits
      if (val.length > 11) {
        val = val.slice(0, 11);
      }
    } else {
      // Fallback max
      const maxLen = val.startsWith("+") ? 14 : 13;
      if (val.length > maxLen) {
        val = val.slice(0, maxLen);
      }
    }
    setPhone(val);
  };

  async function handlePhoneSubmit() {
    if (!isPhoneValid) {
      toast.error("Please enter a valid Nigerian phone number");
      return;
    }

    setLoading(true);
    try {
      // Normalize to 11 digits for consistency if they entered 234
      const normalizedPhone = is13Digits ? "0" + phoneDigitsOnly.slice(3) : phoneDigitsOnly;

      const { error: dbError } = await supabase.from("profiles").upsert({
        id: user?.id,
        phone: normalizedPhone,
        full_name: fullName,
        email: user?.email,
      });

      if (dbError) throw dbError;

      const { error: authError } = await supabase.auth.updateUser({
        data: { phone: normalizedPhone, full_name: fullName },
      });

      if (authError) throw authError;

      toast.success("Phone number saved!");

      if (requiresPassword) {
        setStep("password");
      } else if (requiresPin) {
        setStep("pin");
      } else {
        await completeOnboarding();
      }
    } catch (err: any) {
      console.error("Saving phone failed:", err);
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
        data: { has_password: true },
      });

      if (error) throw error;

      // Update profile flag too
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ has_password: true })
        .eq("id", user?.id);

      if (profileError) throw profileError;

      toast.success("Password created successfully!");
      if (requiresPin) {
        setStep("pin");
      } else {
        await completeOnboarding();
      }
    } catch (err: any) {
      console.error("Password update failed:", err);
      toast.error(err.message || "Update failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handlePinSubmit() {
    if (pin.length !== 4 || pin !== confirmPin) {
      toast.error("Please enter and confirm a 4-digit PIN");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ transaction_pin: pin })
        .eq("id", user?.id);

      if (error) throw error;

      toast.success("Transaction PIN created successfully!");
      await completeOnboarding();
    } catch (err: any) {
      console.error("PIN update failed:", err);
      toast.error(err.message || "Failed to set PIN. Please try again.");
    } finally {
      setLoading(false);
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
          {step !== "intro" && step !== "success" && (
            <div className="mb-8">
              <div className="flex items-center justify-between relative">
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-full z-0" />
                <div
                  className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-emerald-500 rounded-full z-0 transition-all duration-500"
                  style={{ width: `${step === "phone" ? 0 : step === "password" ? 50 : 100}%` }}
                />

                <div className="relative z-10 flex flex-col items-center gap-2">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${step === "phone" || step === "password" || step === "pin" ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30" : "bg-slate-200 dark:bg-slate-700 text-slate-500"}`}
                  >
                    1
                  </div>
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider ${step === "phone" ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"}`}
                  >
                    Profile
                  </span>
                </div>

                {requiresPassword && (
                  <div className="relative z-10 flex flex-col items-center gap-2">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${step === "password" || step === "pin" ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30" : "bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 text-slate-400"}`}
                    >
                      2
                    </div>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider ${step === "password" ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"}`}
                    >
                      Password
                    </span>
                  </div>
                )}

                {requiresPin && (
                  <div className="relative z-10 flex flex-col items-center gap-2">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${step === "pin" ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30" : "bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 text-slate-400"}`}
                    >
                      {requiresPassword ? "3" : "2"}
                    </div>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider ${step === "pin" ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"}`}
                    >
                      PIN
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

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
                  Welcome to Mary's Thrift! To keep your funds safe, we need you to complete two
                  quick security steps.
                </p>
                <Button
                  onClick={() => setStep("phone")}
                  className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 rounded-xl font-bold"
                >
                  Start Setup <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
                <button
                  onClick={signOut}
                  className="text-sm text-slate-400 hover:text-red-500 flex items-center justify-center gap-2 mx-auto mt-4"
                >
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
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Please provide your full name and phone number
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-slate-500">Full Name</Label>
                    <div className="relative">
                      <Input
                        type="text"
                        placeholder="e.g. John Doe"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className={`h-12 rounded-xl dark:bg-slate-800 focus-visible:ring-2 transition-all pr-10 ${
                          fullName.trim().length > 0
                            ? isNameValid
                              ? "border-emerald-500 focus-visible:ring-emerald-500/20"
                              : "border-red-500 focus-visible:ring-red-500/20"
                            : "dark:border-slate-700"
                        }`}
                      />
                      {fullName.trim().length > 0 && isNameValid && (
                        <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-500" />
                      )}
                    </div>

                    {/* Live Validation Warning for Name */}
                    <AnimatePresence>
                      {nameWarningText && (
                        <motion.p
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="text-xs font-medium text-red-500 m-0"
                        >
                          {nameWarningText}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-slate-500">
                      Phone Number
                    </Label>
                    <div className="relative">
                      <Input
                        type="tel"
                        placeholder="e.g. 08012345678"
                        value={phone}
                        onChange={handlePhoneChange}
                        className={`h-12 rounded-xl dark:bg-slate-800 focus-visible:ring-2 transition-all ${
                          phone.length > 0
                            ? isPhoneValid
                              ? "border-emerald-500 focus-visible:ring-emerald-500/20"
                              : "border-red-500 focus-visible:ring-red-500/20"
                            : "dark:border-slate-700"
                        }`}
                      />
                      {isPhoneValid && (
                        <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-500" />
                      )}
                    </div>

                    {/* Live Validation Warning */}
                    <AnimatePresence>
                      {phoneWarningText && (
                        <motion.p
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="text-xs font-medium text-red-500 m-0"
                        >
                          {phoneWarningText}
                        </motion.p>
                      )}
                    </AnimatePresence>

                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 italic leading-normal">
                      💡 <strong>Recommendation:</strong> Use a WhatsApp-enabled number to receive
                      deposit, withdrawal, approval, and plan alerts directly on WhatsApp.
                    </p>
                  </div>
                </div>

                <Button
                  onClick={handlePhoneSubmit}
                  disabled={loading || phone.length === 0 || !isPhoneValid || !isNameValid}
                  className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-bold shadow-lg shadow-emerald-500/20 transition-all"
                >
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
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Create a password to easily log in next time.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-slate-500">
                      New Password
                    </Label>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="h-12 rounded-xl dark:bg-slate-800 dark:border-slate-700 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-500 transition-colors"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-slate-500">
                      Confirm Password
                    </Label>
                    <div className="relative">
                      <Input
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="h-12 rounded-xl dark:bg-slate-800 dark:border-slate-700 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-500 transition-colors"
                      >
                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                  <PasswordStrength feedback={passFeedback} passwordLength={password.length} />
                </div>

                <Button
                  onClick={handlePasswordSubmit}
                  disabled={loading || !passFeedback.isValid || password !== confirmPassword}
                  className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 rounded-xl font-bold shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? <Loader2 className="animate-spin" /> : "Continue"}
                </Button>
              </motion.div>
            )}

            {step === "pin" && (
              <motion.div
                key="pin"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center space-y-2">
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Create a secure 4-digit PIN for withdrawals.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-slate-500">
                      4-Digit PIN
                    </Label>
                    <Input
                      type="password"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={4}
                      value={pin}
                      onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                      className="h-12 rounded-xl dark:bg-slate-800 dark:border-slate-700 text-center tracking-[1em] text-2xl font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-slate-500">
                      Confirm PIN
                    </Label>
                    <Input
                      type="password"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={4}
                      value={confirmPin}
                      onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
                      className="h-12 rounded-xl dark:bg-slate-800 dark:border-slate-700 text-center tracking-[1em] text-2xl font-bold"
                    />
                  </div>
                </div>

                <Button
                  onClick={handlePinSubmit}
                  disabled={loading || pin.length !== 4 || pin !== confirmPin}
                  className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 rounded-xl font-bold shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
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

          {step !== "success" && step !== "intro" && (
            <button
              onClick={signOut}
              disabled={loading}
              className="text-sm text-slate-400 hover:text-red-500 flex items-center justify-center gap-2 mx-auto mt-6 transition-colors disabled:opacity-50"
            >
              <LogOut className="w-4 h-4" /> Sign out for now
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
