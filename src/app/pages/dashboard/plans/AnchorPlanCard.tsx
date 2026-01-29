import { useState } from "react";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Lock, CheckCircle, AlertOctagon, TrendingUp } from "lucide-react";

import { UserPlan, Plan } from "@/types";
import { SprintJoinModal } from "./SprintJoinModal"; // Re-use Sprint Modal as logic is identical, maybe rename later

interface AnchorPlanCardProps {
    plan: Plan;
    userPlan?: UserPlan;
    onJoin: () => void;
    onDeposit: (planId: string) => void;
}

export function AnchorPlanCard({ plan, userPlan, onJoin, onDeposit }: AnchorPlanCardProps) {
    const [showJoinModal, setShowJoinModal] = useState(false);


    const isJoined = !!userPlan;
    const meta = userPlan?.plan_metadata || {};

    // Anchor Specifics (48 weeks)
    const weeksCompleted = meta.weeks_completed || 0;
    const currentWeekTotal = meta.current_week_total || 0;
    const arrears = meta.arrears_amount || 0;
    const totalDuration = 48;

    const weeklyTarget = 3000;
    const progressPercent = Math.min((currentWeekTotal / weeklyTarget) * 100, 100);
    const totalProgress = (weeksCompleted / totalDuration) * 100;

    const handleJoinSuccess = () => {
        onJoin();
    };

    const formatCurrency = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'NGN' }).format(val);


    // Active State - Minimalist
    if (isJoined) {
        return (
            <Card className="flex flex-col relative overflow-hidden bg-white dark:bg-gray-900 border-l-4 border-l-indigo-500 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <Badge variant="outline" className="text-indigo-700 border-indigo-200 bg-indigo-50">The Anchor</Badge>
                                <Badge className="bg-indigo-600 hover:bg-indigo-700 text-white">Active</Badge>
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
                            <AlertOctagon className="w-3.5 h-3.5" />
                            <span>Penalties: {formatCurrency(arrears)}</span>
                        </div>
                    )}

                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600 dark:text-gray-400 font-medium">Journey Progress</span>
                            <span className="font-bold text-gray-900 dark:text-gray-200">{weeksCompleted} / {totalDuration} Weeks</span>
                        </div>
                        <div className="h-2 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${totalProgress}%` }} />
                        </div>
                    </div>

                    <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-800 space-y-2">
                        <div className="flex justify-between text-xs font-bold text-gray-700 dark:text-gray-300">
                            <span className="flex items-center gap-1.5 uppercase tracking-wider text-[10px] text-gray-500"><TrendingUp className="w-3.5 h-3.5" /> This Week</span>
                            <span className={progressPercent >= 100 ? 'text-emerald-600' : 'text-amber-600'}>
                                {progressPercent >= 100 ? 'Goal Met 🔒' : `${formatCurrency(currentWeekTotal)} / ${formatCurrency(weeklyTarget)}`}
                            </span>
                        </div>
                        <div className="h-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-500 ${progressPercent >= 100 ? 'bg-emerald-500' : 'bg-indigo-400'}`}
                                style={{ width: `${progressPercent}%` }}
                            />
                        </div>
                        <div className="flex justify-between text-[10px] text-gray-400">
                            <span>Left: {formatCurrency(Math.max(0, weeklyTarget - currentWeekTotal))}</span>
                            <span>Resets Sun 11:59PM</span>
                        </div>
                    </div>
                </CardContent>

                <CardFooter className="grid grid-cols-2 gap-3 pt-2">
                    <Button
                        className="w-full bg-gray-900 hover:bg-gray-800 text-white dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
                        onClick={() => onDeposit(plan.id)}
                    >
                        Add Funds
                    </Button>
                    <Button variant="outline" asChild className="w-full">
                        <a href={plan.whatsapp_link} target="_blank">Group Chat</a>
                    </Button>
                </CardFooter>
            </Card>
        );
    }

    // Available State (Minimalist Redesign)
    return (
        <>
            <Card className="flex flex-col relative overflow-hidden bg-white dark:bg-gray-900 border-l-4 border-l-indigo-500 shadow-sm hover:shadow-md transition-shadow group">
                <CardHeader className="pb-4">
                    <div className="flex justify-between items-start">
                        <div>
                            <Badge variant="secondary" className="mb-2 bg-indigo-50 text-indigo-700 border-indigo-100 hover:bg-indigo-100">
                                The Anchor
                            </Badge>
                            <CardTitle className="text-xl font-bold text-gray-900 dark:text-white">
                                {plan.name}
                            </CardTitle>
                        </div>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium leading-relaxed mt-1 line-clamp-2">
                        Build a solid foundation. Weekly targets, strict discipline.
                    </p>
                </CardHeader>

                <CardContent className="flex-1 space-y-6 pt-2">
                    <div className="flex justify-between items-end border-b border-gray-100 dark:border-gray-800 pb-4">
                        <div>
                            <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Weekly Target</p>
                            <p className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(weeklyTarget)}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Duration</p>
                            <p className="text-lg font-bold text-gray-900 dark:text-white">{totalDuration} Weeks</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs text-gray-500 dark:text-gray-400 font-medium">
                        <div className="flex items-center gap-2">
                            <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Disciplined</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <CheckCircle className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Auto-Recovery</span>
                        </div>
                    </div>
                </CardContent>

                <CardFooter className="pt-2">
                    <Button
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
                        onClick={() => setShowJoinModal(true)}
                    >
                        Start The Anchor
                    </Button>
                </CardFooter>
            </Card>

            <SprintJoinModal
                isOpen={showJoinModal}
                onClose={() => setShowJoinModal(false)}
                onSuccess={handleJoinSuccess}
                plan={plan}
                customTitle="Confirm Anchor Commitment"
                customTerms={[
                    "Duration: 48 Weeks (Strict)",
                    "Weekly Target: ₦3,000",
                    "Status Check: Sunday 11:59PM",
                    "Penalty: ₦500 per missed week",
                    "Withdrawal: Locked until completion (No Breakage)",
                    "Auto-Recover: Arrears deducted automatically"
                ]}
            />
        </>
    );
}
