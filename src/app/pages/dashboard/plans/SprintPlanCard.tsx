import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Plan, UserPlan } from "@/types";
import { Link } from "react-router-dom";
import { Timer, Zap, AlertTriangle, CheckCircle } from "lucide-react";

interface SprintPlanCardProps {
    plan: Plan;
    userPlan?: UserPlan;
    onJoin: () => void;
    onDeposit: () => void;
}

export function SprintPlanCard({ plan, userPlan, onJoin, onDeposit }: SprintPlanCardProps) {
    const isJoined = !!userPlan;
    const metadata = userPlan?.plan_metadata || {};

    // Sprint specific metadata
    const weeksCompleted = metadata.weeks_completed || 0;
    const currentWeekTotal = metadata.current_week_total || 0;
    const arrears = metadata.arrears_amount || 0;
    const duration = 30;

    const weeklyTarget = 3000;
    const progress = Math.min((weeksCompleted / duration) * 100, 100);
    const weekProgress = Math.min((currentWeekTotal / weeklyTarget) * 100, 100);

    const formatCurrency = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'NGN' }).format(val);

    return (
        <Card className="flex flex-col dark:bg-gray-800 dark:border-gray-700 relative overflow-hidden ring-1 ring-blue-100 hover:shadow-lg transition-all duration-300">
            {/* Sprint Badge */}
            <div className="absolute top-0 right-0 bg-blue-600 text-white text-[10px] uppercase font-bold px-3 py-1 rounded-bl-lg z-20">
                Sprint
            </div>

            <CardHeader className="pb-2 relative z-10">
                <div className="flex items-start gap-4">
                    <div className="bg-blue-100 p-2 rounded-full">
                        <Zap className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                        <CardTitle className="text-xl font-bold text-gray-900 dark:text-white">{plan.name}</CardTitle>
                        <CardDescription className="text-xs mt-1">
                            {isJoined ? `Week ${weeksCompleted + 1} of ${duration}` : "Rolling 30-Week Challenge"}
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="flex-1 space-y-4 relative z-10">
                {!isJoined ? (
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Timer className="w-4 h-4 text-blue-500" />
                            <span>Starts <b>Immediately</b> upon joining</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                            <CheckCircle className="w-4 h-4 text-blue-500" />
                            <span>Target: {formatCurrency(3000)} / week</span>
                        </div>
                        <div className="bg-blue-50 p-2 rounded text-xs text-blue-800 border border-blue-100">
                            Auto-recovery enabled. Miss a week? We catch you up automatically.
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

                        {/* Overall Progress */}
                        <div className="space-y-1">
                            <div className="flex justify-between text-xs text-slate-500">
                                <span>Challenge Progress</span>
                                <span>{weeksCompleted}/{duration} Wks</span>
                            </div>
                            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${progress}%` }} />
                            </div>
                        </div>

                        {/* Weekly Status */}
                        <div className="p-3 bg-slate-50 rounded border border-slate-100 space-y-2">
                            <div className="flex justify-between text-xs font-semibold text-slate-700">
                                <span>This Week</span>
                                <span>{currentWeekTotal >= weeklyTarget ? 'Goal Met 🎉' : `${formatCurrency(currentWeekTotal)} / ${formatCurrency(weeklyTarget)}`}</span>
                            </div>
                            <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                                <div
                                    className={`h-full transition-all duration-500 ${currentWeekTotal >= weeklyTarget ? 'bg-emerald-500' : 'bg-amber-500'}`}
                                    style={{ width: `${weekProgress}%` }}
                                />
                            </div>
                            <p className="text-[10px] text-slate-400 text-center">Resets Sunday 11:59PM</p>
                        </div>

                        <div className="text-center">
                            <span className="block text-[10px] text-slate-400 uppercase">Total Saved</span>
                            <span className="font-bold text-slate-800 text-lg">{formatCurrency(userPlan?.current_balance || 0)}</span>
                        </div>
                    </div>
                )}
            </CardContent>

            <CardFooter className="pt-2">
                {!isJoined ? (
                    <Button onClick={onJoin} className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-md">
                        Start Sprint
                    </Button>
                ) : (
                    <div className="w-full grid grid-cols-2 gap-2">
                        <Button
                            className="w-full bg-gray-900 text-white hover:bg-gray-800"
                            onClick={onDeposit}
                        >
                            {arrears > 0 ? "Clear Arrears" : "Add Funds"}
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
