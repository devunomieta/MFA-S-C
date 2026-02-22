import { useState } from "react";
import { Button } from "@/app/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/app/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { Label } from "@/app/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/app/context/AuthContext";
import { Plan } from "@/types";
import { logActivity } from "@/lib/activity";

interface MarathonJoinModalProps {
    plan: Plan;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function MarathonJoinModal({ plan, isOpen, onClose, onSuccess }: MarathonJoinModalProps) {
    const { user } = useAuth();
    const [duration, setDuration] = useState<string>("");
    const [loading, setLoading] = useState(false);

    const handleJoin = async () => {
        if (!user || !duration) return;
        setLoading(true);

        // 1. Calculate Target End Date (rough approx, server logic handles precise cycles)
        const weeks = parseInt(duration);
        const startDate = new Date(); // Or fetched from plan config if strictly Jan 3rd week
        const targetDate = new Date(startDate);
        targetDate.setDate(startDate.getDate() + (weeks * 7));

        // 2. Insert User Plan with Metadata
        const { error } = await supabase.from("user_plans").insert({
            user_id: user.id,
            plan_id: plan.id,
            current_balance: 0,
            status: 'active',
            plan_metadata: {
                selected_duration: weeks,
                target_end_date: targetDate.toISOString(),
                total_weeks_paid: 0,
                current_week_paid: false,
                missed_weeks: 0,
                arrears_amount: 0
            }
        });

        if (error) {
            toast.error("Failed to join Marathon plan: " + error.message);
        } else {
            logActivity({
                userId: user.id,
                action: 'PLAN_JOIN',
                details: {
                    plan_name: plan.name,
                    display_name: user.user_metadata?.full_name?.split(' ')[0] || 'A user'
                }
            });
            toast.success(`Welcome to the ${weeks}-Week Marathon! Make your first deposit to start.`);
            onSuccess();
            onClose();
        }
        setLoading(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Join Marathon Target Savings</DialogTitle>
                    <DialogDescription>
                        Select your challenge duration. You must deposit ₦3,000 weekly.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <Label>Select Duration</Label>
                        <Select onValueChange={setDuration} value={duration}>
                            <SelectTrigger>
                                <SelectValue placeholder="Choose duration" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="30">30 Weeks (Short Marathon)</SelectItem>
                                <SelectItem value="48">48 Weeks (Full Marathon)</SelectItem>
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-slate-500">
                            You cannot change this later. Withdrawal only at the end of the selected period.
                        </p>
                    </div>

                    <div className="rounded-md bg-amber-50 p-3 text-sm text-amber-800 border border-amber-200">
                        <p className="font-bold mb-1">Important Rules:</p>
                        <ul className="list-disc list-inside space-y-1 text-xs">
                            <li>Minimum weekly deposit: ₦3,000</li>
                            <li>Weekly resets on Sunday 11:59 PM.</li>
                            <li>Missed weeks incur a ₦500 penalty.</li>
                            <li>No withdrawals until maturity.</li>
                        </ul>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
                    <Button onClick={handleJoin} disabled={!duration || loading} className="bg-emerald-600 hover:bg-emerald-700">
                        {loading ? "Joining..." : "Start Challenge"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
