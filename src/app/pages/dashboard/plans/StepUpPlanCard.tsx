import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Plan, UserPlan } from "@/types";
import { Link } from "react-router-dom";
import { TrendingUp, CheckCircle, AlertTriangle, RotateCcw } from "lucide-react";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { Label } from "@/app/components/ui/label";

interface StepUpPlanCardProps {
    plan: Plan;
    userPlan?: UserPlan;
    onJoin: (planId: string, amount: number, duration: number) => void;
    onDeposit: () => void;
}

const DURATIONS = [10, 15, 20];
const AMOUNTS = [5000, 10000, 15000, 20000, 25000, 30000, 40000, 50000];

export function StepUpPlanCard({ plan, userPlan, onJoin, onDeposit }: StepUpPlanCardProps) {
    const isJoined = !!userPlan;
    const isCompleted = userPlan?.status === 'completed';
    const metadata = userPlan?.plan_metadata || {};

    // Selection State
    const [selectedDuration, setSelectedDuration] = useState<string>("10");
    const [selectedAmount, setSelectedAmount] = useState<string>("5000");

    // Metadata
    const totalDuration = metadata.selected_duration || 0;
    const weeksCompleted = metadata.weeks_completed || 0;
    const weekPaidSoFar = metadata.week_paid_so_far || 0;
    const fixedAmount = metadata.fixed_amount || 0;
    const arrears = metadata.arrears_amount || 0;

    const formatCurrency = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'NGN' }).format(val);

    const handleJoin = () => {
        onJoin(plan.id, Number(selectedAmount), Number(selectedDuration));
    };

    // Calculate Progress
    const progress = totalDuration > 0 ? Math.min((weeksCompleted / totalDuration) * 100, 100) : 0;
    const weekProgress = fixedAmount > 0 ? Math.min((weekPaidSoFar / fixedAmount) * 100, 100) : 0;

    return (
        <Card className="flex flex-col dark:bg-gray-800 dark:border-gray-700 relative overflow-hidden ring-1 ring-purple-100 hover:shadow-lg transition-all duration-300">
            {/* Badge */}
            <div className="absolute top-0 right-0 bg-purple-600 text-white text-[10px] uppercase font-bold px-3 py-1 rounded-bl-lg z-20">
                Step-Up
            </div>

            <CardHeader className="pb-2 relative z-10">
                <div className="flex items-start gap-4">
                    <div className="bg-purple-100 p-2 rounded-full">
                        <TrendingUp className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                        <CardTitle className="text-xl font-bold text-gray-900 dark:text-white">{plan.name}</CardTitle>
                        <CardDescription className="text-xs mt-1">
                            {isJoined ? `Week ${weeksCompleted + 1} of ${totalDuration}` : "Structured Weekly Growth"}
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="flex-1 space-y-4 relative z-10">
                {!isJoined ? (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label className="text-xs text-gray-500">Duration (Weeks)</Label>
                                <Select value={selectedDuration} onValueChange={setSelectedDuration}>
                                    <SelectTrigger className="h-8 text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {DURATIONS.map(d => (
                                            <SelectItem key={d} value={d.toString()}>{d} Weeks</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs text-gray-500">Fixed Amount</Label>
                                <Select value={selectedAmount} onValueChange={setSelectedAmount}>
                                    <SelectTrigger className="h-8 text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {AMOUNTS.map(a => (
                                            <SelectItem key={a} value={a.toString()}>{formatCurrency(a)}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2 pt-2">
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                                <CheckCircle className="w-4 h-4 text-purple-500" />
                                <span>Strict withdrawal at end of term</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                                <CheckCircle className="w-4 h-4 text-purple-500" />
                                <span>Missed week penalty: {formatCurrency(500)}</span>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* Rejoin / Completed State */}
                        {isCompleted ? (
                            <div className="bg-emerald-50 border border-emerald-100 p-4 rounded text-center space-y-2">
                                <h3 className="text-emerald-800 font-bold">Plan Completed! 🎉</h3>
                                <p className="text-xs text-emerald-600">You have successfully completed your Step-Up plan.</p>
                                <Button size="sm" onClick={handleJoin} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
                                    <RotateCcw className="w-4 h-4 mr-2" />
                                    Rejoin Step-Up
                                </Button>
                            </div>
                        ) : (
                            <>
                                {/* Active State */}
                                {arrears > 0 && (
                                    <div className="flex items-center gap-2 p-2 bg-red-50 text-red-700 rounded text-xs border border-red-100 animate-pulse">
                                        <AlertTriangle className="w-4 h-4" />
                                        <span>Arrears: {formatCurrency(arrears)}</span>
                                    </div>
                                )}

                                <div className="space-y-1">
                                    <div className="flex justify-between text-xs text-slate-500">
                                        <span>Total Progress</span>
                                        <span>{weeksCompleted}/{totalDuration} Wks</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-purple-500 transition-all duration-500" style={{ width: `${progress}%` }} />
                                    </div>
                                </div>

                                <div className="p-3 bg-slate-50 rounded border border-slate-100 space-y-2">
                                    <div className="flex justify-between text-xs font-semibold text-slate-700">
                                        <span>This Week</span>
                                        <span>{weekPaidSoFar >= fixedAmount ? 'Goal Met 🌟' : `${formatCurrency(weekPaidSoFar)} / ${formatCurrency(fixedAmount)}`}</span>
                                    </div>
                                    <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full transition-all duration-500 ${weekPaidSoFar >= fixedAmount ? 'bg-emerald-500' : 'bg-purple-500'}`}
                                            style={{ width: `${weekProgress}%` }}
                                        />
                                    </div>
                                    <p className="text-[10px] text-slate-400 text-center">Resets Sunday 11:59PM</p>
                                </div>

                                <div className="text-center">
                                    <span className="block text-[10px] text-slate-400 uppercase">Total Saved</span>
                                    <span className="font-bold text-slate-800 text-lg">{formatCurrency(userPlan?.current_balance || 0)}</span>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </CardContent>

            <CardFooter className="pt-2">
                {!isJoined ? (
                    <Button onClick={handleJoin} className="w-full bg-purple-600 hover:bg-purple-700 text-white shadow-md">
                        Start Step-Up
                    </Button>
                ) : (
                    !isCompleted && (
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
                    )
                )}
            </CardFooter>
        </Card>
    );
}
