import { useState } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Progress } from "@/app/components/ui/progress";
import { Badge } from "@/app/components/ui/badge";
import { Label } from "@/app/components/ui/label";
import { Input } from "@/app/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { Plan, UserPlan } from "@/types";
import { CheckCircle, AlertTriangle, TrendingUp, RefreshCw, Sprout, Calendar } from "lucide-react";
import { Link } from "react-router-dom";
import { SprintJoinModal } from "./SprintJoinModal";

interface MonthlyBloomPlanCardProps {
    plan: Plan;
    userPlan?: UserPlan;
    onJoin: (planId: string, targetAmount: number, duration: number) => void;
    onDeposit: () => void;
}

export function MonthlyBloomPlanCard({ plan, userPlan, onJoin, onDeposit }: MonthlyBloomPlanCardProps) {
    const [duration, setDuration] = useState<string>("4");
    const [targetAmount, setTargetAmount] = useState<string>("20000");
    const [showJoinModal, setShowJoinModal] = useState(false);

    const formatCurrency = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'NGN' }).format(val);

    const isActive = userPlan?.status === 'active';
    const isCompleted = userPlan?.status === 'completed' || userPlan?.status === 'matured';
    const meta = userPlan?.plan_metadata || {};

    // Active State Data
    const monthPaid = meta.month_paid_so_far || 0;
    const monthsCompleted = meta.months_completed || 0;
    const selectedDuration = meta.selected_duration || 4;
    const target = meta.target_amount || 20000;
    const arrears = meta.arrears || 0;

    const progressPercent = Math.min((monthPaid / target) * 100, 100);

    const handleJoin = () => {
        const amount = parseFloat(targetAmount);
        if (amount < 20000) {
            alert("Minimum monthly target is ₦20,000");
            return;
        }
        setShowJoinModal(true);
    };

    const confirmJoin = () => {
        onJoin(plan.id, parseFloat(targetAmount), parseInt(duration));
    };


    // Active State - Minimalist
    if (isActive) {
        return (
            <Card className="flex flex-col relative overflow-hidden bg-white dark:bg-gray-900 border-l-4 border-l-pink-500 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <Badge variant="outline" className="text-pink-700 border-pink-200 bg-pink-50">Monthly Bloom</Badge>
                                <Badge className="bg-emerald-600 border-emerald-500 text-white">Active</Badge>
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
                    {arrears > 0 ? (
                        <div className="bg-red-50 p-2 rounded border border-red-100 flex items-center gap-2 text-xs text-red-700 font-medium animate-pulse">
                            <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                            Arrears: {formatCurrency(arrears)}
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 p-2 bg-emerald-50 text-emerald-700 rounded-md text-xs border border-emerald-100 font-bold">
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>On Track</span>
                        </div>
                    )}

                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600 dark:text-gray-400 font-medium">Target Progress</span>
                            <span className="font-bold text-gray-900 dark:text-gray-200">{formatCurrency(monthPaid)} / {formatCurrency(target)}</span>
                        </div>
                        <div className="h-2 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                            <div className="h-full bg-pink-500 rounded-full" style={{ width: `${progressPercent}%` }} />
                        </div>
                        <div className="flex justify-between text-[10px] text-gray-400 font-medium">
                            <span>Month {monthsCompleted + 1} of {selectedDuration}</span>
                            <span>{Math.round(progressPercent)}%</span>
                        </div>
                    </div>
                </CardContent>

                <CardFooter className="grid grid-cols-2 gap-3 pt-2">
                    <Button
                        className="w-full bg-gray-900 hover:bg-gray-800 text-white dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
                        onClick={onDeposit}
                    >
                        Add Funds
                    </Button>
                    <Button variant="outline" asChild className="w-full">
                        <Link to={`/dashboard/wallet?planId=${userPlan?.plan.id}`}>Details</Link>
                    </Button>
                </CardFooter>
            </Card>
        );
    }

    if (isCompleted) {
        return (
            <Card className="flex flex-col relative overflow-hidden bg-white dark:bg-gray-900 border-l-4 border-l-emerald-500 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                        <div>
                            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 mb-2">Completed</Badge>
                            <CardTitle className="text-xl font-bold text-emerald-900 dark:text-emerald-100">{plan.name}</CardTitle>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col items-center justify-center text-center space-y-4 pt-4">
                    <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-900/20 rounded-full flex items-center justify-center">
                        <CheckCircle className="w-8 h-8 text-emerald-500" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-emerald-800 dark:text-emerald-200">Goal Achieved! 🌸</h3>
                        <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-1">You have successfully reached your Monthly Bloom target.</p>
                    </div>
                </CardContent>
                <CardFooter className="pt-2">
                    <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold" onClick={() => {
                        onJoin(plan.id, parseInt(targetAmount), parseInt(duration));
                    }}>
                        <RefreshCw className="w-4 h-4 mr-2" /> Start New Bloom
                    </Button>
                </CardFooter>
            </Card>
        )
    }

    // Available State (Minimalist Redesign)
    return (
        <>
            <Card className="flex flex-col relative overflow-hidden bg-white dark:bg-gray-900 border-l-4 border-l-pink-500 shadow-sm hover:shadow-md transition-shadow group">
                <CardHeader className="pb-4">
                    <div className="flex justify-between items-start">
                        <div>
                            <Badge variant="secondary" className="mb-2 bg-pink-50 text-pink-700 border-pink-100 hover:bg-pink-100">
                                Monthly Bloom
                            </Badge>
                            <CardTitle className="text-xl font-bold text-gray-900 dark:text-white">
                                {plan.name}
                            </CardTitle>
                        </div>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium leading-relaxed mt-1 line-clamp-2">
                        Steady monthly contributions for your big goals.
                    </p>
                </CardHeader>

                <CardContent className="flex-1 space-y-6 pt-2">
                    {/* Input Section - Minimalist UI */}
                    <div className="space-y-4 pt-2">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Duration</Label>
                                <Select value={duration} onValueChange={setDuration}>
                                    <SelectTrigger className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 h-9 font-medium text-sm focus:ring-pink-500">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {[4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
                                            <SelectItem key={m} value={m.toString()}>{m} Months</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Monthly Target</Label>
                                <Input
                                    type="number"
                                    className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 h-9 font-semibold text-sm focus-visible:ring-pink-500"
                                    value={targetAmount}
                                    onChange={(e) => setTargetAmount(e.target.value)}
                                    min={20000}
                                    step={1000}
                                />
                            </div>
                        </div>

                        <div className="flex justify-between items-center text-xs text-pink-700 bg-pink-50 p-2 rounded border border-pink-100">
                            <span className="font-semibold">Est. Total Savings:</span>
                            <span className="font-bold text-sm bg-white px-2 py-0.5 rounded border border-pink-200 shadow-sm">{formatCurrency(parseInt(targetAmount || "0") * parseInt(duration))}</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs text-gray-500 dark:text-gray-400 font-medium pt-2">
                        <div className="flex items-center gap-2">
                            <CheckCircle className="w-3.5 h-3.5 text-pink-600" />
                            <span>Flexible Target</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Sprout className="w-3.5 h-3.5 text-pink-600" />
                            <span>Growth Focused</span>
                        </div>
                    </div>
                </CardContent>

                <CardFooter className="pt-2">
                    <Button
                        className="w-full bg-pink-600 hover:bg-pink-700 text-white font-semibold"
                        onClick={handleJoin}
                    >
                        Start Monthly Bloom
                    </Button>
                </CardFooter>
            </Card>

            <SprintJoinModal
                isOpen={showJoinModal}
                onClose={() => setShowJoinModal(false)}
                onSuccess={confirmJoin}
                plan={plan}
                customTitle="Confirm Monthly Bloom"
                customTerms={[
                    `Duration: ${duration} Months`,
                    `Monthly Target: ${formatCurrency(parseInt(targetAmount))}`,
                    "Service Charge: ₦2,000 per month (deducted upfront or monthly)",
                    "Withdrawal: Available after maturity",
                    "Penalty: Late payment fees apply",
                    "Aesthetics: Premium Growth"
                ]}
            />
        </>
    );
}
