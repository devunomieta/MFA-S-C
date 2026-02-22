import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Plan, UserPlan } from "@/types";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/app/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Input } from "@/app/components/ui/input";
import { Button } from "@/app/components/ui/button";
import { Search, AlertTriangle, Play } from "lucide-react";
import { toast } from "sonner";

interface StepUpAdminViewProps {
    plan: Plan;
}

// Extended UserPlan to include profile for admin view
interface UserPlanWithProfile extends UserPlan {
    profiles: {
        full_name: string;
        email: string;
    };
}

export function StepUpAdminView({ plan }: StepUpAdminViewProps) {
    const [subscribers, setSubscribers] = useState<UserPlanWithProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    // Removed unused processingId state as it wasn't used in the simplified handleSettleWeek

    useEffect(() => {
        fetchSubscribers();
    }, [plan.id]);

    async function fetchSubscribers() {
        setLoading(true);
        const { data, error } = await supabase
            .from('user_plans')
            .select('*, profiles(full_name, email)')
            .eq('plan_id', plan.id)
            .order('created_at', { ascending: false });

        if (!error && data) {
            setSubscribers(data as any);
        }
        setLoading(false);
    }

    async function handleSettleWeek() {
        if (!confirm("Force Settle Week for ALL active users? \n\nThis will check if they met their FIXED TARGET, apply charges or penalties, and reset their weekly counter. \n\nOnly do this if you know what you are doing (e.g. testing or missed Sunday cron job).")) return;

        setLoading(true);
        const { error, data } = await supabase.rpc('settle_step_up_week');
        setLoading(false);

        if (error) {
            toast.error("Settlement Failed: " + error.message);
        } else {
            toast.success("Week Settled Successfully.");
            console.log("Settlement Result:", data);
            fetchSubscribers();
        }
    }

    async function handleTriggerAutoSave() {
        if (!confirm("Run AUTO-SAVE Logic? \n\nThis simulates the Sunday 6:00 AM Cron Job.\nIt will attempt to cover deficits from General Wallet.")) return;

        setLoading(true);
        const { error } = await supabase.rpc('trigger_step_up_auto_save');
        setLoading(false);

        if (error) {
            toast.error("Auto-Save Job Failed: " + error.message);
        } else {
            toast.success(`Auto-Save Job Executed. Check logs/data.`);
            fetchSubscribers();
        }
    }

    const formatCurrency = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'NGN' }).format(val);

    const filteredSubs = subscribers.filter(sub =>
        sub.profiles?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        sub.profiles?.email?.toLowerCase().includes(search.toLowerCase())
    );

    // Stats
    const totalSaved = subscribers.reduce((acc, sub) => acc + sub.current_balance, 0);
    const totalArrears = subscribers.reduce((acc, sub) => acc + (sub.plan_metadata?.arrears_amount || 0), 0);

    const activeUsers = subscribers.filter(s => s.status === 'active').length;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-purple-50 p-4 rounded-lg border border-purple-100 mb-4">
                <div>
                    <h3 className="font-bold text-purple-900">Rapid Fixed Savings Controls</h3>
                    <p className="text-sm text-purple-700">Manual triggers for recurring jobs.</p>
                </div>
                <div className="flex gap-2">
                    <Button
                        onClick={handleSettleWeek}
                        variant="destructive"
                        size="sm"
                    >
                        <Play className="w-4 h-4 mr-2" /> Force Week Settlement
                    </Button>
                    <Button
                        onClick={handleTriggerAutoSave}
                        variant="default"
                        className="bg-purple-600 hover:bg-purple-700 text-white"
                        size="sm"
                    >
                        <Play className="w-4 h-4 mr-2" /> Trigger Auto-Save
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Total Saved</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(totalSaved)}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Total Arrears (Penalties)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">{formatCurrency(totalArrears)}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Active Participants</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{activeUsers}</div>
                    </CardContent>
                </Card>
            </div>

            <div className="flex items-center justify-between">
                <div className="relative w-72">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-500" />
                    <Input
                        placeholder="Search users..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-8"
                    />
                </div>
            </div>

            <div className="rounded-md border bg-white">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>User</TableHead>
                            <TableHead>Duration</TableHead>
                            <TableHead>Target Amount</TableHead>
                            <TableHead>Week Progress</TableHead>
                            <TableHead>This Week Paid</TableHead>
                            <TableHead>Arrears</TableHead>
                            <TableHead>Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-8 text-slate-500">Loading subscribers...</TableCell>
                            </TableRow>
                        ) : filteredSubs.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-8 text-slate-500">No subscribers found.</TableCell>
                            </TableRow>
                        ) : (
                            filteredSubs.map((sub) => {
                                const meta = sub.plan_metadata || {};
                                const weeksCompleted = meta.weeks_completed || 0;
                                const weekPaid = meta.week_paid_so_far || 0;
                                const totalWeeks = meta.selected_duration || 0;
                                const fixedAmount = meta.fixed_amount || 0;
                                const arrears = meta.arrears_amount || 0;
                                const isGoalMet = weekPaid >= fixedAmount;

                                return (
                                    <TableRow key={sub.id}>
                                        <TableCell>
                                            <div className="font-medium">{sub.profiles?.full_name || 'Unknown'}</div>
                                            <div className="text-xs text-slate-500">{sub.profiles?.email}</div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Badge variant="secondary">{totalWeeks} Wks</Badge>
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-mono font-medium">
                                            {formatCurrency(fixedAmount)}
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-xs">{weeksCompleted} / {totalWeeks}</span>
                                        </TableCell>
                                        <TableCell>
                                            <div className="space-y-1">
                                                <div className="flex justify-between text-xs">
                                                    <span className={isGoalMet ? "text-emerald-600 font-bold" : "text-slate-600"}>
                                                        {formatCurrency(weekPaid)}
                                                    </span>
                                                </div>
                                                <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full ${isGoalMet ? 'bg-emerald-500' : 'bg-purple-400'}`}
                                                        style={{ width: `${Math.min((weekPaid / fixedAmount) * 100, 100)}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {arrears > 0 ? (
                                                <div className="flex items-center text-red-600 gap-1 text-xs font-bold">
                                                    <AlertTriangle className="w-3.5 h-3.5" />
                                                    {formatCurrency(arrears)}
                                                </div>
                                            ) : (
                                                <span className="text-slate-400">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <span className={`text-xs font-medium px-2 py-1 rounded-full ${sub.status === 'active' ? 'bg-emerald-50 text-emerald-700' :
                                                sub.status === 'completed' ? 'bg-blue-50 text-blue-700' :
                                                    'bg-slate-100 text-slate-600'
                                                }`}>
                                                {sub.status.replace('_', ' ')}
                                            </span>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
