import { useState } from "react";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Progress } from "@/app/components/ui/progress";
import { Play, CheckCircle, AlertOctagon, TrendingUp, Lock } from "lucide-react"; // Import Lock

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

    return (
        <>
            <Card className="w-full border-indigo-100 bg-gradient-to-br from-white to-indigo-50/50 dark:from-gray-900 dark:to-indigo-950/30 overflow-hidden relative group">
                {/* Background Decor */}
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <TrendingUp className="w-24 h-24 text-indigo-600" />
                </div>

                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <Badge className="bg-indigo-600 hover:bg-indigo-700">The Anchor</Badge>
                                {isJoined && <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50">Active</Badge>}
                            </div>
                            <CardTitle className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                                48-Week Challenge
                            </CardTitle>
                            <CardDescription className="text-slate-500 dark:text-slate-400 mt-1">
                                Build a solid foundation. Weekly targets, strict discipline.
                            </CardDescription>
                        </div>
                        <div className="text-right">
                            <div className="text-sm text-slate-500">Weekly Target</div>
                            <div className="text-lg font-bold text-indigo-700 dark:text-indigo-400">{formatCurrency(weeklyTarget)}</div>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="space-y-6">
                    {!isJoined ? (
                        <div className="py-6 text-center space-y-4">
                            <div className="flex justify-center">
                                <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center">
                                    <Lock className="w-8 h-8 text-indigo-600" />
                                </div>
                            </div>
                            <div>
                                <h4 className="font-semibold text-slate-700 dark:text-slate-200">Are you ready to commit?</h4>
                                <p className="text-sm text-slate-500 max-w-xs mx-auto mt-2">
                                    Commit to ₦3,000 weekly for 48 weeks. Miss a week, pay a penalty. No withdrawals until completion.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-5">
                            {/* Detailed Stats for Active User */}

                            {/* 1. Overall Progress */}
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-600 dark:text-slate-400">Journey Progress</span>
                                    <span className="font-medium text-slate-900 dark:text-white">{weeksCompleted} / {totalDuration} Weeks</span>
                                </div>
                                <Progress value={totalProgress} className="h-2 bg-slate-100" />
                            </div>

                            {/* 2. Weekly Status */}
                            <div className="bg-white/60 dark:bg-black/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-900 space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">This Week's Goal</span>
                                    {progressPercent >= 100 ? (
                                        <Badge className="bg-emerald-500 hover:bg-emerald-600 border-none"><CheckCircle className="w-3 h-3 mr-1" /> Completed</Badge>
                                    ) : (
                                        <Badge variant="outline" className="text-amber-600 bg-amber-50 mx-0 border-amber-200">In Progress</Badge>
                                    )}
                                </div>

                                <div className="space-y-1">
                                    <div className="flex justify-between text-xs text-slate-500">
                                        <span>Paid: {formatCurrency(currentWeekTotal)}</span>
                                        <span>Left: {formatCurrency(Math.max(0, weeklyTarget - currentWeekTotal))}</span>
                                    </div>
                                    <Progress value={progressPercent} className={`h-3 ${progressPercent >= 100 ? 'bg-emerald-100' : 'bg-slate-100'}`} />
                                </div>
                            </div>

                            {/* 3. Arrears Alert */}
                            {arrears > 0 && (
                                <div className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 rounded-lg text-red-700 dark:text-red-300">
                                    <AlertOctagon className="w-5 h-5 shrink-0 mt-0.5" />
                                    <div className="text-sm">
                                        <p className="font-bold">Outstanding Penalties</p>
                                        <p>You have accumulated <span className="font-bold">{formatCurrency(arrears)}</span> in missed week penalties/arrears. This will be deducted from your savings.</p>
                                    </div>
                                </div>
                            )}

                            {/* 4. Current Balance */}
                            <div className="flex justify-between items-end border-t pt-4 border-dashed border-slate-200">
                                <span className="text-sm text-slate-500">Total Saved</span>
                                <span className="text-2xl font-bold text-slate-800 dark:text-white">{formatCurrency(userPlan.current_balance)}</span>
                            </div>
                        </div>
                    )}
                </CardContent>

                <CardFooter>
                    {!isJoined ? (
                        <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200/50" onClick={() => setShowJoinModal(true)}>
                            Start The Anchor
                        </Button>
                    ) : (
                        <div className="grid grid-cols-2 gap-3 w-full">
                            <Button variant="outline" className="w-full" asChild>
                                <a href={plan.whatsapp_link} target="_blank">Group Chat</a>
                            </Button>
                            <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => onDeposit(plan.id)}>
                                <Play className="w-4 h-4 mr-2" /> Add Funds
                            </Button>
                        </div>
                    )}
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
