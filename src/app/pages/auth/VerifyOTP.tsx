import { useState, useEffect } from "react";

import { motion } from "framer-motion";
import { ArrowLeft, RefreshCw, CheckCircle2, Home } from "lucide-react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";


import { Button } from "@/app/components/ui/button";
import { HoneypotField } from "@/app/components/ui/HoneypotField";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/app/components/ui/input-otp";
import { Label } from "@/app/components/ui/label";
import { fetchHoneypotData, verifyHoneypot } from "@/lib/security";
import { supabase } from "@/lib/supabase";

export function VerifyOTP() {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [otp, setOtp] = useState("");
  const [resending, setResending] = useState(false);
  const [email, setEmail] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [website, setWebsite] = useState("");
  const [securityData, setSecurityData] = useState<{ timestamp: string; signature: string } | null>(
    null,
  );

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  useEffect(() => {
    fetchHoneypotData().then((data) => {
      if (data) setSecurityData(data);
    });
  }, []);

  useEffect(() => {
    const state = location.state as { email?: string };
    const params = new URLSearchParams(location.search);
    const emailParam = params.get("email");

    if (state?.email) {
      Promise.resolve().then(() => setEmail(state.email as string));
    } else if (emailParam) {
      Promise.resolve().then(() => setEmail(emailParam));
    }
  }, [location]);

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (website) {
      console.warn("Honeypot triggered");
      toast.success("Verification successful!");
      navigate("/dashboard");
      return;
    }

    if (otp.length !== 6) {
      toast.error("Please enter the full 6-digit code");
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

      const { error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: "signup",
      });

      if (error) throw error;

      toast.success("Verification successful!");

      // Check if verified user is an admin
      let isAdmin = false;
      try {
        const { data: isRpcAdmin } = await supabase.rpc("is_admin_check", {
          p_email: email,
        });
        if (isRpcAdmin) {
          isAdmin = true;
        }
      } catch (adminError) {
        console.warn("OTP admin check failed:", adminError);
      }

      navigate(isAdmin ? "/admin" : "/dashboard");
    } catch (error: any) {
      console.error("OTP Verification Error:", error);
      toast.error(error.message || "Invalid or expired code");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email || cooldown > 0) return;
    setResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
      });
      if (error) throw error;
      toast.success("New code sent to your email");
      setCooldown(60);
    } catch (error: any) {
      toast.error(error.message || "Failed to resend code");
    } finally {
      setResending(false);
    }
  };

  return (
    <>
      <Link
        to="/signup"
        className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-emerald-600 transition-colors mb-10 group"
      >
        <ArrowLeft className="size-4 group-hover:-translate-x-1 transition-transform" /> Change
        Email
      </Link>



          <div className="mb-6 p-4 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-800/30 rounded-2xl text-center">
            <p className="text-xs text-emerald-800 dark:text-emerald-300 font-medium leading-relaxed">
              🔑 Retrieve the <strong>6-digit OTP code</strong> from your email inbox to complete
              signup, or simply click the <strong>confirmation link</strong> inside the email to
              verify automatically.
            </p>
          </div>

          <div className="flex flex-col items-center space-y-8">
            <div className="space-y-4 w-full flex flex-col items-center">
              <Label className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                Security Code
              </Label>
              <InputOTP
                maxLength={6}
                value={otp}
                onChange={setOtp}
                onComplete={() => handleVerify()}
              >
                <InputOTPGroup className="gap-2">
                  <InputOTPSlot
                    index={0}
                    className="size-12 md:size-14 rounded-xl border-2 text-lg font-bold"
                  />
                  <InputOTPSlot
                    index={1}
                    className="size-12 md:size-14 rounded-xl border-2 text-lg font-bold"
                  />
                  <InputOTPSlot
                    index={2}
                    className="size-12 md:size-14 rounded-xl border-2 text-lg font-bold"
                  />
                  <InputOTPSlot
                    index={3}
                    className="size-12 md:size-14 rounded-xl border-2 text-lg font-bold"
                  />
                  <InputOTPSlot
                    index={4}
                    className="size-12 md:size-14 rounded-xl border-2 text-lg font-bold"
                  />
                  <InputOTPSlot
                    index={5}
                    className="size-12 md:size-14 rounded-xl border-2 text-lg font-bold"
                  />
                </InputOTPGroup>
              </InputOTP>
            </div>

            {/* Honeypot field */}
            <HoneypotField value={website} onChange={(e) => setWebsite(e.target.value)} />

            <Button
              onClick={() => handleVerify()}
              className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-lg font-bold shadow-xl shadow-emerald-600/20 active:scale-[0.98] transition-all"
              disabled={loading || otp.length !== 6}
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="size-6 border-2 border-white/30 border-t-white rounded-full"
                  />
                </div>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Verify & Continue <CheckCircle2 className="size-5" />
                </span>
              )}
            </Button>

            <div className="text-center">
              <button
                onClick={handleResend}
                disabled={resending || cooldown > 0}
                className="inline-flex items-center gap-2 text-sm font-bold text-emerald-600 hover:text-emerald-500 transition-colors disabled:opacity-50"
              >
                {resending ? (
                  <RefreshCw className="size-4 animate-spin" />
                ) : (
                  <RefreshCw className="size-4" />
                )}
                {cooldown > 0 ? `Resend Code (${cooldown}s)` : "Resend Code"}
              </button>
            </div>
          </div>
    </>
  );
}
