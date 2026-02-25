import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Plan, UserPlan } from "@/types";
import { Link } from "react-router-dom";
import { TrendingUp, CheckCircle, AlertTriangle, RotateCcw, Trophy } from "lucide-react";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { Label } from "@/app/components/ui/label";

interface StepUpPlanCardProps {
    plan: Plan;
    userPlan?: UserPlan;
    onJoin: (planId: string, amount: number, duration: number) => void;
    onDeposit: () => void;
    onAdvanceDeposit?: () => void;
    onLeave?: () => void;
}

const DURATIONS = [10, 15, 20];
const AMOUNTS = [5000, 10000, 15000, 20000, 25000, 30000, 40000, 50000];

export function StepUpPlanCard({ plan, userPlan, onJoin, onDeposit, onAdvanceDeposit, onLeave }: StepUpPlanCardProps) {
    const isJoined = !!userPlan;
    const isCompleted = userPlan?.status === 'completed';
    const metadata = userPlan?.plan_metadata || {};

    // Selection State
    const [selectedDuration, setSelectedDuration] = useState<string>("10");
    const [selectedAmount, setSelectedAmount] = useState<string>("5000");

    // Metadata
    const totalDuration = metadata.selected_duration || 10;
    const weeksCompleted = metadata.weeks_completed || 0;
    const weekPaidSoFar = metadata.week_paid_so_far || 0;
    const fixedAmount = metadata.fixed_amount || 0;
    const arrears = metadata.arrears_amount || 0;

    const isTargetMet = weeksCompleted >= totalDuration;
    const formatCurrency = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'NGN' }).format(val);

    const handleJoin = () => {
        onJoin(plan.id, Number(selectedAmount), Number(selectedDuration));
    };

    // Calculate Progress
    const progress = totalDuration > 0 ? Math.min((weeksCompleted / totalDuration) * 100, 100) : 0;
    const weekProgress = isTargetMet ? 100 : (fixedAmount > 0 ? Math.min((weekPaidSoFar / fixedAmount) * 100, 100) : 0);

    const totalSaved = userPlan?.current_balance || 0;
    const totalTarget = fixedAmount * totalDuration;
    const excessAmount = Math.max(0, totalSaved - totalTarget);

    // Active State (Joined) - Minimalist
    if (isJoined) {
        return (
            <Card className="flex flex-col relative overflow-hidden bg-white dark:bg-gray-900 border-l-4 border-l-purple-500 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <Badge variant="outline" className="text-teal-700 border-teal-200 bg-teal-50">{plan.name}</Badge>
                                <Badge className={
                                    userPlan.status === 'pending_activation'
                                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200'
                                        : `border-0 ${isCompleted ? 'bg-emerald-600' : 'bg-teal-900 text-white'}`
                                }>
                                    {userPlan.status === 'pending_activation' ? 'PENDING ACTIVATION' : (isCompleted ? 'Completed' : 'Active')}
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

                <CardContent className="space-y-6 flex-1 pt-4 overflow-y-auto max-h-[60vh] custom-scrollbar">
                    {isCompleted ? (
                        <div className="text-center py-6 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-100 dark:border-emerald-800">
                            <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
                            <h3 className="font-bold text-emerald-700 dark:text-emerald-400 text-lg">Plan Completed! 🎉</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">You have successfully completed your Step-Up plan.</p>
                            <Button onClick={handleJoin} variant="outline" className="border-emerald-200 text-emerald-700 hover:bg-emerald-100 font-semibold">
                                <RotateCcw className="w-4 h-4 mr-2" /> Start Again
                            </Button>
                        </div>
                    ) : (
                        <>
                            <div className="flex flex-col gap-2">
                                {arrears > 0 ? (
                                    <div className="flex items-center gap-2 p-2 bg-red-50 text-red-700 rounded-md text-xs border border-red-100 font-medium">
                                        <AlertTriangle className="w-3.5 h-3.5" />
                                        <span>Arrears: {formatCurrency(arrears)}</span>
                                    </div>
                                ) : isTargetMet ? (
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-2 p-2 bg-emerald-50 text-emerald-700 rounded-md text-xs border border-emerald-100 font-bold">
                                            <Trophy className="w-3.5 h-3.5 text-emerald-500" />
                                            <span>Goal Achieved! You reached your target.</span>
                                        </div>
                                        {excessAmount > 0 && (
                                            <div className="text-[10px] text-emerald-600 font-bold ml-1">
                                                You saved an extra {formatCurrency(excessAmount)}! Congratulations! 🚀
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 p-2 bg-emerald-50 text-emerald-700 rounded-md text-xs border border-emerald-100 font-bold">
                                        <CheckCircle className="w-3.5 h-3.5" />
                                        <span>On Track</span>
                                    </div>
                                )}

                                {weeksCompleted > 0 && !isTargetMet && (
                                    <div className="flex items-center gap-2 p-2 bg-blue-50 text-blue-700 rounded-md text-[10px] border border-blue-100 font-bold">
                                        <RotateCcw className="w-3 h-3 text-blue-500" />
                                        <span>Advance Payment: {weeksCompleted} {weeksCompleted === 1 ? 'Week' : 'Weeks'} Covered</span>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600 dark:text-gray-400 font-medium">Step Progress</span>
                                    <span className="font-bold text-gray-900 dark:text-gray-200">{weeksCompleted} / {totalDuration} Weeks</span>
                                </div>
                                <div className="h-2 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all duration-500 ${isTargetMet ? 'bg-emerald-500' : 'bg-purple-500'}`}
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                            </div>

                            <div className="p-4 bg-gray-50/50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-800">
                                <div className="flex justify-between items-center mb-2">
                                    <div className="flex items-center gap-2">
                                        <TrendingUp className="w-4 h-4 text-purple-500" />
                                        <span className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                                            {isTargetMet ? 'Weekly Status (Goal Met)' : `Week ${weeksCompleted + 1} Progress`}
                                        </span>
                                    </div>
                                    <span className="text-sm font-bold text-purple-600 dark:text-purple-300">
                                        {isTargetMet ? formatCurrency(fixedAmount) : formatCurrency(weekPaidSoFar)} / {formatCurrency(fixedAmount)}
                                    </span>
                                </div>
                                <div className="h-1.5 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-1">
                                    <div
                                        className={`h-full rounded-full transition-all duration-500 ${isTargetMet ? 'bg-emerald-500' : 'bg-purple-500'}`}
                                        style={{ width: `${weekProgress}%` }}
                                    />
                                </div>
                                {!isTargetMet && weeksCompleted > 0 ? (
                                    <div className="flex justify-between text-[10px] text-gray-400 font-medium italic">
                                        <span>Advanced {weeksCompleted} Weeks</span>
                                        <span>Resets Sunday 11:59PM</span>
                                    </div>
                                ) : !isTargetMet && (
                                    <div className="text-[10px] text-gray-400 text-right font-medium italic">Resets Sunday 11:59PM</div>
                                )}
                            </div>
                        </>
                    )}
                </CardContent>

                <CardFooter className="flex flex-col gap-3 pt-2">
                    <div className="grid grid-cols-2 gap-3 w-full">
                        <Button
                            className="w-full bg-gray-900 hover:bg-gray-800 text-white dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
                            onClick={onDeposit}
                        >
                            {arrears > 0 ? "Pay Arrears" : "Add Funds"}
                        </Button>
                        <Button variant="outline" asChild className="w-full">
                            <Link to={`/dashboard/wallet?planId=${userPlan?.plan.id}`}>Details</Link>
                        </Button>
                    </div>
                    {!isCompleted && onAdvanceDeposit && (
                        <Button
                            variant="secondary"
                            className="w-full bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 font-bold"
                            onClick={onAdvanceDeposit}
                        >
                            Pay in Advance
                        </Button>
                    )}
                    {userPlan.status === 'pending_activation' && onLeave && (
                        <Button
                            variant="ghost"
                            className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 text-xs font-semibold"
                            onClick={onLeave}
                        >
                            Leave Plan
                        </Button>
                    )}
                </CardFooter>
            </Card>
        );
    }

    // Available State (Minimalist Redesign)
    return (
        <Card className="flex flex-col relative overflow-hidden bg-white dark:bg-gray-900 border-l-4 border-l-purple-500 shadow-sm hover:shadow-md transition-shadow group">
            <CardHeader className="pb-4">
                <div className="flex justify-between items-start">
                    <div>
                        <Badge variant="secondary" className="mb-2 bg-teal-50 text-teal-700 border-teal-100 hover:bg-teal-100">
                            Fixed Growth
                        </Badge>
                        <CardTitle className="text-xl font-bold text-gray-900 dark:text-white">
                            {plan.name}
                        </CardTitle>
                    </div>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium leading-relaxed mt-1 line-clamp-2">
                    Step up your financial game by committing to a high-value fixed weekly amount for rapid growth.
                </p>
            </CardHeader>

            <CardContent className="flex-1 space-y-6 pt-2">
                {/* Input Section - Minimalist UI */}
                <div className="space-y-4 pt-2">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Duration</Label>
                            <Select value={selectedDuration} onValueChange={setSelectedDuration}>
                                <SelectTrigger className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 h-9 font-medium text-sm focus:ring-purple-500">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {DURATIONS.map(d => (
                                        <SelectItem key={d} value={d.toString()}>{d} Weeks</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Amount</Label>
                            <Select value={selectedAmount} onValueChange={setSelectedAmount}>
                                <SelectTrigger className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 h-9 font-semibold text-sm focus:ring-purple-500">
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

                    <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-100 dark:border-purple-800">
                        <h4 className="text-[10px] font-bold text-purple-800 dark:text-purple-400 uppercase tracking-wider mb-2">Rules & Features</h4>
                        <ul className="space-y-1.5 mb-4">
                            <li className="flex items-center gap-2 text-xs text-purple-700 dark:text-purple-400">
                                <div className="w-1 h-1 rounded-full bg-purple-500" />
                                High-value fixed weekly commitment
                            </li>
                            <li className="flex items-center gap-2 text-xs text-purple-700 dark:text-purple-400">
                                <div className="w-1 h-1 rounded-full bg-purple-500" />
                                Duration: 10, 15, or 20 Weeks
                            </li>
                            <li className="flex items-center gap-2 text-xs text-purple-700 dark:text-purple-400">
                                <div className="w-1 h-1 rounded-full bg-purple-500" />
                                ₦500 penalty for missed weeks
                            </li>
                            <li className="flex items-center gap-2 text-xs text-purple-700 dark:text-purple-400">
                                <div className="w-1 h-1 rounded-full bg-purple-500" />
                                Weekly service charge auto-deducted
                            </li>
                        </ul>

                        <div className="rounded border border-purple-100 dark:border-purple-800 overflow-hidden">
                            <table className="w-full text-[10px] text-left">
                                <thead className="bg-purple-100/50 dark:bg-purple-900/40 font-bold text-purple-800 dark:text-purple-400">
                                    <tr>
                                        <th className="px-2 py-1">Weekly Amount</th>
                                        <th className="px-2 py-1 text-right">Service Charge</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-purple-50 dark:divide-purple-800 text-purple-700 dark:text-purple-400">
                                    <tr>
                                        <td className="px-2 py-1">₦5,000 - ₦10,000</td>
                                        <td className="px-2 py-1 text-right font-bold">₦200</td>
                                    </tr>
                                    <tr>
                                        <td className="px-2 py-1">₦15,000 - ₦20,000</td>
                                        <td className="px-2 py-1 text-right font-bold">₦300</td>
                                    </tr>
                                    <tr>
                                        <td className="px-2 py-1">₦25,000 - ₦30,000</td>
                                        <td className="px-2 py-1 text-right font-bold">₦400</td>
                                    </tr>
                                    <tr>
                                        <td className="px-2 py-1">₦40,000 - ₦50,000</td>
                                        <td className="px-2 py-1 text-right font-bold">₦500</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs text-gray-500 dark:text-gray-400 font-medium pt-2">
                    <div className="flex items-center gap-2">
                        <CheckCircle className="w-3.5 h-3.5 text-purple-600" />
                        <span>Strict Withdrawal</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="w-3.5 h-3.5 text-purple-600" />
                        <span>Penalty for Misses</span>
                    </div>
                </div>
            </CardContent>

            <CardFooter className="pt-2">
                <Button
                    className="w-full bg-teal-900 hover:bg-teal-800 text-white font-semibold"
                    onClick={handleJoin}
                >
                    Start Rapid Savings
                </Button>
            </CardFooter>
        </Card>
    );
}
