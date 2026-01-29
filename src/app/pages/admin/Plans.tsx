import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/app/components/ui/button";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Eye, EyeOff, RotateCcw, Users, Settings, Activity, Anchor, Droplets, TrendingUp } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/app/components/ui/dialog";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Textarea } from "@/app/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/app/components/ui/table";
import { MarathonAdminView } from "./plans/MarathonAdminView";
import { SprintAdminView } from "./plans/SprintAdminView";
import { AnchorAdminView } from "./plans/AnchorAdminView";
import { DailyDropAdminView } from "./plans/DailyDropAdminView";
import { StepUpAdminView } from "./plans/StepUpAdminView";
import { MonthlyBloomAdminView } from "./plans/MonthlyBloomAdminView";
import { AjoCircleAdminView } from "./plans/AjoCircleAdminView";
import { Plan } from "@/types";

export function AdminPlans() {
    const [plans, setPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingPlan, setEditingPlan] = useState<any>(null);

    // Form State
    const [formData, setFormData] = useState({
        name: "",
        min_amount: "",
        duration_weeks: "",
        service_charge: "",
        description: "",
        whatsapp_link: "",
        contribution_type: "flexible", // 'fixed' or 'flexible'
        fixed_amount: "",
        start_date: ""
    });

    useEffect(() => {
        fetchPlans();
    }, []);

    async function fetchPlans() {
        setLoading(true);
        const { data, error } = await supabase
            .from('plans')
            .select('*, user_plans(count)')
            .order('created_at', { ascending: false });

        if (error) {
            toast.error("Failed to fetch plans");
        } else {
            const plansWithCount = data?.map((p: any) => ({
                ...p,
                subscriber_count: p.user_plans?.[0]?.count || 0
            })) || [];
            setPlans(plansWithCount);
        }
        setLoading(false);
    }

    const resetForm = () => {
        setFormData({
            name: "",
            min_amount: "",
            duration_weeks: "",
            service_charge: "",
            description: "",
            whatsapp_link: "",
            contribution_type: "flexible",
            fixed_amount: "",
            start_date: ""
        });
        setEditingPlan(null);
    };

    const handleEdit = (plan: any) => {
        setEditingPlan(plan);
        setFormData({
            name: plan.name,
            min_amount: plan.min_amount || "",
            duration_weeks: plan.duration_weeks || "",
            service_charge: plan.service_charge,
            description: plan.description || "",
            whatsapp_link: plan.whatsapp_link || "",
            contribution_type: plan.contribution_type || "flexible",
            fixed_amount: plan.fixed_amount || "",
            start_date: plan.start_date || ""
        });
        setIsDialogOpen(true);
    };

    const handleDelete = async (planId: string) => {
        if (!confirm("Are you sure? This will hide the plan from new users.")) return;

        const { error } = await supabase.from('plans').delete().eq('id', planId);
        if (error) {
            toast.error("Cannot delete plan. It likely has active subscribers.");
        } else {
            toast.success("Plan deleted.");
            fetchPlans();
        }
    };

    const handleToggleVisibility = async (plan: any) => {
        const newStatus = !plan.is_active;
        const { error } = await supabase
            .from('plans')
            .update({ is_active: newStatus })
            .eq('id', plan.id);

        if (error) {
            toast.error("Failed to update visibility");
            console.error(error);
        } else {
            toast.success(newStatus ? "Plan is now visible" : "Plan hidden from dashboard");
            fetchPlans();
        }
    };

    const handleResetPlan = async (plan: any) => {
        if (!confirm(`WARNING: This will remove ALL ${plan.subscriber_count} subscribers from "${plan.name}".\n\nThey will be removed from the plan and their progress resets. Funds are NOT automatically refunded (handled separately). \n\nContinue?`)) return;

        const { error } = await supabase
            .from('user_plans')
            .delete()
            .eq('plan_id', plan.id);

        if (error) {
            toast.error("Failed to reset plan: " + error.message);
        } else {
            toast.success("All users removed from plan.");
            fetchPlans();
        }
    };

    const handleSubmit = async () => {
        const payload = {
            name: formData.name,
            min_amount: Number(formData.min_amount),
            duration_weeks: Number(formData.duration_weeks),
            duration_months: Math.ceil(Number(formData.duration_weeks) / 4), // Fallback
            service_charge: Number(formData.service_charge),
            description: formData.description,
            whatsapp_link: formData.whatsapp_link,
            contribution_type: formData.contribution_type,
            fixed_amount: formData.contribution_type === 'fixed' ? Number(formData.fixed_amount) : null,
            start_date: formData.start_date || null
        };

        let error;
        if (editingPlan) {
            const { error: updateError } = await supabase
                .from('plans')
                .update(payload)
                .eq('id', editingPlan.id);
            error = updateError;
        } else {
            const { error: insertError } = await supabase
                .from('plans')
                .insert([payload]);
            error = insertError;
        }

        if (error) {
            toast.error("Failed to save plan: " + error.message);
        } else {
            toast.success(editingPlan ? "Plan updated" : "Plan created");
            setIsDialogOpen(false);
            fetchPlans();
            resetForm();
        }
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(value);
    };

    const marathonPlan = plans.find(p => p.type === 'marathon');
    const sprintPlan = plans.find(p => p.type === 'sprint');
    const anchorPlan = plans.find(p => p.type === 'anchor');
    const dailyDropPlan = plans.find(p => p.type === 'daily_drop');
    const stepUpPlan = plans.find(p => p.type === 'step_up');
    const monthlyBloomPlan = plans.find(p => p.type === 'monthly_bloom');

    return (
        <div className="space-y-6 animate-in fade-in duration-500 font-sans">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-100 pb-4">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Savings Plans Admin</h1>
                    <p className="text-gray-500 mt-1 font-medium">Manage catalog and monitor specialized plans.</p>
                </div>
            </div>

            <Tabs defaultValue="management" className="space-y-6">
                <TabsList className="bg-slate-100 p-1 flex flex-wrap h-auto w-full justify-start gap-2">
                    <TabsTrigger value="management" className="data-[state=active]:bg-white data-[state=active]:shadow-sm flex-grow md:flex-grow-0">
                        <Settings className="w-4 h-4 mr-2" />
                        Plan Config
                    </TabsTrigger>
                    {marathonPlan && (
                        <TabsTrigger value="marathon" className="data-[state=active]:bg-white data-[state=active]:shadow-sm flex-grow md:flex-grow-0">
                            <Activity className="w-4 h-4 mr-2" />
                            Marathon
                        </TabsTrigger>
                    )}
                    {sprintPlan && (
                        <TabsTrigger value="sprint" className="data-[state=active]:bg-white data-[state=active]:shadow-sm flex-grow md:flex-grow-0">
                            <Activity className="w-4 h-4 mr-2" />
                            Sprint
                        </TabsTrigger>
                    )}
                    {anchorPlan && (
                        <TabsTrigger value="anchor" className="data-[state=active]:bg-white data-[state=active]:shadow-sm flex-grow md:flex-grow-0">
                            <Anchor className="w-4 h-4 mr-2" />
                            Anchor
                        </TabsTrigger>
                    )}
                    {dailyDropPlan && (
                        <TabsTrigger value="daily_drop" className="data-[state=active]:bg-white data-[state=active]:shadow-sm flex-grow md:flex-grow-0">
                            <Droplets className="w-4 h-4 mr-2" />
                            Daily Drop
                        </TabsTrigger>
                    )}
                    {stepUpPlan && (
                        <TabsTrigger value="step_up" className="data-[state=active]:bg-white data-[state=active]:shadow-sm flex-grow md:flex-grow-0">
                            <TrendingUp className="w-4 h-4 mr-2" />
                            Step-Up
                        </TabsTrigger>
                    )}
                    {monthlyBloomPlan && (
                        <TabsTrigger value="monthly_bloom" className="data-[state=active]:bg-white data-[state=active]:shadow-sm flex-grow md:flex-grow-0">
                            <Settings className="w-4 h-4 mr-2" />
                            Monthly Bloom
                        </TabsTrigger>
                    )}
                    <TabsTrigger value="ajo_circle" className="flex-grow md:flex-grow-0">The Ajo Circle</TabsTrigger>
                </TabsList>

                <TabsContent value="management" className="space-y-6">
                    <div className="flex justify-end">
                        <Dialog open={isDialogOpen} onOpenChange={(open) => {
                            setIsDialogOpen(open);
                            if (!open) resetForm();
                        }}>
                            <DialogTrigger asChild>
                                <Button className="bg-slate-900 hover:bg-slate-800 text-white shadow-md">
                                    <Plus className="w-4 h-4 mr-2" /> Create Standard Plan
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                                <DialogHeader>
                                    <DialogTitle className="text-xl font-bold">{editingPlan ? "Edit Plan" : "Create New Plan"}</DialogTitle>
                                    <DialogDescription>
                                        Standard plans only. Specialized plans (Marathon, etc.) are managed via codebase/database.
                                    </DialogDescription>
                                </DialogHeader>
                                {/* Form Content - Simplified for brevity but functional */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                                    {editingPlan && editingPlan.type !== 'standard' && (
                                        <div className="col-span-2 p-3 bg-amber-50 text-amber-800 text-xs border border-amber-200 rounded flex items-center gap-2">
                                            <Settings className="w-4 h-4" />
                                            <span>
                                                <strong>Specialized Plan:</strong> Core configuration (Pricing, Duration) is managed via code.
                                                You can only edit the Description and WhatsApp Link.
                                            </span>
                                        </div>
                                    )}

                                    <div className="space-y-2 col-span-2">
                                        <Label>Plan Name</Label>
                                        <Input
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                            disabled={editingPlan && editingPlan.type !== 'standard'}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Type</Label>
                                        <Select
                                            value={formData.contribution_type}
                                            onValueChange={(val) => setFormData({ ...formData, contribution_type: val })}
                                            disabled={editingPlan && editingPlan.type !== 'standard'}
                                        >
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="flexible">Flexible</SelectItem>
                                                <SelectItem value="fixed">Fixed</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Amount ($)</Label>
                                        <Input
                                            type="number"
                                            value={formData.contribution_type === 'fixed' ? formData.fixed_amount : formData.min_amount}
                                            onChange={e => formData.contribution_type === 'fixed' ? setFormData({ ...formData, fixed_amount: e.target.value }) : setFormData({ ...formData, min_amount: e.target.value })}
                                            disabled={editingPlan && editingPlan.type !== 'standard'}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Weeks</Label>
                                        <Input
                                            type="number"
                                            value={formData.duration_weeks}
                                            onChange={e => setFormData({ ...formData, duration_weeks: e.target.value })}
                                            disabled={editingPlan && editingPlan.type !== 'standard'}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Service Charge ($)</Label>
                                        <Input
                                            type="number"
                                            value={formData.service_charge}
                                            onChange={e => setFormData({ ...formData, service_charge: e.target.value })}
                                            disabled={editingPlan && editingPlan.type !== 'standard'}
                                        />
                                    </div>
                                    <div className="space-y-2 col-span-2">
                                        <Label>WhatsApp Group Link</Label>
                                        <Input
                                            value={formData.whatsapp_link}
                                            onChange={e => setFormData({ ...formData, whatsapp_link: e.target.value })}
                                            placeholder="https://chat.whatsapp.com/..."
                                        />
                                    </div>
                                    <div className="space-y-2 col-span-2">
                                        <Label>Description</Label>
                                        <Textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                                    <Button onClick={handleSubmit} className="bg-slate-900 text-white">Save Plan</Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>

                    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
                        <Table>
                            <TableHeader className="bg-gray-50/50">
                                <TableRow>
                                    <TableHead className="w-[200px]">Plan Name</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Duration</TableHead>
                                    <TableHead>Service Fee</TableHead>
                                    <TableHead>Subscribers</TableHead>
                                    <TableHead className="text-right w-[100px]">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow><TableCell colSpan={6} className="text-center h-24 text-gray-500">Loading...</TableCell></TableRow>
                                ) : plans.length === 0 ? (
                                    <TableRow><TableCell colSpan={6} className="text-center h-24 text-gray-500">No plans found.</TableCell></TableRow>
                                ) : (
                                    plans.map((plan) => (
                                        <TableRow key={plan.id} className={plan.is_active === false ? 'opacity-60 bg-gray-50' : ''}>
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-2">
                                                    {plan.type === 'marathon' && <Activity className="w-3 h-3 text-emerald-600" />}
                                                    {plan.name}
                                                </div>
                                                <div className="text-[10px] text-gray-400 font-normal">{plan.description}</div>
                                            </TableCell>
                                            <TableCell>
                                                <span className="capitalize px-2 py-0.5 rounded-full bg-slate-100 text-xs">{plan.contribution_type}</span>
                                            </TableCell>
                                            <TableCell>{plan.duration_weeks || 'Flexible'} wks</TableCell>
                                            <TableCell>{formatCurrency(plan.service_charge)}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1.5 text-gray-600">
                                                    <Users className="w-3.5 h-3.5 text-gray-400" />
                                                    {plan.subscriber_count as number}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleEdit(plan)}
                                                        className="h-8 w-8 text-gray-500 hover:text-blue-600 hover:bg-blue-50"
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" onClick={() => handleToggleVisibility(plan)} className="h-8 w-8 text-gray-500">
                                                        {plan.is_active === false ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                                                    </Button>
                                                    <Button variant="ghost" size="icon" onClick={() => handleResetPlan(plan)} className="h-8 w-8 text-amber-500">
                                                        <RotateCcw className="h-4 w-4" />
                                                    </Button>
                                                    {plan.type === 'standard' && (
                                                        <Button variant="ghost" size="icon" onClick={() => handleDelete(plan.id)} className="h-8 w-8 text-red-500">
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </TabsContent>

                {marathonPlan && (
                    <TabsContent value="marathon">
                        <div className="flex items-center justify-between mb-4 bg-emerald-50 p-4 rounded-lg border border-emerald-100">
                            <div>
                                <h2 className="text-lg font-bold text-emerald-900">Marathon Dashboard</h2>
                                <p className="text-sm text-emerald-700">Monitor all 30/48 week challenge participants.</p>
                            </div>
                            <Button variant="outline" className="border-emerald-200 text-emerald-700 hover:bg-emerald-100" asChild>
                                <a href={marathonPlan.whatsapp_link} target="_blank">WhatsApp Group</a>
                            </Button>
                        </div>
                        <MarathonAdminView plan={marathonPlan} />
                    </TabsContent>
                )}

                {sprintPlan && (
                    <TabsContent value="sprint">
                        <div className="flex items-center justify-between mb-4 bg-blue-50 p-4 rounded-lg border border-blue-100">
                            <div>
                                <h2 className="text-lg font-bold text-blue-900">Sprint Dashboard</h2>
                                <p className="text-sm text-blue-700">Monitor active 30-week sprint participants and weekly targets.</p>
                            </div>
                            <Button variant="outline" className="border-blue-200 text-blue-700 hover:bg-blue-100" asChild>
                                <a href={sprintPlan.whatsapp_link} target="_blank">WhatsApp Group</a>
                            </Button>
                        </div>
                        <SprintAdminView plan={sprintPlan} />
                    </TabsContent>
                )}

                {anchorPlan && (
                    <TabsContent value="anchor">
                        <div className="flex items-center justify-between mb-4 bg-indigo-50 p-4 rounded-lg border border-indigo-100">
                            <div>
                                <h2 className="text-lg font-bold text-indigo-900">Anchor Dashboard</h2>
                                <p className="text-sm text-indigo-700">Monitor 48-week Anchor participants and weekly targets.</p>
                            </div>
                            <Button variant="outline" className="border-indigo-200 text-indigo-700 hover:bg-indigo-100" asChild>
                                <a href={anchorPlan.whatsapp_link} target="_blank">WhatsApp Group</a>
                            </Button>
                        </div>
                        <AnchorAdminView plan={anchorPlan} />
                    </TabsContent>
                )}

                {dailyDropPlan && (
                    <TabsContent value="daily_drop">
                        <div className="flex items-center justify-between mb-4 bg-cyan-50 p-4 rounded-lg border border-cyan-100">
                            <div>
                                <h2 className="text-lg font-bold text-cyan-900">Daily Drop Dashboard</h2>
                                <p className="text-sm text-cyan-700">Monitor active daily savers.</p>
                            </div>
                            <Button variant="outline" className="border-cyan-200 text-cyan-700 hover:bg-cyan-100" asChild>
                                <a href={dailyDropPlan.whatsapp_link} target="_blank">WhatsApp Group</a>
                            </Button>
                        </div>
                        <DailyDropAdminView plan={dailyDropPlan} />
                    </TabsContent>
                )}

                {stepUpPlan && (
                    <TabsContent value="step_up">
                        <div className="flex items-center justify-between mb-4 bg-purple-50 p-4 rounded-lg border border-purple-100">
                            <div>
                                <h2 className="text-lg font-bold text-purple-900">Step-Up Dashboard</h2>
                                <p className="text-sm text-purple-700">Monitor active Step-Up tiers and weekly progress.</p>
                            </div>
                            <Button variant="outline" className="border-purple-200 text-purple-700 hover:bg-purple-100" asChild>
                                <a href={stepUpPlan.whatsapp_link} target="_blank">WhatsApp Group</a>
                            </Button>
                        </div>
                        <StepUpAdminView plan={stepUpPlan} />
                    </TabsContent>
                )}

                {monthlyBloomPlan && (
                    <TabsContent value="monthly_bloom">
                        <div className="flex items-center justify-between mb-4 bg-pink-50 p-4 rounded-lg border border-pink-100">
                            <div>
                                <h2 className="text-lg font-bold text-pink-900">Monthly Bloom Dashboard</h2>
                                <p className="text-sm text-pink-700">Monitor active Monthly Bloom participants.</p>
                            </div>
                            {monthlyBloomPlan.whatsapp_link && (
                                <Button variant="outline" className="border-pink-200 text-pink-700 hover:bg-pink-100" asChild>
                                    <a href={monthlyBloomPlan.whatsapp_link} target="_blank">WhatsApp Group</a>
                                </Button>
                            )}
                        </div>
                        <MonthlyBloomAdminView />
                    </TabsContent>
                )}

                <TabsContent value="ajo_circle">
                    <AjoCircleAdminView />
                </TabsContent>
            </Tabs>
        </div>
    );
}
