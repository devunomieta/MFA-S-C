import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { PasswordInput } from "@/app/components/ui/PasswordInput";
import { Label } from "@/app/components/ui/label";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export function Signup() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        email: "",
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
            const { data, error } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.password,
                options: {
                    data: {
                        full_name: formData.name,
                    },
                },
            });

            if (error) throw error;

            if (error) throw error;

            if (data.session) {
                toast.success("Account created");
                navigate("/dashboard");
            } else if (data.user) {
                // Session is null but user exists -> email confirmation required
                toast.success("Account created");
                // If email verification is on, strict routing to dashboard might not make sense without session, 
                // but user asked for "reroute to dashboard". 
                // Since they can't do anything without session, maybe redirect to login or dashboard (which will kick them out to login if protected).
                // Let's stick to the previous logic of login for verification flow, OR force dashboard if that's what they want (but ProtectedRoute will block).
                // I will keep the routing logic sensible but update the text.
                // Actually user said "Account created and then reroute to dashboard".
                // If I route to dashboard and they aren't logged in, they get kicked back to login.
                // Let's assume they might mean the "happy path" (session active).
                // I'll leave the verification flow pointing to login to avoid confusion loop, or just point to dashboard which redirects.
                navigate("/dashboard");
            }
        } catch (error: any) {
            toast.error(error.message || "Failed to create account");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-50 transition-colors">
            <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg border border-gray-100">
                <div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                        Create your account
                    </h2>
                    <p className="mt-2 text-center text-sm text-gray-600">
                        Already have an account?{" "}
                        <Link
                            to="/login"
                            className="font-medium text-emerald-600 hover:text-emerald-500"
                        >
                            Sign in
                        </Link>
                    </p>
                </div>
                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="full-name">Full Name</Label>
                            <Input
                                id="full-name"
                                name="name"
                                type="text"
                                autoComplete="name"
                                required
                                className="mt-1"
                                placeholder="John Doe"
                                value={formData.name}
                                onChange={handleChange}
                            />
                        </div>
                        <div>
                            <Label htmlFor="email-address">Email address</Label>
                            <Input
                                id="email-address"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                className="mt-1"
                                placeholder="you@example.com"
                                value={formData.email}
                                onChange={handleChange}
                            />
                        </div>
                        <div>
                            <Label htmlFor="password">Password</Label>
                            <PasswordInput
                                id="password"
                                name="password"
                                autoComplete="new-password"
                                required
                                className="mt-1"
                                placeholder="••••••••"
                                value={formData.password}
                                onChange={handleChange}
                            />
                        </div>
                        <div>
                            <Label htmlFor="confirm-password">Confirm Password</Label>
                            <PasswordInput
                                id="confirm-password"
                                name="confirmPassword"
                                autoComplete="new-password"
                                required
                                className="mt-1"
                                placeholder="••••••••"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                            />
                            {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                                <p className="mt-1 text-sm text-red-500 font-medium">
                                    Passwords do not match
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center">
                        <input
                            id="terms"
                            name="terms"
                            type="checkbox"
                            className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                            required
                        />
                        <label
                            htmlFor="terms"
                            className="ml-2 block text-sm text-gray-900"
                        >
                            I agree to the{" "}
                            <a href="#" className="text-emerald-600 hover:text-emerald-500">
                                Terms and Conditions
                            </a>
                        </label>
                    </div>

                    <Button
                        type="submit"
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                        disabled={loading}
                    >
                        {loading ? "Creating account..." : "Sign up"}
                    </Button>
                </form>
            </div>
        </div>
    );
}
