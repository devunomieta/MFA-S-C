import { useState } from "react";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Plan, UserPlan } from "@/types";
import { Link } from "react-router-dom";
import { Droplets, Calendar, CheckCircle, RefreshCw } from "lucide-react";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

interface DailyDropPlanCardProps {
    plan: Plan;
    userPlan?: UserPlan;
    onJoin: () => void; // Used to refresh parent list
    onDeposit: () => void;
}

export function DailyDropPlanCard({ plan, userPlan, onJoin, onDeposit }: DailyDropPlanCardProps) {
    const isJoined = !!userPlan;
    const metadata = userPlan?.plan_metadata || {};

    const daysPaid = metadata.total_days_paid || 0;
    const selectedDuration = metadata.selected_duration || 31; // Default fallback
    const fixedAmount = metadata.fixed_amount || 0;

    // Join State
    const [joinAmount, setJoinAmount] = useState<string>("500");
    const [joinDuration, setJoinDuration] = useState<string>("31");
    const [joining, setJoining] = useState(false);

    const isFinished = selectedDuration !== -1 && daysPaid >= selectedDuration;

    const formatCurrency = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'NGN' }).format(val);

    const handleJoin = async () => {
        const amt = parseFloat(joinAmount);
        if (isNaN(amt) || amt < 500) {
            toast.error("Minimum daily amount is ₦500");
            return;
        }

        if (!confirm(`Confirm setup?\n\nDaily Amount: ${formatCurrency(amt)}\nDuration: ${joinDuration === '-1' ? 'Continuous' : joinDuration + ' Days'}\n\nFirst payment of ${formatCurrency(amt)} will be charged immediately as a ONE-TIME SERVICE FEE.`)) return;

        setJoining(true);

        const { error } = await supabase.from('user_plans').insert({
            user_id: (await supabase.auth.getUser()).data.user?.id,
            plan_id: plan.id,
            status: 'active',
            plan_metadata: {
                fixed_amount: amt,
                selected_duration: parseInt(joinDuration),
                total_days_paid: 0,
                last_payment_date: null
            },
            current_balance: 0
        });

        if (error) {
            toast.error("Failed to join: " + error.message);
        } else {
            // Trigger First Payment (Service Charge)
            // We need to trigger the Deposit Modal or handle it here?
            // The user requirement says "first payment is deducted for this purpose". 
            // Usually 'Join' acts as just setup, then they deposit. 
            // BUT: "Charge: The selected fixed amount is automatically the charge and the first payment is deducted for this purpose."
            // Let's assume they join, then they must make a deposit. The SQL logic handles the first deposit as fee.
            toast.success("Plan Setup! Please make your first deposit to pay the Service Fee.");
            onJoin();
        }
        setJoining(false);
    };

    const handleRejoin = async () => {
        if (!confirm("Rejoin logic will archive this plan and start fresh. Continue?")) return;
        // Currently we just archiving logic or creating a new entry?
        // Simpler: Reset metadata
        // For MVP: We delete the old user_plan or set status to 'archived' and create new.
        // Let's just reset

        const { error } = await supabase.from('user_plans').update({
            status: 'archived'
        }).eq('id', userPlan?.id);

        if (error) toast.error("Failed to archive old plan");
        else {
            toast.success("Plan archived. You can now start fresh.");
            onJoin(); // Refresh
        }
    };

    return (
        <Card className="flex flex-col dark:bg-gray-800 dark:border-gray-700 relative overflow-hidden ring-1 ring-cyan-100 hover:shadow-lg transition-all duration-300">
            {/* Badge */}
            <div className="absolute top-0 right-0 bg-cyan-600 text-white text-[10px] uppercase font-bold px-3 py-1 rounded-bl-lg z-20">
                Daily Drop
            </div>

            <CardHeader className="pb-2 relative z-10">
                <div className="flex items-start gap-4">
                    <div className="bg-cyan-100 p-2 rounded-full">
                        <Droplets className="w-5 h-5 text-cyan-600" />
                    </div>
                    <div>
                        <CardTitle className="text-xl font-bold text-gray-900 dark:text-white">{plan.name}</CardTitle>
                        <CardDescription className="text-xs mt-1">
                            {isJoined ?
                                (isFinished ? "Completed!" : `Day ${daysPaid + 1} of ${selectedDuration === -1 ? 'Infinity' : selectedDuration}`)
                                : "Flexible Daily Savings"}
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="flex-1 space-y-4 relative z-10">
                {!isJoined ? (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-xs">Fixed Daily Amount (₦)</Label>
                            <Input
                                type="number"
                                value={joinAmount}
                                onChange={(e) => setJoinAmount(e.target.value)}
                                min={500}
                            />
                            <p className="text-[10px] text-slate-500">Minimum ₦500. This amount is fixed.</p>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs">Duration</Label>
                            <Select value={joinDuration} onValueChange={setJoinDuration}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="31">31 Days (1 Month)</SelectItem>
                                    <SelectItem value="62">62 Days (2 Months)</SelectItem>
                                    <SelectItem value="93">93 Days (3 Months)</SelectItem>
                                    <SelectItem value="-1">No End Date (Continuous)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="bg-cyan-50 p-2 rounded text-xs text-cyan-800 border border-cyan-100">
                            <strong>Note:</strong> First payment = Service Fee (100% of daily amount). No penalty for missing days, but consistency is key!
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {isFinished ? (
                            <div className="text-center py-6">
                                <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
                                <h3 className="font-bold text-emerald-700">Goal Achieved!</h3>
                                <p className="text-xs text-slate-600 mb-4">You have completed your {selectedDuration} day cycle.</p>
                                <Button onClick={handleRejoin} variant="outline" className="w-full border-cyan-500 text-cyan-600 hover:bg-cyan-50">
                                    <RefreshCw className="w-4 h-4 mr-2" /> REJOIN
                                </Button>
                            </div>
                        ) : (
                            <>
                                <div className="space-y-1">
                                    <div className="flex justify-between text-xs text-slate-500">
                                        <span>Progress</span>
                                        <span>{daysPaid} / {selectedDuration === -1 ? '∞' : selectedDuration} Days</span>
                                    </div>
                                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-cyan-500 transition-all duration-500"
                                            style={{ width: `${selectedDuration === -1 ? 100 : Math.min((daysPaid / selectedDuration) * 100, 100)}%` }}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-center">
                                    <div className="p-2 bg-slate-50 rounded border border-slate-100">
                                        <span className="block text-[10px] text-slate-400 uppercase">Fixed Daily</span>
                                        <span className="font-bold text-slate-700">{formatCurrency(fixedAmount)}</span>
                                    </div>
                                    <div className="p-2 bg-slate-50 rounded border border-slate-100">
                                        <span className="block text-[10px] text-slate-400 uppercase">Total Saved</span>
                                        <span className="font-bold text-emerald-600">{formatCurrency(userPlan?.current_balance || 0)}</span>
                                    </div>
                                </div>

                                <div className="text-xs text-center text-slate-400">
                                    Next Drop Due: <b>11:59 PM Daily</b>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </CardContent>

            <CardFooter className="pt-2">
                {!isJoined ? (
                    <Button onClick={handleJoin} disabled={joining} className="w-full bg-cyan-600 hover:bg-cyan-700 text-white shadow-md">
                        {joining ? 'Setting up...' : 'Start Daily Drop'}
                    </Button>
                ) : !isFinished && (
                    <div className="w-full grid grid-cols-2 gap-2">
                        <Button
                            className="w-full bg-gray-900 text-white hover:bg-gray-800"
                            onClick={onDeposit}
                        >
                            Drop Funds
                        </Button>
                        <Button variant="outline" asChild className="w-full">
                            <Link to={`/dashboard/wallet?planId=${userPlan?.plan.id}`}>Details</Link>
                        </Button>
                    </div>
                )}
            </CardFooter>
        </Card>
    );
}
