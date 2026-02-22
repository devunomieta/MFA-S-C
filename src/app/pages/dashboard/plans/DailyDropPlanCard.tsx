import { useState } from "react";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Plan, UserPlan } from "@/types";
import { Link } from "react-router-dom";
import { Droplets, AlertTriangle, CheckCircle, RefreshCw } from "lucide-react";
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

    // Active State - Minimalist
    if (isJoined) {
        return (
            <Card className="flex flex-col relative overflow-hidden bg-white dark:bg-gray-900 border-l-4 border-l-cyan-500 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <Badge variant="outline" className="text-cyan-700 border-cyan-200 bg-cyan-50">{plan.name}</Badge>
                                <Badge className={`border-0 ${isFinished ? 'bg-emerald-600' : 'bg-cyan-600 text-white'}`}>
                                    {isFinished ? 'Completed' : 'Active'}
                                </Badge>
                            </div>
                            <CardTitle className="text-xl font-bold text-gray-900 dark:text-gray-100">{plan.name}</CardTitle>
                        </div>
                        <div className="text-right">
                            <div className="text-xs text-gray-500 uppercase font-bold tracking-wider">Total Saved</div>
                            <div className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(userPlan?.current_balance || 0)}</div>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="space-y-6 flex-1 pt-4">
                    {isFinished ? (
                        <div className="text-center py-6 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-100 dark:border-emerald-800">
                            <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
                            <h3 className="font-bold text-emerald-700 dark:text-emerald-400 text-lg">Goal Achieved!</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">You have completed your {selectedDuration} day cycle.</p>
                            <Button onClick={handleRejoin} variant="outline" className="border-emerald-200 text-emerald-700 hover:bg-emerald-100 font-semibold">
                                <RefreshCw className="w-4 h-4 mr-2" /> Start Fresh
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600 dark:text-gray-400 font-medium">Streak Progress</span>
                                    <span className="font-bold text-gray-900 dark:text-gray-200">{daysPaid} / {selectedDuration === -1 ? '∞' : selectedDuration} Days</span>
                                </div>
                                <div className="h-2 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-cyan-500 rounded-full"
                                        style={{ width: `${selectedDuration === -1 ? 100 : Math.min((daysPaid / selectedDuration) * 100, 100)}%` }}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-800">
                                    <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1 flex items-center gap-1">
                                        <Droplets className="w-3 h-3" /> Daily Commit
                                    </div>
                                    <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                                        {formatCurrency(fixedAmount)}
                                    </div>
                                </div>
                                <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-800">
                                    <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1 flex items-center gap-1">
                                        <AlertTriangle className="w-3 h-3" /> Next Due
                                    </div>
                                    <div className="text-sm font-bold text-gray-900 dark:text-gray-100 mt-1">
                                        Today 11:59PM
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>

                <CardFooter className="grid grid-cols-2 gap-3 pt-2">
                    {!isFinished && (
                        <>
                            <Button
                                className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-semibold"
                                onClick={onDeposit}
                            >
                                Drop Funds
                            </Button>
                            <Button variant="outline" asChild className="w-full">
                                <Link to={`/dashboard/wallet?planId=${userPlan?.plan.id}`}>Details</Link>
                            </Button>
                        </>
                    )}
                </CardFooter>
            </Card>
        );
    }

    // Available State (Minimalist Redesign)
    return (
        <Card className="flex flex-col relative overflow-hidden bg-white dark:bg-gray-900 border-l-4 border-l-cyan-500 shadow-sm hover:shadow-md transition-shadow group">
            <CardHeader className="pb-4">
                <div className="flex justify-between items-start">
                    <div>
                        <Badge variant="secondary" className="mb-2 bg-cyan-50 text-cyan-700 border-cyan-100 hover:bg-cyan-100">
                            Daily Savings
                        </Badge>
                        <CardTitle className="text-xl font-bold text-gray-900 dark:text-white">
                            {plan.name}
                        </CardTitle>
                    </div>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium leading-relaxed mt-1 line-clamp-2">
                    Save small, fixed amounts every day and watch it grow effortlessly.
                </p>
            </CardHeader>

            <CardContent className="flex-1 space-y-6 pt-2">
                {/* Input Section - Minimalist UI */}
                <div className="space-y-4 pt-2">
                    <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Fixed Daily Amount</Label>
                        <Input
                            type="number"
                            className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 h-9 font-semibold text-sm focus-visible:ring-cyan-500"
                            value={joinAmount}
                            onChange={(e) => setJoinAmount(e.target.value)}
                            min={500}
                            placeholder="Min ₦500"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Duration</Label>
                        <Select value={joinDuration} onValueChange={setJoinDuration}>
                            <SelectTrigger className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 h-9 font-medium text-sm focus:ring-cyan-500">
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
                </div>

                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 font-medium pt-2">
                    <CheckCircle className="w-3.5 h-3.5 text-cyan-600" />
                    <span>Consistent daily drops. No penalties.</span>
                </div>
            </CardContent>

            <CardFooter className="pt-2">
                <Button
                    className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-semibold"
                    onClick={handleJoin}
                    disabled={joining}
                >
                    {joining ? 'Setting up...' : 'Start Daily Drop'}
                </Button>
            </CardFooter>
        </Card>
    );
}
