import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Plan, UserPlan } from "@/types";
import { Link } from "react-router-dom";
import { Timer, Zap, AlertTriangle } from "lucide-react";

interface SprintPlanCardProps {
    plan: Plan;
    userPlan?: UserPlan;
    onJoin: () => void;
    onDeposit: () => void;
    onAdvanceDeposit?: () => void;
    onLeave?: () => void;
}

export function SprintPlanCard({ plan, userPlan, onJoin, onDeposit, onAdvanceDeposit, onLeave }: SprintPlanCardProps) {
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

    // Active State (Joined) - Minimalist
    if (isJoined) {
        return (
            <Card className="flex flex-col relative overflow-hidden bg-white dark:bg-gray-900 border-l-4 border-l-blue-500 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <Badge variant="outline" className="text-blue-700 border-blue-200 bg-blue-50">{plan.name}</Badge>
                                <Badge className={
                                    userPlan?.status === 'pending_activation'
                                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200'
                                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                                }>
                                    {userPlan?.status === 'pending_activation' ? 'PENDING ACTIVATION' : 'Active'}
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
                    {arrears > 0 && (
                        <div className="flex items-center gap-2 p-2 bg-red-50 text-red-700 rounded-md text-xs border border-red-100 font-medium">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>Arrears: {formatCurrency(arrears)}</span>
                        </div>
                    )}

                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600 dark:text-gray-400 font-medium">Challenge Progress</span>
                            <span className="font-bold text-gray-900 dark:text-gray-200">{weeksCompleted} / {duration} Weeks</span>
                        </div>
                        <div className="h-2 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${progress}%` }} />
                        </div>
                    </div>

                    <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-800 space-y-2">
                        <div className="flex justify-between text-xs font-bold text-gray-700 dark:text-gray-300">
                            <span className="flex items-center gap-1.5 uppercase tracking-wider text-[10px] text-gray-500"><Timer className="w-3.5 h-3.5" /> This Week</span>
                            <span className={currentWeekTotal >= weeklyTarget ? 'text-emerald-600' : 'text-amber-600'}>
                                {currentWeekTotal >= weeklyTarget ? 'Goal Met 🎉' : `${formatCurrency(currentWeekTotal)} / ${formatCurrency(weeklyTarget)}`}
                            </span>
                        </div>
                        <div className="h-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-500 ${currentWeekTotal >= weeklyTarget ? 'bg-emerald-500' : 'bg-amber-500'}`}
                                style={{ width: `${weekProgress}%` }}
                            />
                        </div>
                        <p className="text-[10px] text-gray-400 text-right">Resets Sunday 11:59PM</p>
                    </div>
                </CardContent>

                <CardFooter className="flex flex-col gap-3 pt-2">
                    <div className="grid grid-cols-2 gap-3 w-full">
                        <Button
                            className="w-full bg-gray-900 hover:bg-gray-800 text-white dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
                            onClick={onDeposit}
                        >
                            {arrears > 0 ? "Clear Arrears" : "Add Funds"}
                        </Button>
                        <Button variant="outline" asChild className="w-full">
                            <Link to={`/dashboard/wallet?planId=${userPlan?.plan.id}`}>Details</Link>
                        </Button>
                    </div>
                    {onAdvanceDeposit && progress < 100 && (
                        <Button
                            variant="secondary"
                            className="w-full bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 font-bold"
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
        <Card className="flex flex-col relative overflow-hidden bg-white dark:bg-gray-900 border-l-4 border-l-blue-500 shadow-sm hover:shadow-md transition-shadow group">
            <CardHeader className="pb-4">
                <div className="flex justify-between items-start">
                    <div>
                        <Badge variant="secondary" className="mb-2 bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-100">
                            Saving Sprint
                        </Badge>
                        <CardTitle className="text-xl font-bold text-gray-900 dark:text-white">
                            {plan.name}
                        </CardTitle>
                    </div>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium leading-relaxed mt-1 line-clamp-2">
                    A fast-paced, rolling savings plan designed to help you crush your short-to-medium-term financial targets.
                </p>
            </CardHeader>

            <CardContent className="flex-1 space-y-6 pt-2">
                <div className="flex justify-between items-end border-b border-gray-100 dark:border-gray-800 pb-4">
                    <div>
                        <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Weekly Min</p>
                        <p className="text-lg font-bold text-gray-900 dark:text-white">₦3,000</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Duration</p>
                        <p className="text-lg font-bold text-gray-900 dark:text-white">30 Weeks</p>
                    </div>
                </div>

                <div className="space-y-4 pt-2">
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                        <h4 className="text-[10px] font-bold text-blue-800 dark:text-blue-400 uppercase tracking-wider mb-2">Rules & Features</h4>
                        <ul className="space-y-1.5 mb-4">
                            <li className="flex items-center gap-2 text-xs text-blue-700 dark:text-blue-400">
                                <div className="w-1 h-1 rounded-full bg-blue-500" />
                                30-week rolling savings cycle
                            </li>
                            <li className="flex items-center gap-2 text-xs text-blue-700 dark:text-blue-400">
                                <div className="w-1 h-1 rounded-full bg-blue-500" />
                                Starts instantly once joined
                            </li>
                            <li className="flex items-center gap-2 text-xs text-blue-700 dark:text-blue-400">
                                <div className="w-1 h-1 rounded-full bg-blue-500" />
                                Penalty for missed weeks: ₦500
                            </li>
                            <li className="flex items-center gap-2 text-xs text-blue-700 dark:text-blue-400">
                                <div className="w-1 h-1 rounded-full bg-blue-500" />
                                Withdrawal only after total completion
                            </li>
                        </ul>

                        <div className="rounded border border-blue-100 dark:border-blue-800 overflow-hidden">
                            <table className="w-full text-[10px] text-left">
                                <thead className="bg-blue-100/50 dark:bg-blue-900/40 font-bold text-blue-800 dark:text-blue-400">
                                    <tr>
                                        <th className="px-2 py-1">Weekly Amount</th>
                                        <th className="px-2 py-1 text-right">Service Charge</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-blue-50 dark:divide-blue-800 text-blue-700 dark:text-blue-400">
                                    <tr>
                                        <td className="px-2 py-1">₦3,000 - ₦14,000</td>
                                        <td className="px-2 py-1 text-right font-bold">₦200</td>
                                    </tr>
                                    <tr>
                                        <td className="px-2 py-1">₦14,500 - ₦23,000</td>
                                        <td className="px-2 py-1 text-right font-bold">₦300</td>
                                    </tr>
                                    <tr>
                                        <td className="px-2 py-1">₦23,500 and above</td>
                                        <td className="px-2 py-1 text-right font-bold">₦500</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs text-gray-500 dark:text-gray-400 font-medium">
                        <div className="flex items-center gap-2">
                            <Timer className="w-3.5 h-3.5 text-blue-600" />
                            <span>Starts Instantly</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Zap className="w-3.5 h-3.5 text-blue-600" />
                            <span>Auto-recovery</span>
                        </div>
                    </div>
                </div>
            </CardContent>

            <CardFooter className="pt-2">
                <Button
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                    onClick={onJoin}
                >
                    Start Sprint
                </Button>
            </CardFooter>
        </Card>
    );
}
