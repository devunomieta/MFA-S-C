import { Button } from "@/app/components/ui/button";
import { Label } from "@/app/components/ui/label";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { ArrowLeft, RefreshCw, CheckCircle2 } from "lucide-react";
import { AuthHeader } from "@/app/components/auth/AuthHeader";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/app/components/ui/input-otp";

export function VerifyOTP() {
    const navigate = useNavigate();
    const location = useLocation();
    const [loading, setLoading] = useState(false);
    const [otp, setOtp] = useState("");
    const [resending, setResending] = useState(false);
    const [email, setEmail] = useState("");

    useEffect(() => {
        const state = location.state as { email?: string };
        const params = new URLSearchParams(location.search);
        const emailParam = params.get("email");
        
        if (state?.email) {
            setEmail(state.email);
        } else if (emailParam) {
            setEmail(emailParam);
        }
    }, [location]);

    const handleVerify = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (otp.length !== 6) {
            toast.error("Please enter the full 6-digit code");
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase.auth.verifyOtp({
                email,
                token: otp,
                type: 'signup',
            });

            if (error) throw error;

            toast.success("Verification successful!");
            navigate("/dashboard");
        } catch (error: any) {
            console.error("OTP Verification Error:", error);
            toast.error(error.message || "Invalid or expired code");
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        if (!email) return;
        setResending(true);
        try {
            const { error } = await supabase.auth.resend({
                type: 'signup',
                email,
            });
            if (error) throw error;
            toast.success("New code sent to your email");
        } catch (error: any) {
            toast.error(error.message || "Failed to resend code");
        } finally {
            setResending(false);
        }
    };

    return (
        <div className="min-h-screen relative flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 overflow-hidden bg-white dark:bg-slate-950">
            {/* Premium Background Blobs */}
            <div className="absolute inset-0 pointer-events-none">
                <motion.div
                    animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }}
                    transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-emerald-50/50 dark:bg-emerald-900/10 rounded-full blur-[100px]"
                />
                <motion.div
                    animate={{ scale: [1.2, 1, 1.2], rotate: [0, -90, 0] }}
                    transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-50/50 dark:bg-blue-900/10 rounded-full blur-[100px]"
                />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="max-w-md w-full relative z-10"
            >
                <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl p-10 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-slate-200/50 dark:border-slate-800/50">
                    <Link to="/signup" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-emerald-600 transition-colors mb-10 group">
                        <ArrowLeft className="size-4 group-hover:-translate-x-1 transition-transform" /> Change Email
                    </Link>

                    <AuthHeader 
                        title="Verify Account" 
                        subtitle={`We've sent a 6-digit security code to ${email || "your email"}`}
                    />

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
                                    <InputOTPSlot index={0} className="size-12 md:size-14 rounded-xl border-2 text-lg font-bold" />
                                    <InputOTPSlot index={1} className="size-12 md:size-14 rounded-xl border-2 text-lg font-bold" />
                                    <InputOTPSlot index={2} className="size-12 md:size-14 rounded-xl border-2 text-lg font-bold" />
                                    <InputOTPSlot index={3} className="size-12 md:size-14 rounded-xl border-2 text-lg font-bold" />
                                    <InputOTPSlot index={4} className="size-12 md:size-14 rounded-xl border-2 text-lg font-bold" />
                                    <InputOTPSlot index={5} className="size-12 md:size-14 rounded-xl border-2 text-lg font-bold" />
                                </InputOTPGroup>
                            </InputOTP>
                        </div>

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
                                disabled={resending}
                                className="inline-flex items-center gap-2 text-sm font-bold text-emerald-600 hover:text-emerald-500 transition-colors disabled:opacity-50"
                            >
                                {resending ? (
                                    <RefreshCw className="size-4 animate-spin" />
                                ) : (
                                    <RefreshCw className="size-4" />
                                )}
                                Resend Code
                            </button>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
