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

interface SprintAdminViewProps {
    plan: Plan;
}

// Extended UserPlan to include profile for admin view
interface UserPlanWithProfile extends UserPlan {
    profiles: {
        full_name: string;
        email: string;
    };
}

export function SprintAdminView({ plan }: SprintAdminViewProps) {
    const [subscribers, setSubscribers] = useState<UserPlanWithProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [processingId, setProcessingId] = useState<string | null>(null);

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

    async function handleSettleWeek(userPlanId: string) {
        if (!confirm("Force Settle Week for this user? This will check if they met the 3k target, apply fees or penalties, and reset their weekly counter. Only do this if you know what you are doing (e.g. testing or missed cron job).")) return;

        setProcessingId(userPlanId);
        const { error, data } = await supabase.rpc('settle_sprint_week', { p_user_plan_id: userPlanId });

        if (error) {
            toast.error("Settlement Failed: " + error.message);
        } else {
            toast.success("Week Settled Successfully.");
            console.log("Settlement Result:", data);
            fetchSubscribers();
        }
        setProcessingId(null);
    }

    async function handleTriggerAutoSave() {
        if (!confirm("Run AUTO-SAVE Logic? \n\nThis simulates the Sunday 6:00 AM Cron Job.\nIt will check all active users, and if they haven't met the ₦3,000 target, it will attempt to pull funds from their General Wallet to avoid penalties.")) return;

        setLoading(true);
        const { data, error } = await supabase.rpc('trigger_sprint_auto_save');
        setLoading(false);

        if (error) {
            toast.error("Auto-Save Job Failed: " + error.message);
        } else {
            const covered = data.filter((d: any) => d.status === 'Covered');
            const failed = data.filter((d: any) => d.status === 'Insufficient Funds');

            toast.success(`Auto-Save Complete! Covered: ${covered.length}, Failed: ${failed.length}`, {
                duration: 5000,
                description: failed.length > 0 ? `Failed for: ${failed.map((f: any) => f.full_name).join(', ')}` : "All deficits covered or no deficits found."
            });
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
            <div className="flex justify-between items-center bg-blue-50 p-4 rounded-lg border border-blue-100 mb-4">
                <div>
                    <h3 className="font-bold text-blue-900">30-Weeks Saving Sprint Controls</h3>
                    <p className="text-sm text-blue-700">Manual triggers for recurring jobs.</p>
                </div>
                <Button
                    onClick={handleTriggerAutoSave}
                    variant="default"
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                    <Play className="w-4 h-4 mr-2" /> Trigger Sunday Auto-Save
                </Button>
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
                            <TableHead>Week Progress</TableHead>
                            <TableHead>Current Balance</TableHead>
                            <TableHead>Arrears</TableHead>
                            <TableHead>This Week Paid</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
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
                                const currentWeekTotal = meta.current_week_total || 0;
                                const arrears = meta.arrears_amount || 0;
                                const target = 3000;
                                const isGoalMet = currentWeekTotal >= target;

                                return (
                                    <TableRow key={sub.id}>
                                        <TableCell>
                                            <div className="font-medium">{sub.profiles?.full_name || 'Unknown'}</div>
                                            <div className="text-xs text-slate-500">{sub.profiles?.email}</div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline">{weeksCompleted + 1} / 30</Badge>
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-mono font-medium">
                                            {formatCurrency(sub.current_balance)}
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
                                            <div className="space-y-1">
                                                <div className="flex justify-between text-xs">
                                                    <span className={isGoalMet ? "text-emerald-600 font-bold" : "text-slate-600"}>
                                                        {formatCurrency(currentWeekTotal)}
                                                    </span>
                                                    <span className="text-slate-400">/ 3k</span>
                                                </div>
                                                <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full ${isGoalMet ? 'bg-emerald-500' : 'bg-amber-400'}`}
                                                        style={{ width: `${Math.min((currentWeekTotal / target) * 100, 100)}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <span className={`text-xs font-medium px-2 py-1 rounded-full ${sub.status === 'active' ? 'bg-emerald-50 text-emerald-700' :
                                                sub.status === 'pending_activation' ? 'bg-amber-50 text-amber-700' :
                                                    'bg-slate-100 text-slate-600'
                                                }`}>
                                                {sub.status.replace('_', ' ')}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-7 text-xs border-slate-200"
                                                onClick={() => handleSettleWeek(sub.id)}
                                                disabled={processingId === sub.id}
                                            >
                                                <Play className="w-3 h-3 mr-1" />
                                                {processingId === sub.id ? "Settling..." : "Settle Week"}
                                            </Button>
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
