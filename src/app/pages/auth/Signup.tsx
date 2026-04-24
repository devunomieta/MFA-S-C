import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { PasswordInput } from "@/app/components/ui/PasswordInput";
import { Label } from "@/app/components/ui/label";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Mail, Lock, User, CheckCircle2, Phone, Home } from "lucide-react";
import { logActivity } from "@/lib/activity";
import { validatePassword } from "@/lib/validation";
import { PasswordStrength } from "@/app/components/ui/PasswordStrength";
import { AuthHeader } from "@/app/components/auth/AuthHeader";

export function Signup() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const joinPlanId = searchParams.get('join');
    
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        phone: "",
        password: "",
        confirmPassword: "",
        website: "", // Honeypot field
    });

    const passFeedback = validatePassword(formData.password);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (formData.website) {
            console.warn("Honeypot triggered");
            // Silently fail or pretend it worked
            toast.success("Welcome to the community!");
            navigate("/");
            return;
        }

        if (!passFeedback.isValid) {
            toast.error("Please meet all password security requirements");
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            toast.error("Passwords do not match");
            return;
        }

        setLoading(true);

        try {
            const { data, error } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.password,
                options: {
                    data: {
                        full_name: formData.name,
                        phone: formData.phone,
                    },
                },
            });

            if (error) throw error;

            if (data.session || data.user) {
                const user = data.user!;
                logActivity({
                    userId: user.id,
                    action: 'USER_JOIN',
                    details: {
                        display_name: formData.name.split(' ')[0],
                        full_name: formData.name
                    },
                    isPublic: true
                });

                toast.success("Welcome to the community!");
                if (joinPlanId) {
                    navigate(`/dashboard/plans?join=${joinPlanId}`);
                } else {
                    navigate("/dashboard");
                }
            } else {
                toast.success("Check your email to verify your account!");
                navigate("/login");
            }
        } catch (error: any) {
            console.error("Signup Error:", error);
            toast.error(error.message || "Failed to create account");
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
                    className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-emerald-50/50 dark:bg-emerald-900/10 rounded-full blur-[100px]"
                />
                <motion.div
                    animate={{
                        scale: [1.2, 1, 1.2],
                        rotate: [0, -90, 0],
                    }}
                    transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-50/50 dark:bg-blue-900/10 rounded-full blur-[100px]"
                />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="max-w-lg w-full relative z-10"
            >
                <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl p-8 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-slate-200/50 dark:border-slate-800/50">
                    <AuthHeader 
                        title="Start Saving Today" 
                        subtitle="Join 2,000+ Nigerians building their future" 
                    />

                    <form className="space-y-6" onSubmit={handleSubmit}>
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="full-name" className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 ml-1">
                                    Full Name
                                </Label>
                                <div className="relative">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-slate-400" />
                                    <Input
                                        id="full-name"
                                        name="name"
                                        type="text"
                                        required
                                        className="h-14 pl-12 rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-base text-slate-900 dark:text-white"
                                        placeholder="John Doe"
                                        value={formData.name}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 ml-1">
                                    Email Address
                                </Label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-slate-400" />
                                    <Input
                                        id="email"
                                        name="email"
                                        type="email"
                                        required
                                        className="h-14 pl-12 rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-base text-slate-900 dark:text-white"
                                        placeholder="you@example.com"
                                        value={formData.email}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="phone" className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 ml-1">
                                    Phone Number
                                </Label>
                                <div className="relative">
                                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-slate-400" />
                                    <Input
                                        id="phone"
                                        name="phone"
                                        type="tel"
                                        required
                                        className="h-14 pl-12 rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-base text-slate-900 dark:text-white"
                                        placeholder="+234..."
                                        value={formData.phone}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>
                            {/* Honeypot field - Hidden from users */}
                            <div className="hidden" aria-hidden="true">
                                <Input
                                    type="text"
                                    name="website"
                                    value={formData.website}
                                    onChange={handleChange}
                                    tabIndex={-1}
                                    autoComplete="off"
                                />
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="password" className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 ml-1">
                                    Password
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
                                <PasswordStrength feedback={passFeedback} passwordLength={formData.password.length} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="confirm-password" className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 ml-1">
                                    Confirm Password
                                </Label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-slate-400 z-10" />
                                    <PasswordInput
                                        id="confirm-password"
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

                        <div className="flex items-center ml-1">
                            <input
                                id="terms"
                                name="terms"
                                type="checkbox"
                                required
                                className="size-4 text-emerald-600 focus:ring-emerald-500 border-slate-300 rounded-lg cursor-pointer"
                            />
                            <label
                                htmlFor="terms"
                                className="ml-2 block text-sm text-slate-600 dark:text-slate-400 font-medium cursor-pointer"
                            >
                                I agree to the <a href="#" className="text-emerald-600 font-bold hover:underline">Terms & Conditions</a>
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
                                <span className="flex items-center justify-center gap-2">
                                    Create Free Account <CheckCircle2 className="size-5" />
                                </span>
                            )}
                        </Button>
                    </form>

                    <div className="mt-10 pt-8 border-t border-slate-100 dark:border-slate-800 text-center space-y-6">
                        <p className="text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
                            Already have an account?{" "}
                            <Link
                                to="/login"
                                className="font-bold text-emerald-600 hover:text-emerald-500 transition-colors"
                            >
                                Sign In
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
