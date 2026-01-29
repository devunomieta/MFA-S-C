import { useState, useEffect } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Progress } from "@/app/components/ui/progress";
import { Badge } from "@/app/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { Plan, UserPlan } from "@/types";
import { Timer, CheckCircle, AlertTriangle, Coins, TrendingUp, Calendar, Lock } from "lucide-react";

interface AjoCirclePlanCardProps {
    plan: Plan;
    userPlan?: UserPlan;
    onJoin: (planId: string, amount: number) => void;
    onDeposit: () => void;
}

export function AjoCirclePlanCard({ plan, userPlan, onJoin, onDeposit }: AjoCirclePlanCardProps) {
    const [selectedAmount, setSelectedAmount] = useState<string>("");

    const amounts = plan.config?.amounts || [10000, 15000, 20000, 25000, 30000, 50000, 100000];
    const fees = plan.config?.fees || {};

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'decimal',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(value);
    };

    const getFee = (amt: number) => fees[amt.toString()] || 0;
    const getTotalPayable = (amt: number) => amt + getFee(amt);
    const getPayout = (amt: number) => amt * 10;

    const handleJoin = () => {
        if (!selectedAmount) return;
        onJoin(plan.id, Number(selectedAmount));
    };

    if (userPlan) {
        // Active State
        const metadata = userPlan.plan_metadata || {};
        const fixedAmount = metadata.fixed_amount || 0;
        const currentWeek = metadata.current_week || 1;
        const weekPaid = metadata.week_paid || false;
        const pickingTurns = metadata.picking_turns || []; // Array of weeks, e.g. [5]
        const missedWeeks = metadata.missed_weeks || 0;

        // Check if it's my turn
        const isMyTurn = pickingTurns.includes(currentWeek);
        // Withdraw logic: Usually implies "Payout". 
        // If it's my turn, I should be able to "Withdraw" the Payout amount? 
        // Or receive automatic credit? Request says "Withdrawal button is enabled only after it is your allocated PICKING TURN".
        // Assuming this means "During my turn".

        return (
            <Card className="flex flex-col relative overflow-hidden border-indigo-200 dark:border-indigo-800 bg-gradient-to-br from-white to-indigo-50 dark:from-gray-900 dark:to-indigo-950">
                <div className="absolute top-0 right-0 p-2 opacity-10">
                    <Coins className="w-24 h-24 text-indigo-600" />
                </div>

                <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                        <div>
                            <Badge className="mb-2 bg-indigo-100 text-indigo-700 hover:bg-indigo-100 border-indigo-200">The Ajo Circle</Badge>
                            <CardTitle className="text-xl font-bold text-indigo-950 dark:text-indigo-100">My Circle</CardTitle>
                        </div>
                        <div className="text-right">
                            <div className="text-xs text-gray-500 uppercase font-bold">Payout</div>
                            <div className="text-lg font-extrabold text-emerald-600">₦{formatCurrency(getPayout(fixedAmount))}</div>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="space-y-4 flex-1">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-indigo-100 dark:border-gray-700">
                            <div className="text-[10px] text-gray-500 uppercase flex items-center gap-1">
                                <Calendar className="w-3 h-3" /> Current Week
                            </div>
                            <div className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">{currentWeek} <span className="text-sm text-gray-400 font-normal">/ 10</span></div>
                        </div>
                        <div className="p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-indigo-100 dark:border-gray-700">
                            <div className="text-[10px] text-gray-500 uppercase flex items-center gap-1">
                                <Timer className="w-3 h-3" /> My Turn(s)
                            </div>
                            <div className="text-lg font-bold text-indigo-700 dark:text-indigo-300">
                                {pickingTurns.length > 0 ? `Week ${pickingTurns.join(', ')}` : 'Pending'}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600 dark:text-gray-400">Weekly Contribution</span>
                            <span className="font-medium">₦{formatCurrency(fixedAmount)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600 dark:text-gray-400">Status</span>
                            <span className={`font-bold ${weekPaid ? 'text-emerald-600' : 'text-amber-600'}`}>
                                {weekPaid ? 'Paid' : 'Due'}
                            </span>
                        </div>
                        {missedWeeks > 0 && (
                            <div className="flex items-center gap-1 text-xs text-red-600 bg-red-50 p-1 rounded">
                                <AlertTriangle className="w-3 h-3" /> {missedWeeks} Missed (₦{formatCurrency(missedWeeks * 500)} Penalty)
                            </div>
                        )}
                    </div>

                    <Progress value={(currentWeek / 10) * 100} className="h-2 bg-indigo-100" />
                </CardContent>

                <CardFooter className="flex-col gap-2">
                    {isMyTurn ? (
                        <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white animate-pulse">
                            Withdraw Payout
                        </Button>
                    ) : (
                        <Button className="w-full" variant="outline" disabled>
                            <Lock className="w-3 h-3 mr-2" /> Payout Locked
                        </Button>
                    )}

                    {!weekPaid && (
                        <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white" onClick={onDeposit}>
                            Pay Weekly
                        </Button>
                    )}
                    {weekPaid && !isMyTurn && (
                        <Button className="w-full bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200" disabled>
                            <CheckCircle className="w-4 h-4 mr-2" /> Weekly Limit Reached
                        </Button>
                    )}
                </CardFooter>
            </Card>
        );
    }

    // Available State (Premium Redesign)
    return (
        <Card className="flex flex-col relative overflow-hidden group hover:shadow-2xl transition-all duration-300 border-0 bg-white dark:bg-gray-900 shadow-lg">
            {/* Decorative Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/5 to-purple-600/5 dark:from-indigo-900/40 dark:to-purple-900/40 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="absolute -right-12 -top-12 h-40 w-40 bg-indigo-500/10 rounded-full blur-3xl group-hover:bg-indigo-500/20 transition-all" />

            <CardHeader className="pb-4 relative z-10">
                <div className="flex justify-between items-start">
                    <div>
                        <Badge className="mb-3 bg-indigo-100 text-indigo-700 hover:bg-indigo-200 border-0 px-3 py-1 text-xs font-semibold tracking-wide uppercase">
                            Premium Circle
                        </Badge>
                        <CardTitle className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                            {plan.name}
                        </CardTitle>
                    </div>
                    {plan.config?.season_start_date && (
                        <div className="flex flex-col items-end">
                            <span className="text-[10px] uppercase text-gray-400 font-bold tracking-wider">Starts</span>
                            <span className="text-sm font-bold text-emerald-600 flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-1 rounded-md">
                                <Calendar className="w-3.5 h-3.5" />
                                {new Date(plan.config.season_start_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </span>
                        </div>
                    )}
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium leading-relaxed mt-2">
                    {plan.description}
                </p>
            </CardHeader>

            <CardContent className="flex-1 space-y-6 relative z-10">
                <div className="space-y-3">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Select Contribution</label>
                    <Select value={selectedAmount} onValueChange={setSelectedAmount}>
                        <SelectTrigger className="h-12 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-indigo-500/20 font-medium text-lg">
                            <SelectValue placeholder="Choose amount..." />
                        </SelectTrigger>
                        <SelectContent>
                            {amounts.map((amt: number) => (
                                <SelectItem key={amt} value={amt.toString()} disabled={amt === 100000} className="py-3">
                                    <div className="flex items-center justify-between w-full min-w-[200px]">
                                        <span className="font-bold text-gray-900 dark:text-white">₦{formatCurrency(amt)}</span>
                                        {amt === 100000 && <Badge variant="outline" className="ml-2 text-[10px]">Full</Badge>}
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {selectedAmount && plan.config?.duration_weeks ? (
                    <div className="rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 p-5 text-white shadow-lg transform transition-all duration-300 hover:scale-[1.02]">
                        <div className="flex justify-between items-center mb-4 border-b border-white/20 pb-4">
                            <div>
                                <p className="text-indigo-100 text-xs font-medium uppercase tracking-wide">Duration</p>
                                <p className="text-lg font-bold">{plan.config.duration_weeks} Weeks</p>
                            </div>
                            <div className="text-right">
                                <p className="text-indigo-100 text-xs font-medium uppercase tracking-wide">Weekly</p>
                                <p className="text-lg font-bold">₦{formatCurrency(Number(selectedAmount))}</p>
                            </div>
                        </div>
                        <div className="flex justify-between items-end">
                            <div>
                                <p className="text-indigo-100 text-xs font-bold uppercase tracking-wider mb-1">Total Payout</p>
                                <p className="text-3xl font-black tracking-tight">
                                    ₦{formatCurrency(Number(selectedAmount) * plan.config.duration_weeks)}
                                </p>
                            </div>
                            <Coins className="w-8 h-8 text-indigo-300/50" />
                        </div>
                    </div>
                ) : (
                    <div className="rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 p-6 flex flex-col items-center justify-center text-center space-y-2 h-[140px]">
                        <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-full">
                            <TrendingUp className="w-6 h-6 text-gray-400" />
                        </div>
                        <p className="text-sm font-medium text-gray-500">Select an amount to calculate payout</p>
                        {!plan.config?.duration_weeks && <p className="text-xs text-amber-500">Season duration pending</p>}
                    </div>
                )}
            </CardContent>

            <CardFooter className="flex-col gap-3 relative z-10 pt-2">
                <Button
                    className="w-full h-12 bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 font-bold text-base shadow-lg hover:shadow-xl transition-all"
                    onClick={handleJoin}
                    disabled={!selectedAmount || !plan.config?.duration_weeks}
                >
                    {plan.config?.duration_weeks ? 'Join Circle Now' : 'Awaiting Config'}
                </Button>
            </CardFooter>
        </Card>
    );
}
