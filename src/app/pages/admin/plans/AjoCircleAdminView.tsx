import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/app/components/ui/table";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/app/components/ui/dialog";
import { Input } from "@/app/components/ui/input";
import { Loader2, Calendar, Play, Settings } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";

export function AjoCircleAdminView() {
    const [subscribers, setSubscribers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [newDuration, setNewDuration] = useState(10);
    const [newStartDate, setNewStartDate] = useState("");


    useEffect(() => {
        fetchSubscribers();
    }, []);

    const fetchSubscribers = async () => {
        // Get Plan ID
        const { data: planData } = await supabase.from("plans").select("id").eq("type", "ajo_circle").single();

        if (planData) {
            const { data, error } = await supabase
                .from("user_plans")
                .select("*, profiles(full_name, email)")
                .eq("plan_id", planData.id)
                .neq("status", "cancelled");

            if (error) {
                console.error("Error fetching subscribers:", error);
                toast.error("Failed to load subscribers");
            } else {
                setSubscribers(data || []);
            }
        }
        setLoading(false);
    };

    const handleAssignTurn = async (userPlanId: string, turn: string) => {
        if (!turn) return;
        const week = parseInt(turn);

        // Fetch current picking turns
        const subscriber = subscribers.find(s => s.id === userPlanId);
        if (!subscriber) return;

        let currentTurns = subscriber.plan_metadata.picking_turns || [];

        // Toggle: If exists, remove. If not, add (max 2).
        if (currentTurns.includes(week)) {
            currentTurns = currentTurns.filter((t: number) => t !== week);
        } else {
            if (currentTurns.length >= 2) {
                toast.error("Max 2 picking turns allowed per user.");
                return;
            }
            currentTurns.push(week);
            currentTurns.sort((a: number, b: number) => a - b);
        }

        const updatedMetadata = {
            ...subscriber.plan_metadata,
            picking_turns: currentTurns
        };

        const { error } = await supabase
            .from("user_plans")
            .update({ plan_metadata: updatedMetadata })
            .eq("id", userPlanId);

        if (error) {
            toast.error("Failed to update picking turn.");
        } else {
            toast.success("Picking turns updated.");
            fetchSubscribers();
        }
    };

    const triggerWeeklySettlement = async () => {
        if (!confirm("Are you sure you want to settle the week? This will apply penalties for missed payments and advance the week.")) return;
        setProcessing(true);
        const { error } = await supabase.rpc('settle_ajo_circle_week');
        if (error) {
            toast.error(`Settlement failed: ${error.message}`);
        } else {
            toast.success("Weekly settlement completed.");
            fetchSubscribers();
        }
        setProcessing(false);
    };

    const triggerAutoSave = async () => {
        setProcessing(true);
        const { error } = await supabase.rpc('trigger_ajo_circle_auto_save');
        if (error) {
            toast.error(`Auto-Save failed: ${error.message}`);
        } else {
            toast.success("Auto-Save trigger executed. Check logs/results.");
            fetchSubscribers();
        }
        setProcessing(false);
    };

    const updateSeasonConfig = async () => {
        setProcessing(true);
        // Fetch current config first to preserve amounts/fees
        const { data: plan } = await supabase.from('plans').select('config').eq('type', 'ajo_circle').single();
        if (!plan) return;

        const newConfig = {
            ...plan.config,
            duration_weeks: newDuration,
            season_start_date: newStartDate
        };

        const { error } = await supabase
            .from('plans')
            .update({
                config: newConfig,
                duration_weeks: newDuration
            })
            .eq('type', 'ajo_circle');

        if (error) {
            toast.error("Failed to update season config");
        } else {
            toast.success("Season configuration updated!");
        }
        setProcessing(false);
    };



    const formatCurrency = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'NGN' }).format(val);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Ajo Circle Management</h2>
                    <p className="text-sm text-gray-500">Manage picking turns and weekly progress.</p>
                </div>
                <div className="flex gap-2">
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="outline"><Settings className="w-4 h-4 mr-2" /> Ajo Settings</Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Configure Ajo Season</DialogTitle>
                                <DialogDescription>Set the duration and start date for the next circle.</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Duration (Weeks)</label>
                                    <Input
                                        type="number"
                                        value={newDuration}
                                        onChange={(e) => setNewDuration(Number(e.target.value))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Start Date</label>
                                    <Input
                                        type="date"
                                        value={newStartDate}
                                        onChange={(e) => setNewStartDate(e.target.value)}
                                    />
                                </div>
                                <Button className="w-full" onClick={updateSeasonConfig} disabled={processing}>
                                    {processing ? 'Updating...' : 'Update Season'}
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>

                    <Button variant="outline" onClick={triggerAutoSave} disabled={processing}>
                        <Play className="w-4 h-4 mr-2" /> Trigger Auto-Save
                    </Button>
                    <Button variant="destructive" onClick={triggerWeeklySettlement} disabled={processing}>
                        <Calendar className="w-4 h-4 mr-2" /> Settle Week
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Active Subscribers ({subscribers.length})</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>User</TableHead>
                                    <TableHead>Amount</TableHead>
                                    <TableHead>Week</TableHead>
                                    <TableHead>Picking Turns</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {subscribers.map((sub) => {
                                    const meta = sub.plan_metadata || {};
                                    const turns = meta.picking_turns || [];
                                    const currentWeek = meta.current_week || 1;
                                    const weekPaid = meta.week_paid || false;

                                    return (
                                        <TableRow key={sub.id}>
                                            <TableCell>
                                                <div className="font-medium">{sub.profiles?.full_name || 'Unknown'}</div>
                                                <div className="text-xs text-gray-500">{sub.profiles?.email}</div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="font-mono">{formatCurrency(meta.fixed_amount)}</div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline">W{currentWeek}</Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-wrap gap-1">
                                                    {turns.length > 0 ? (
                                                        turns.map((t: number) => (
                                                            <Badge key={t} className="bg-indigo-100 text-indigo-800 hover:bg-indigo-200">Week {t}</Badge>
                                                        ))
                                                    ) : (
                                                        <span className="text-gray-400 text-sm">None Assigned</span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {weekPaid ? (
                                                    <Badge className="bg-emerald-100 text-emerald-800">Paid</Badge>
                                                ) : (
                                                    <Badge variant="destructive">Due</Badge>
                                                )}
                                                {meta.missed_weeks > 0 && (
                                                    <div className="text-xs text-red-500 mt-1">{meta.missed_weeks} Missed</div>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Select onValueChange={(val) => handleAssignTurn(sub.id, val)}>
                                                    <SelectTrigger className="w-[140px]">
                                                        <SelectValue placeholder="Assign Turn" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(w => (
                                                            <SelectItem key={w} value={w.toString()}>
                                                                Week {w} {turns.includes(w) ? '(Remove)' : ''}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
