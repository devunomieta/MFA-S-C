import { useState, useRef, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/app/components/ui/dialog";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { ShieldAlert, KeyRound, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

interface AdminActionAuthModalProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onAuthenticated: () => void;
    title?: string;
    description?: string;
    actionLabel?: string;
}

export function AdminActionAuthModal({
    isOpen,
    onOpenChange,
    onAuthenticated,
    title = "Identity Verification Required",
    description = "Please enter your dedicated Administration PIN to authorize this sensitive action.",
    actionLabel = "Authorize Action"
}: AdminActionAuthModalProps) {
    const [pin, setPin] = useState("");
    const [isVerifying, setIsVerifying] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            setPin("");
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    const handleVerify = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!pin) return;

        setIsVerifying(true);
        try {
            const { data, error } = await supabase
                .from('app_settings')
                .select('value')
                .eq('key', 'security')
                .single();

            if (error) throw new Error("Could not verify PIN. System error.");
            
            const storedPin = data?.value?.admin_pin;
            if (storedPin && pin === storedPin) {
                toast.success("Identity verified successfully");
                onAuthenticated();
                onOpenChange(false);
            } else {
                toast.error("Invalid Administration PIN. Access denied.");
                setPin("");
            }
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setIsVerifying(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[400px] border-slate-200">
                <DialogHeader className="items-center text-center">
                    <div className="size-12 rounded-full bg-emerald-50 flex items-center justify-center mb-2">
                        <KeyRound className="size-6 text-emerald-600" />
                    </div>
                    <DialogTitle className="text-xl font-bold text-slate-900">{title}</DialogTitle>
                    <DialogDescription className="text-slate-500">
                        {description}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleVerify} className="space-y-6 py-4">
                    <div className="flex justify-center">
                        <div className="relative w-full max-w-[200px]">
                            <Input
                                ref={inputRef}
                                type="password"
                                placeholder="••••"
                                maxLength={6}
                                value={pin}
                                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                                className="text-center text-3xl tracking-[1em] h-14 font-black border-2 border-slate-200 focus:border-emerald-500 focus:ring-emerald-500 transition-all"
                                autoComplete="off"
                                disabled={isVerifying}
                            />
                        </div>
                    </div>

                    <div className="bg-slate-50 rounded-lg p-3 flex gap-3 border border-slate-100 italic">
                        <ShieldAlert className="size-5 text-amber-600 shrink-0 mt-0.5" />
                        <p className="text-xs text-slate-600">
                            Authentication is logged and tied to your administrator account for auditing purposes.
                        </p>
                    </div>

                    <DialogFooter className="sm:justify-center mt-2">
                        <Button
                            type="submit"
                            disabled={isVerifying || pin.length < 4}
                            className="w-full bg-slate-900 hover:bg-slate-800 text-white shadow-xl h-11"
                        >
                            {isVerifying ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying...</>
                            ) : (
                                actionLabel
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
