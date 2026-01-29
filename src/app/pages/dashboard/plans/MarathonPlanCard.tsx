import { useState } from "react";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Plan, UserPlan } from "@/types";
import { Link } from "react-router-dom";
import { Trophy, Calendar, AlertTriangle, CheckCircle, ArrowRight, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

interface MarathonPlanCardProps {
    plan: Plan;
    userPlan?: UserPlan; // If user has joined
    onJoin: () => void;
    onDeposit: () => void;
}

export function MarathonPlanCard({ plan, userPlan, onJoin, onDeposit }: MarathonPlanCardProps) {
    const [extending, setExtending] = useState(false);
    const isJoined = !!userPlan;
    const metadata = userPlan?.plan_metadata || {};
    const duration = metadata.selected_duration || plan.config?.durations?.[1] || 48; // Default max
    const weeksPaid = metadata.total_weeks_paid || 0;
    const isCurrentWeekPaid = metadata.current_week_paid;
    const arrears = metadata.arrears_amount || 0;

    const progress = Math.min((weeksPaid / duration) * 100, 100);

    const formatCurrency = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'NGN' }).format(val);

    const handleExtend = async () => {
        if (!userPlan) return;
        if (!confirm("Are you sure you want to extend your challenge to 48 weeks? This cannot be reversed.")) return;

        setExtending(true);
        const newMeta = { ...metadata, selected_duration: 48 };

        const { error } = await supabase
            .from('user_plans')
            .update({ plan_metadata: newMeta })
            .eq('id', userPlan.id);

        if (error) {
            toast.error("Failed to extend plan");
        } else {
            toast.success("Plan extended to 48 weeks! Keep going!");
            // Ideally we should trigger a refresh here, but the parent uses realtime subscription so it might auto-update.
            // If not, a page reload or passing a refresh callback would be needed. 
            // For now, prompt user.
            window.location.reload();
        }
        setExtending(false);
    };

    return (
        <Card className="flex flex-col dark:bg-gray-800 dark:border-gray-700 relative overflow-hidden ring-1 ring-emerald-100 hover:shadow-lg transition-all duration-300">
            {/* Marathon Badge */}
            <div className="absolute top-0 right-0 bg-emerald-600 text-white text-[10px] uppercase font-bold px-3 py-1 rounded-bl-lg z-20">
                Marathon
            </div>

            <CardHeader className="pb-2 relative z-10">
                <div className="flex items-start gap-4">
                    <div className="bg-emerald-100 p-2 rounded-full">
                        <Trophy className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                        <CardTitle className="text-xl font-bold text-gray-900 dark:text-white">{plan.name}</CardTitle>
                        <CardDescription className="text-xs mt-1">
                            {isJoined ? `${weeksPaid} of ${duration} Weeks Completed` : plan.description}
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="flex-1 space-y-4 relative z-10">
                {!isJoined ? (
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Calendar className="w-4 h-4 text-emerald-500" />
                            <span>Starts 3rd Week of January</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                            <CheckCircle className="w-4 h-4 text-emerald-500" />
                            <span>Strict Weekly Saves: {formatCurrency(plan.min_amount)}</span>
                        </div>
                        <div className="bg-emerald-50 p-2 rounded text-xs text-emerald-800 border border-emerald-100 italic">
                            Running since Jan 2026. You can still join!
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* Status Indicators */}
                        {arrears > 0 && (
                            <div className="flex items-center gap-2 p-2 bg-red-50 text-red-700 rounded text-xs border border-red-100 animate-pulse">
                                <AlertTriangle className="w-4 h-4" />
                                <span>Arrears: {formatCurrency(arrears)}</span>
                            </div>
                        )}

                        <div className="space-y-1">
                            <div className="flex justify-between text-xs text-slate-500">
                                <span>Progress</span>
                                <span>{Math.round(progress)}%</span>
                            </div>
                            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${progress}%` }} />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-center">
                            <div className="p-2 bg-slate-50 rounded border border-slate-100">
                                <span className="block text-[10px] text-slate-400 uppercase">Saved</span>
                                <span className="font-bold text-slate-800">{formatCurrency(userPlan?.current_balance || 0)}</span>
                            </div>
                            <div className="p-2 bg-slate-50 rounded border border-slate-100">
                                <span className="block text-[10px] text-slate-400 uppercase">This Week</span>
                                <span className={`font-bold ${isCurrentWeekPaid ? 'text-emerald-600' : 'text-amber-600'}`}>
                                    {isCurrentWeekPaid ? 'Paid' : 'Pending'}
                                </span>
                            </div>
                        </div>

                        {/* Extension Option */}
                        {duration === 30 && (
                            <div className="pt-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="w-full text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                    onClick={handleExtend}
                                    disabled={extending}
                                >
                                    {extending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <ArrowRight className="w-3 h-3 mr-1" />}
                                    Extend to 48 Weeks
                                </Button>
                            </div>
                        )}
                    </div>
                )}
            </CardContent>

            <CardFooter className="pt-2">
                {!isJoined ? (
                    <Button onClick={onJoin} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-md">
                        Join Challenge
                    </Button>
                ) : (
                    <div className="w-full grid grid-cols-2 gap-2">
                        <Button
                            className="w-full bg-gray-900 text-white hover:bg-gray-800"
                            onClick={onDeposit}
                        >
                            {arrears > 0 ? "Pay Arrears" : "Add Funds"}
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
