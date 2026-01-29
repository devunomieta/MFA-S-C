import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/app/components/ui/table";
import { Badge } from "@/app/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export function MonthlyBloomAdminView() {
    const [loading, setLoading] = useState(true);
    const [plans, setPlans] = useState<any[]>([]);
    const [processingId, setProcessingId] = useState<string | null>(null);

    const fetchPlans = async () => {
        setLoading(true);
        // 1. Get Monthly Bloom Plan ID
        const { data: planTypeData } = await supabase
            .from('plans')
            .select('id')
            .eq('type', 'monthly_bloom')
            .single();

        if (!planTypeData) {
            setLoading(false);
            return;
        }

        const { data, error } = await supabase
            .from('user_plans')
            .select(`
                *,
                user:profiles(full_name, email)
            `)
            .eq('plan_id', planTypeData.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error(error);
            toast.error("Failed to load subscribers");
        } else {
            setPlans(data || []);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchPlans();
    }, []);

    const handleSettleMonth = async () => {
        if (!confirm("Are you sure you want to FORCE SETTLE the month? This should usually happen on the last day of the month.")) return;
        setProcessingId("settle");
        try {
            const { data, error } = await supabase.rpc('settle_monthly_bloom_month');
            if (error) throw error;
            toast.success(`Settlement Complete. Processed ${data.settled_count} plans.`);
            fetchPlans();
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setProcessingId(null);
        }
    };

    const handleTriggerAutoSave = async () => {
        setProcessingId("autosave");
        try {
            const { error } = await supabase.rpc('trigger_monthly_bloom_auto_save');
            // Data is an array of results
            if (error) throw error;
            toast.success(`Auto-Save Triggered.`);
            fetchPlans();
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setProcessingId(null);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-pink-50 border-pink-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-pink-800">Total Subscribers</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-pink-900">{plans.length}</div>
                    </CardContent>
                </Card>
                <Card className="bg-purple-50 border-purple-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-purple-800">Active Arrears</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-purple-900">
                            {formatCurrency(plans.reduce((acc, curr) => acc + (parseFloat(curr.plan_metadata?.arrears || '0')), 0))}
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-gray-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-800">Admin Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleSettleMonth}
                            disabled={!!processingId}
                            className="text-orange-600 border-orange-200 hover:bg-orange-50"
                        >
                            {processingId === 'settle' && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
                            Force Month Settlement
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleTriggerAutoSave}
                            disabled={!!processingId}
                            className="text-blue-600 border-blue-200 hover:bg-blue-50"
                        >
                            {processingId === 'autosave' && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
                            Trigger Auto-Save
                        </Button>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Subscriber List</CardTitle>
                    <CardDescription>Monitor user progress and monthly compliance.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>User</TableHead>
                                <TableHead>Duration</TableHead>
                                <TableHead>Target</TableHead>
                                <TableHead>Progress (Month)</TableHead>
                                <TableHead>Paid This Month</TableHead>
                                <TableHead>Arrears</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8">Loading...</TableCell>
                                </TableRow>
                            ) : plans.map((plan) => {
                                const meta = plan.plan_metadata || {};
                                const target = meta.target_amount || 0;
                                const monthPaid = meta.month_paid_so_far || 0;
                                const arrears = meta.arrears || 0;
                                const monthsCompleted = meta.months_completed || 0;
                                const duration = meta.selected_duration || 0;

                                return (
                                    <TableRow key={plan.id}>
                                        <TableCell>
                                            <div className="font-medium text-xs">{plan.user?.full_name || 'Unknown'}</div>
                                            <div className="text-[10px] text-gray-500">{plan.user?.email}</div>
                                        </TableCell>
                                        <TableCell>{duration} Months</TableCell>
                                        <TableCell>{formatCurrency(target)}</TableCell>
                                        <TableCell>
                                            <span className="font-medium">Month {monthsCompleted + 1}</span>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1">
                                                {formatCurrency(monthPaid)}
                                                {monthPaid >= target && <Badge variant="outline" className="text-[10px] bg-green-50 text-green-700 border-green-200">Met</Badge>}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {arrears > 0 ? (
                                                <Badge variant="outline" className="text-[10px] bg-red-50 text-red-700 border-red-200">
                                                    {formatCurrency(arrears)}
                                                </Badge>
                                            ) : '-'}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={plan.status === 'active' ? 'default' : 'secondary'} className="text-[10px]">
                                                {plan.status}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
