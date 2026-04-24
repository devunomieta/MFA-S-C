import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { PasswordInput } from "@/app/components/ui/PasswordInput";
import { Label } from "@/app/components/ui/label";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { ArrowRight, Mail, Lock, UserPlus } from "lucide-react";
import { AuthHeader } from "@/app/components/auth/AuthHeader";
import { logActivity } from "@/lib/activity";

export function Login() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const joinPlanId = searchParams.get('join');
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        email: "",
        password: "",
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const identifier = formData.email.trim();
            const isEmail = identifier.includes('@');
            
            const { error } = await supabase.auth.signInWithPassword(
                isEmail 
                    ? { email: identifier, password: formData.password }
                    : { phone: identifier, password: formData.password }
            );

            if (error) throw error;
            
            const { data: { user } } = await supabase.auth.getUser();

            toast.success("Welcome back!");
            if (joinPlanId) {
                navigate(`/dashboard/plans?join=${joinPlanId}`);
            } else {
                navigate("/dashboard");
            }
        } catch (error: any) {
            console.error("Login Error:", error);
            
            // Log failed login attempt for security audit
            logActivity({
                action: 'AUTH_FAILURE',
                details: {
                    identifier: formData.email, // Log identifier used
                    error: error.message
                }
            });

            toast.error(error.message || "Incorrect details or password");
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
                    <AuthHeader 
                        title="Welcome Back" 
                        subtitle="Sign in to continue your savings journey" 
                    />

                    <form className="space-y-6" onSubmit={handleSubmit}>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="identifier" className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 ml-1">
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
                                    <Label htmlFor="password" className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
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

                    <div className="mt-10 pt-8 border-t border-slate-100 dark:border-slate-800 text-center">
                        <p className="text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
                            New to Mary's Thrift Services?{" "}
                            <Link
                                to="/signup"
                                className="inline-flex items-center gap-1.5 font-bold text-emerald-600 hover:text-emerald-500 transition-all hover:gap-2"
                            >
                                <UserPlus className="size-4" /> Create Account
                            </Link>
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
