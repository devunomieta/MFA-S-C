import { useState, useEffect } from "react";

import { motion } from "framer-motion";
import { ArrowLeft, Mail, Send } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { Button } from "@/app/components/ui/button";
import { HoneypotField } from "@/app/components/ui/HoneypotField";
import { Input } from "@/app/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/app/components/ui/input-otp";
import { Label } from "@/app/components/ui/label";
import { fetchHoneypotData, verifyHoneypot } from "@/lib/security";
import { supabase } from "@/lib/supabase";

export function ForgotPassword() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [website, setWebsite] = useState("");
  const [securityData, setSecurityData] = useState<{ timestamp: string; signature: string } | null>(
    null,
  );

  useEffect(() => {
    fetchHoneypotData().then((data) => {
      if (data) setSecurityData(data);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (website) {
      console.warn("Honeypot triggered");
      toast.success("Password reset link sent to your email");
      setSubmitted(true);
      return;
    }

    setLoading(true);

    try {
      // Validate Honeypot and HMAC timestamp
      const isVerified = await verifyHoneypot(
        securityData?.timestamp,
        securityData?.signature,
        website,
      );

      if (!isVerified) {
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/update-password`,
      });

      if (error) throw error;

      setSubmitted(true);
      toast.success("Password reset link sent to your email");
    } catch (error: any) {
      console.error("Reset Password Error:", error);
      toast.error(error.message || "Failed to send reset link");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length < 6) return;
    setVerifying(true);

    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: otpCode,
        type: "recovery",
      });

      if (error) throw error;
      toast.success("Identity verified! Please set your new password.");
      navigate("/update-password");
    } catch (error: any) {
      console.error("OTP Verification Error:", error);
      toast.error(error.message || "Invalid or expired code");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <>
      <Link
        to="/login"
        className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-emerald-600 transition-colors mb-8 group"
      >
        <ArrowLeft className="size-4 group-hover:-translate-x-1 transition-transform" /> Back to
        Login
      </Link>

      {submitted ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="space-y-6"
        >
          <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl border border-emerald-100 dark:border-emerald-900/30 text-center">
            <p className="text-sm text-emerald-800 dark:text-emerald-300 font-medium">
              If an account exists, a reset link has been sent to <strong>{email}</strong>
            </p>
          </div>

          <form onSubmit={handleVerifyOtp} className="space-y-6">
            <div className="space-y-4">
              <Label className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 block text-center">
                Enter 6-Digit Verification Code
              </Label>
              <div className="flex justify-center">
                <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode} className="gap-2">
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                  </InputOTPGroup>
                  <InputOTPSeparator />
                  <InputOTPGroup>
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
            </div>

            <Button
              type="submit"
              disabled={verifying || otpCode.length < 6}
              className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-lg font-bold shadow-xl shadow-emerald-600/20 active:scale-[0.98] transition-all"
            >
              {verifying ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="size-6 border-2 border-white/30 border-t-white rounded-full"
                />
              ) : (
                "Verify Code & Continue"
              )}
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="w-full text-slate-500 font-medium"
              onClick={() => setSubmitted(false)}
            >
              Didn't get a code? Try again
            </Button>
          </form>
        </motion.div>
      ) : (
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label
              htmlFor="email"
              className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 ml-1"
            >
              Email Address
            </Label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-slate-400 z-10" />
              <Input
                id="email"
                type="email"
                required
                className="h-14 pl-12 rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-base text-slate-900 dark:text-white transition-all focus:ring-2 focus:ring-emerald-500/20"
                placeholder="mary@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          {/* Honeypot field */}
          <HoneypotField value={website} onChange={(e) => setWebsite(e.target.value)} />

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
                Send Reset Link <Send className="size-5" />
              </span>
            )}
          </Button>
        </form>
      )}
    </>
  );
}
