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
import { Search, Play, Calendar } from "lucide-react";
import { toast } from "sonner";

interface DailyDropAdminViewProps {
    plan: Plan;
}

// Extended UserPlan to include profile
interface UserPlanWithProfile extends UserPlan {
    profiles: {
        full_name: string;
        email: string;
    };
}

export function DailyDropAdminView({ plan }: DailyDropAdminViewProps) {
    const [subscribers, setSubscribers] = useState<UserPlanWithProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

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

    async function handleTriggerAutoSave() {
        if (!confirm("Run AUTO-DROP Logic? \n\nThis simulates the Daily 11:59PM Cron Job.\nIt will check all active users, and if they haven't made a deposit TODAY, it will attempt to pull their FIXED AMOUNT from their General Wallet.")) return;

        setLoading(true);
        const { data, error } = await supabase.rpc('trigger_daily_drop_auto_save');
        setLoading(false);

        if (error) {
            toast.error("Auto-Drop Job Failed: " + error.message);
        } else {
            const covered = data.filter((d: any) => d.status === 'Covered');
            const failed = data.filter((d: any) => d.status === 'Insufficient Funds');

            toast.success(`Complete! Covered: ${covered.length}, Failed: ${failed.length}`, {
                duration: 5000,
                description: failed.length > 0 ? `Failed for: ${failed.map((f: any) => f.full_name).join(', ')}` : "All deficits covered."
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
    const activeUsers = subscribers.filter(s => s.status === 'active').length;
    // Calculate total days accumulated across all users
    const totalDaysAcrossUsers = subscribers.reduce((acc, sub) => acc + (sub.plan_metadata?.total_days_paid || 0), 0);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-cyan-50 p-4 rounded-lg border border-cyan-100 mb-4">
                <div>
                    <h3 className="font-bold text-cyan-900">Daily Savings Controls</h3>
                    <p className="text-sm text-cyan-700">Daily Trigger (Run at 23:59)</p>
                </div>
                <Button
                    onClick={handleTriggerAutoSave}
                    variant="default"
                    className="bg-cyan-600 hover:bg-cyan-700 text-white"
                >
                    <Play className="w-4 h-4 mr-2" /> Trigger Daily Auto-Drop
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
                        <CardTitle className="text-sm font-medium text-slate-500">Total Days Saved</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-cyan-600">{totalDaysAcrossUsers} Days</div>
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
                            <TableHead>Target (Duration)</TableHead>
                            <TableHead>Fixed Amount</TableHead>
                            <TableHead>Days Paid</TableHead>
                            <TableHead>Current Balance</TableHead>
                            <TableHead>Last Payment</TableHead>
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
                                const duration = meta.selected_duration || 31;
                                const daysPaid = meta.total_days_paid || 0;
                                const fixedAmount = meta.fixed_amount || 0;
                                const lastDate = meta.last_payment_date ? new Date(meta.last_payment_date).toLocaleDateString() : 'Never';

                                return (
                                    <TableRow key={sub.id}>
                                        <TableCell>
                                            <div className="font-medium">{sub.profiles?.full_name || 'Unknown'}</div>
                                            <div className="text-xs text-slate-500">{sub.profiles?.email}</div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{duration === -1 ? 'Unlimited' : `${duration} Days`}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-mono">{formatCurrency(fixedAmount)}</div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-cyan-700">{daysPaid}</span>
                                                {duration !== -1 && <span className="text-xs text-slate-400">/ {duration}</span>}
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-mono font-medium">
                                            {formatCurrency(sub.current_balance)}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center text-xs text-slate-600">
                                                <Calendar className="w-3 h-3 mr-1" />
                                                {lastDate}
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
