import { useState } from "react";
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
    onAdvanceDeposit?: () => void;
    onWithdraw?: () => void;
    onLeave?: () => void;
}

export function AjoCirclePlanCard({ plan, userPlan, onJoin, onDeposit, onAdvanceDeposit, onWithdraw, onLeave }: AjoCirclePlanCardProps) {
    const [selectedAmount, setSelectedAmount] = useState<string>("");
    const [withdrawing, setWithdrawing] = useState(false);

    const amounts = plan.config?.amounts || [10000, 15000, 20000, 25000, 30000, 50000, 100000];

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'decimal',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(value);
    };

    const duration = plan.config?.duration_weeks || 10;
    const getPayout = (amt: number) => amt * duration;

    const handleJoin = () => {
        if (!selectedAmount) return;
        onJoin(plan.id, Number(selectedAmount));
    };

    if (userPlan) {
        // Active State - Minimalist
        const metadata = userPlan.plan_metadata || {};
        const fixedAmount = metadata.fixed_amount || 0;
        const currentWeek = metadata.current_week || 1;
        const weekPaid = metadata.week_paid || false;
        const pickingTurns = metadata.picking_turns || [];
        const missedWeeks = metadata.missed_weeks || 0;

        const payoutHistory = (metadata as any).payout_history || [];
        const turnCount = pickingTurns.filter((t: any) => Number(t) === currentWeek).length;
        const withdrawnCount = payoutHistory.filter((h: any) => Number(h) === currentWeek).length;
        const isMyTurn = turnCount > withdrawnCount;
        const canWithdraw = isMyTurn;

        return (
            <Card className="flex flex-col relative overflow-hidden bg-white dark:bg-gray-900 border-l-4 border-l-orange-500 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <Badge variant="outline" className="text-emerald-700 border-emerald-200 bg-emerald-50">{plan.name}</Badge>
                                <Badge className={
                                    userPlan.status === 'pending_activation'
                                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200'
                                        : 'bg-emerald-600 border-emerald-500 text-white'
                                }>
                                    {userPlan.status === 'pending_activation' ? 'PENDING ACTIVATION' : 'Active'}
                                </Badge>
                            </div>
                            <CardTitle className="text-xl font-bold text-gray-900 dark:text-gray-100">{plan.name}</CardTitle>
                        </div>
                        <div className="text-right">
                            <div className="text-xs text-gray-500 uppercase font-bold tracking-wider">Total Payout</div>
                            <div className="text-xl font-bold text-gray-900 dark:text-white">₦{formatCurrency(getPayout(fixedAmount))}</div>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="space-y-6 flex-1 pt-4 overflow-y-auto max-h-[60vh] custom-scrollbar">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-800">
                            <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1 flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5" /> Current Week
                            </div>
                            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{currentWeek} <span className="text-sm text-gray-400 font-normal">/ {duration}</span></div>
                        </div>
                        <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-800">
                            <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1 flex items-center gap-1.5">
                                <Timer className="w-3.5 h-3.5" /> My Turn(s)
                            </div>
                            <div className="text-lg font-bold text-orange-600 dark:text-orange-400">
                                {pickingTurns.length > 0 ? `Week ${pickingTurns.join(', ')}` : 'Pending'}
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        {missedWeeks > 0 && (
                            <div className="flex items-center gap-2 p-2 bg-red-50 text-red-700 rounded-md text-xs border border-red-100 font-medium animate-pulse">
                                <AlertTriangle className="w-3.5 h-3.5" /> {missedWeeks} Missed (₦{formatCurrency(missedWeeks * 500)} Penalty)
                            </div>
                        )}

                        <div className={`flex items-center gap-2 p-2 rounded-md text-xs border font-bold ${weekPaid ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100 shadow-sm'
                            }`}>
                            {weekPaid ? <CheckCircle className="w-3.5 h-3.5" /> : <Timer className="w-3.5 h-3.5 animate-pulse" />}
                            <span>{weekPaid ? 'Weekly Contribution Paid' : 'Weekly Contribution Due'}</span>
                        </div>
                    </div>

                    <div className="space-y-4 pt-2 border-t border-gray-50 dark:border-gray-800">
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600 dark:text-gray-400 font-medium">Payout Progress</span>
                                <span className="font-bold text-gray-900 dark:text-gray-200">Week {currentWeek} / {duration}</span>
                            </div>
                            <Progress value={(currentWeek / duration) * 100} className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full" />
                            <div className="flex justify-between text-[10px] text-gray-400 font-medium">
                                <span>{Math.round((currentWeek / duration) * 100)}% through Season</span>
                                <span>₦{formatCurrency(getPayout(fixedAmount))} Total Payout</span>
                            </div>
                        </div>
                    </div>
                </CardContent>

                <CardFooter className="flex flex-col gap-2 pt-2">
                    {turnCount > 0 ? (
                        <Button
                            className={`w-full font-semibold ${!canWithdraw ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}`}
                            onClick={async () => {
                                if (onWithdraw && canWithdraw) {
                                    setWithdrawing(true);
                                    await onWithdraw();
                                    setWithdrawing(false);
                                }
                            }}
                            disabled={withdrawing || !canWithdraw}
                            variant={!canWithdraw ? 'ghost' : 'default'}
                        >
                            {withdrawing ? "Processing..." :
                                !canWithdraw ? `Withdrawn ₦${formatCurrency(getPayout(fixedAmount))}` :
                                    "Withdraw Payout"}
                        </Button>
                    ) : (
                        <Button className="w-full bg-gray-100 text-gray-400 border border-gray-200 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-500 cursor-not-allowed" variant="ghost" disabled>
                            <Lock className="w-3.5 h-3.5 mr-2" /> Payout Locked
                        </Button>
                    )}

                    {!weekPaid && (
                        <Button className="w-full bg-gray-900 hover:bg-gray-800 text-white dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200 font-semibold" onClick={onDeposit}>
                            Pay Weekly
                        </Button>
                    )}
                    {weekPaid && !isMyTurn && (
                        <Button className="w-full bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-not-allowed font-medium text-sm" disabled>
                            <CheckCircle className="w-4 h-4 mr-2" /> Weekly Limit Reached
                        </Button>
                    )}
                    {onAdvanceDeposit && (
                        <Button
                            variant="secondary"
                            className="w-full bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200 font-bold"
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
        <Card className="flex flex-col relative overflow-hidden bg-white dark:bg-gray-900 border-l-4 border-l-orange-500 shadow-sm hover:shadow-md transition-shadow group">
            <CardHeader className="pb-4">
                <div className="flex justify-between items-start">
                    <div>
                        <Badge variant="secondary" className="mb-2 bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100">
                            Digital Ajo
                        </Badge>
                        <CardTitle className="text-xl font-bold text-gray-900 dark:text-white">
                            {plan.name}
                        </CardTitle>
                    </div>
                    {plan.config?.season_start_date && (
                        <div className="flex flex-col items-end">
                            <span className="text-[10px] uppercase text-gray-400 font-bold tracking-wider">Starts</span>
                            <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded border border-emerald-100 dark:border-emerald-800">
                                <Calendar className="w-3 h-3" />
                                {new Date(plan.config.season_start_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </span>
                        </div>
                    )}
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium leading-relaxed mt-1 line-clamp-2">
                    A secure, digital version of the traditional Ajo/Esusu group savings. Contribute weekly and take turns cashing out!
                </p>
            </CardHeader>

            <CardContent className="flex-1 space-y-6 pt-2">
                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Select Contribution</label>
                    <Select value={selectedAmount} onValueChange={setSelectedAmount}>
                        <SelectTrigger className="h-9 font-medium text-sm bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:ring-emerald-500">
                            <SelectValue placeholder="Choose amount..." />
                        </SelectTrigger>
                        <SelectContent>
                            {amounts.map((amt: number) => (
                                <SelectItem key={amt} value={amt.toString()} disabled={amt === 100000} className="py-2">
                                    <div className="flex items-center justify-between w-full min-w-[200px]">
                                        <span className="font-bold text-gray-900 dark:text-white text-sm">₦{formatCurrency(amt)}</span>
                                        {amt === 100000 && <Badge variant="outline" className="ml-2 text-[10px] h-5">Full</Badge>}
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {selectedAmount && plan.config?.duration_weeks ? (
                    <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-3 border border-emerald-100 dark:border-emerald-800">
                        <div className="flex justify-between items-center mb-3 pb-3 border-b border-emerald-200 dark:border-emerald-800/50">
                            <div>
                                <p className="text-emerald-900/60 dark:text-emerald-100/60 text-[10px] font-bold uppercase tracking-wider">Duration</p>
                                <p className="text-sm font-bold text-emerald-900 dark:text-emerald-100">{plan.config.duration_weeks} Weeks</p>
                            </div>
                            <div className="text-right">
                                <p className="text-emerald-900/60 dark:text-emerald-100/60 text-[10px] font-bold uppercase tracking-wider">Weekly</p>
                                <p className="text-sm font-bold text-emerald-900 dark:text-emerald-100">₦{formatCurrency(Number(selectedAmount))}</p>
                            </div>
                        </div>
                        <div className="flex justify-between items-end">
                            <div>
                                <p className="text-emerald-900/60 dark:text-emerald-100/60 text-[10px] font-bold uppercase tracking-wider mb-0.5">Total Payout</p>
                                <p className="text-xl font-black tracking-tight text-emerald-600 dark:text-emerald-400">
                                    ₦{formatCurrency(Number(selectedAmount) * plan.config.duration_weeks)}
                                </p>
                            </div>
                            <Coins className="w-6 h-6 text-emerald-300 dark:text-emerald-700/50" />
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4 pt-2">
                        <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-100 dark:border-orange-800">
                            <h4 className="text-[10px] font-bold text-orange-800 dark:text-orange-400 uppercase tracking-wider mb-2">Ajo Circle Rules</h4>
                            <ul className="space-y-1.5 mb-4">
                                <li className="flex items-center gap-2 text-xs text-orange-700 dark:text-orange-400">
                                    <div className="w-1 h-1 rounded-full bg-orange-500" />
                                    Weekly contributions for {plan.config?.duration_weeks || duration} weeks
                                </li>
                                <li className="flex items-center gap-2 text-xs text-orange-700 dark:text-orange-400">
                                    <div className="w-1 h-1 rounded-full bg-orange-500" />
                                    Properly managed picking turn(s)
                                </li>
                                <li className="flex items-center gap-2 text-xs text-orange-700 dark:text-orange-400">
                                    <div className="w-1 h-1 rounded-full bg-orange-500" />
                                    Strict penalties for skipped payments
                                </li>
                                <li className="flex items-center gap-2 text-xs text-orange-700 dark:text-orange-400">
                                    <div className="w-1 h-1 rounded-full bg-orange-500" />
                                    Weekly payout fee auto-deducted
                                </li>
                            </ul>

                            <div className="rounded border border-orange-200 dark:border-orange-800 overflow-hidden">
                                <table className="w-full text-[10px] text-left">
                                    <thead className="bg-orange-100/50 dark:bg-orange-900/40 font-bold text-orange-800 dark:text-orange-400">
                                        <tr>
                                            <th className="px-2 py-1">Weekly Amount</th>
                                            <th className="px-2 py-1 text-right">Payout Fee</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-orange-100 dark:divide-orange-800 text-orange-700 dark:text-orange-400">
                                        <tr>
                                            <td className="px-2 py-1">₦10,000 - ₦14,999</td>
                                            <td className="px-2 py-1 text-right font-bold">₦200</td>
                                        </tr>
                                        <tr>
                                            <td className="px-2 py-1">₦15,000 - ₦19,999</td>
                                            <td className="px-2 py-1 text-right font-bold">₦300</td>
                                        </tr>
                                        <tr>
                                            <td className="px-2 py-1">₦20,000 - ₦99,999</td>
                                            <td className="px-2 py-1 text-right font-bold">₦500</td>
                                        </tr>
                                        <tr>
                                            <td className="px-2 py-1">₦100,000 and above</td>
                                            <td className="px-2 py-1 text-right font-bold">₦1,000</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700 p-4 flex flex-col items-center justify-center text-center space-y-2 h-[120px] bg-white/50 dark:bg-black/20">
                            <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded-full">
                                <TrendingUp className="w-5 h-5 text-gray-400" />
                            </div>
                            <p className="text-xs font-medium text-gray-500">Select an amount to calculate payout</p>
                            {!plan.config?.duration_weeks && <p className="text-[10px] text-amber-500 font-bold">Season duration pending</p>}
                        </div>
                    </div>
                )}
            </CardContent>

            <CardFooter className="pt-2">
                <Button
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                    onClick={handleJoin}
                    disabled={!selectedAmount || !plan.config?.duration_weeks}
                >
                    {plan.config?.duration_weeks ? 'Join Circle Now' : 'Awaiting Config'}
                </Button>
            </CardFooter>
        </Card>
    );
}
