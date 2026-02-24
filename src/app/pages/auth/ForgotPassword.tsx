import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Link } from "react-router-dom";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export function ForgotPassword() {
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState("");
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/update-password`,
            });

            if (error) throw error;

            setSubmitted(true);
            toast.success("Password reset email sent!");
        } catch (error: any) {
            console.error("Password Reset Error:", error);
            // Harden error handling to prevent toasting "{}" or "null"
            let errorMessage = "Failed to send reset email";

            // Extract all possible info
            const details = error?.message || error?.error_description;

            if (details) {
                errorMessage = details;
            } else if (typeof error === 'string') {
                errorMessage = error;
            } else {
                // Handle objects like AuthRetryableFetchError
                errorMessage = "Connection issue with the authentication server. Please try again later.";
            }

            // Final safety check for "{}" or "[object Object]"
            if (errorMessage.includes("{}") || errorMessage.includes("[object Object]") || errorMessage === "Failed to send reset email") {
                errorMessage = `Authentication server timeout (504). This usually means the email service is temporarily unavailable. Please contact support.`;
            }

            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    if (submitted) {
        return (
            <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
                <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg border border-gray-100 text-center">
                    <div>
                        <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
                            Check your email
                        </h2>
                        <p className="mt-2 text-sm text-gray-600">
                            We have sent a password reset link to <strong>{email}</strong>.
                        </p>
                    </div>
                    <div className="mt-6">
                        <Link to="/login">
                            <Button variant="outline" className="w-full">
                                Back to Login
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
            <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg border border-gray-100">
                <div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                        Reset your password
                    </h2>
                    <p className="mt-2 text-center text-sm text-gray-600">
                        Enter your email address and we'll send you a link to reset your password.
                    </p>
                </div>
                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
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
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>

                    <Button
                        type="submit"
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                        disabled={loading}
                    >
                        {loading ? "Sending link..." : "Send Reset Link"}
                    </Button>

                    <div className="text-center">
                        <Link
                            to="/login"
                            className="font-medium text-emerald-600 hover:text-emerald-500"
                        >
                            Back to Sign in
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
}
