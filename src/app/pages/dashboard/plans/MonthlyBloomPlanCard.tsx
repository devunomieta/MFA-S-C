import { useState } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Progress } from "@/app/components/ui/progress";
import { Badge } from "@/app/components/ui/badge";
import { Label } from "@/app/components/ui/label";
import { Input } from "@/app/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { Plan, UserPlan } from "@/types";
import { CheckCircle, AlertTriangle, TrendingUp, RefreshCw } from "lucide-react";

interface MonthlyBloomPlanCardProps {
    plan: Plan;
    userPlan?: UserPlan;
    onJoin: (planId: string, targetAmount: number, duration: number) => void;
    onDeposit: () => void;
}

export function MonthlyBloomPlanCard({ plan, userPlan, onJoin, onDeposit }: MonthlyBloomPlanCardProps) {
    const [duration, setDuration] = useState<string>("4");
    const [targetAmount, setTargetAmount] = useState<string>("20000");

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
        onJoin(plan.id, amount, parseInt(duration));
    };

    if (isActive) {
        return (
            <Card className="flex flex-col relative overflow-hidden border-pink-200 bg-pink-50/30 hover:shadow-lg transition-all">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-pink-400 to-rose-500" />
                <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle className="text-xl font-bold text-pink-900">{plan.name}</CardTitle>
                            <div className="text-xs text-pink-600 font-medium flex items-center gap-1">
                                <TrendingUp className="w-3 h-3" />
                                Month {monthsCompleted + 1} of {selectedDuration}
                            </div>
                        </div>
                        <Badge className="bg-pink-100 text-pink-700 hover:bg-pink-200 border-pink-200">
                            Active
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="flex-1 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white p-2 rounded border border-pink-100">
                            <div className="text-[10px] text-gray-500 uppercase">Target</div>
                            <div className="font-bold text-gray-900">{formatCurrency(target)}</div>
                        </div>
                        <div className="bg-white p-2 rounded border border-pink-100">
                            <div className="text-[10px] text-gray-500 uppercase">Saved Total</div>
                            <div className="font-bold text-pink-600">{formatCurrency(userPlan?.current_balance || 0)}</div>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                            <span className="text-gray-600">Month Progress</span>
                            <span className="font-medium text-pink-700">{Math.round(progressPercent)}%</span>
                        </div>
                        <Progress value={progressPercent} className="h-2 bg-pink-100 [&>div]:bg-pink-500" />
                        <div className="text-[10px] text-gray-400 text-right">
                            {formatCurrency(monthPaid)} / {formatCurrency(target)}
                        </div>
                    </div>

                    {arrears > 0 && (
                        <div className="bg-red-50 p-2 rounded border border-red-100 flex items-center gap-2 text-xs text-red-700 font-medium">
                            <AlertTriangle className="w-4 h-4 text-red-500" />
                            Arrears: {formatCurrency(arrears)}
                        </div>
                    )}
                </CardContent>
                <CardFooter>
                    <Button className="w-full bg-pink-600 hover:bg-pink-700 text-white shadow-pink-200" onClick={onDeposit}>
                        Add Funds
                    </Button>
                </CardFooter>
            </Card>
        );
    }

    if (isCompleted) {
        return (
            <Card className="flex flex-col relative overflow-hidden border-green-200 bg-green-50/30 hover:shadow-lg transition-all">
                <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                        <CardTitle className="text-xl font-bold text-green-900">{plan.name}</CardTitle>
                        <Badge className="bg-green-100 text-green-700 border-green-200">Completed</Badge>
                    </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col items-center justify-center text-center space-y-2">
                    <CheckCircle className="w-12 h-12 text-green-500" />
                    <p className="text-green-800 font-medium">Congratulations! Plan Completed.</p>
                </CardContent>
                <CardFooter className="gap-2">
                    <Button variant="outline" className="flex-1" disabled>Withdraw Not Ready</Button>
                    <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white" onClick={() => {
                        // Rejoin Logic (Trigger new join)
                        onJoin(plan.id, parseInt(targetAmount), parseInt(duration));
                    }}>
                        <RefreshCw className="w-4 h-4 mr-2" /> Rejoin
                    </Button>
                </CardFooter>
            </Card>
        )
    }

    return (
        <Card className="flex flex-col relative overflow-hidden hover:shadow-lg transition-all border-pink-100">
            <CardHeader className="pb-2">
                <CardTitle className="text-xl font-bold text-gray-900">{plan.name}</CardTitle>
                <div className="text-sm text-gray-500">{plan.description || "Monthly savings with flexible terms."}</div>
            </CardHeader>
            <CardContent className="flex-1 space-y-4">
                <div className="space-y-3">
                    <div className="space-y-1">
                        <Label className="text-xs font-semibold text-gray-500 uppercase">Duration (Months)</Label>
                        <Select value={duration} onValueChange={setDuration}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {[4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
                                    <SelectItem key={m} value={m.toString()}>{m} Months</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-1">
                        <Label className="text-xs font-semibold text-gray-500 uppercase">Monthly Target (Min ₦20k)</Label>
                        <Input
                            type="number"
                            value={targetAmount}
                            onChange={(e) => setTargetAmount(e.target.value)}
                            min={20000}
                        />
                    </div>

                    <div className="bg-gray-50 p-2 rounded text-xs text-gray-600 space-y-1">
                        <div className="flex justify-between">
                            <span>Service Charge:</span>
                            <span className="font-bold">₦2,000 / month</span>
                        </div>
                        <div className="flex justify-between text-pink-700 font-medium">
                            <span>You Save:</span>
                            <span>{formatCurrency(parseInt(targetAmount || "0") * parseInt(duration))}</span>
                        </div>
                    </div>
                </div>
            </CardContent>
            <CardFooter>
                <Button className="w-full bg-pink-600 hover:bg-pink-700 text-white" onClick={handleJoin}>
                    Start Monthly Bloom
                </Button>
            </CardFooter>
        </Card>
    );
}
