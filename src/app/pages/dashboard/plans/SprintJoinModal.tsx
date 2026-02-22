import { Button } from "@/app/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/app/components/ui/dialog";
import { Label } from "@/app/components/ui/label";
// import { Checkbox } from "@/app/components/ui/checkbox"; 
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Plan } from "@/types";
import { useAuth } from "@/app/context/AuthContext";
import { logActivity } from "@/lib/activity";

interface GenericJoinModalProps {
    plan: Plan; // Or partial plan details
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    customTitle?: string;
    customTerms?: string[];
}

export function SprintJoinModal({ plan, isOpen, onClose, onSuccess, customTitle, customTerms }: GenericJoinModalProps) {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [agreed, setAgreed] = useState(false);

    const handleJoin = async () => {
        if (!user) return;
        if (!agreed) {
            toast.error("Please agree to the plan rules.");
            return;
        }

        setLoading(true);

        // Initialize Metadata
        const metadata = {
            start_date: new Date().toISOString(),
            current_week_total: 0,
            weeks_completed: 0,
            arrears_amount: 0,
            last_settlement_date: null
        };

        const { error } = await supabase.from('user_plans').insert({
            user_id: user.id,
            plan_id: plan.id,
            current_balance: 0,
            status: 'active',
            plan_metadata: metadata
        });

        if (error) {
            toast.error(`Failed to join ${plan.name}: ` + error.message);
        } else {
            logActivity({
                userId: user.id,
                action: 'PLAN_JOIN',
                details: {
                    plan_name: plan.name,
                    display_name: user.user_metadata?.full_name?.split(' ')[0] || 'A user'
                }
            });
            toast.success(`Welcome to ${plan.name}!`);
            onSuccess();
            onClose();
        }
        setLoading(false);
    };

    const defaultTerms = [
        "Duration: 30 Weeks",
        "Goal: Min. ₦3,000 / week",
        "Settlements: Every Sunday 11:59PM",
        "Penalty: ₦500 for missing a week",
        "Withdrawal: Locked until completion"
    ];

    const displayTerms = customTerms || defaultTerms;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{customTitle || `Join 30-Weeks Saving Sprint`}</DialogTitle>
                    <DialogDescription>
                        Commit to a disciplined savings challenge.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="p-3 bg-slate-50 rounded text-sm space-y-2 text-slate-700">
                        {displayTerms.map((term, idx) => (
                            <p key={idx}>• {term}</p>
                        ))}
                    </div>

                    <div className="flex items-start gap-2">
                        <input
                            type="checkbox"
                            id="agree"
                            className="mt-1"
                            checked={agreed}
                            onChange={e => setAgreed(e.target.checked)}
                        />
                        <Label htmlFor="agree" className="text-xs text-slate-600 leading-tight">
                            I understand the rules. I authorize automatic deductions for missed weeks and understand withdrawals are locked for the duration.
                        </Label>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
                    <Button onClick={handleJoin} disabled={loading || !agreed} className="bg-blue-600 hover:bg-blue-700 text-white">
                        {loading ? "Joining..." : "Start Challenge"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
