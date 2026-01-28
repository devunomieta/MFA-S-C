import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/app/components/ui/button";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, MoreHorizontal, Eye, EyeOff, RotateCcw, Users } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/app/components/ui/dialog";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Textarea } from "@/app/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/app/components/ui/table";


export function AdminPlans() {
    const [plans, setPlans] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [editingPlan, setEditingPlan] = useState<any>(null);
    const [viewingPlan, setViewingPlan] = useState<any>(null);

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

    const handleViewDetails = (plan: any) => {
        setViewingPlan(plan);
        setIsDetailsOpen(true);
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
            duration_months: Math.ceil(Number(formData.duration_weeks) / 4), // Fallback for DB constraint
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

    return (
        <div className="space-y-8 animate-in fade-in duration-500 font-sans">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-gray-100">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Savings Plans</h1>
                    <p className="text-gray-500 mt-2 font-medium">Manage your product catalog and configurations.</p>
                </div>

                {/* Create Plan Dialog */}
                <Dialog open={isDialogOpen} onOpenChange={(open) => {
                    setIsDialogOpen(open);
                    if (!open) resetForm();
                }}>
                    <DialogTrigger asChild>
                        <Button className="bg-slate-900 hover:bg-slate-800 text-white shadow-md">
                            <Plus className="w-4 h-4 mr-2" /> Create New Plan
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle className="text-xl font-bold">{editingPlan ? "Edit Plan" : "Create New Plan"}</DialogTitle>
                        </DialogHeader>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                            <div className="space-y-2 col-span-2">
                                <Label>Plan Name</Label>
                                <Input
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="e.g. Silver Starter"
                                    className="h-10"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Contribution Type</Label>
                                <Select
                                    value={formData.contribution_type}
                                    onValueChange={(val) => setFormData({ ...formData, contribution_type: val })}
                                >
                                    <SelectTrigger className="h-10">
                                        <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="flexible">Flexible Amount</SelectItem>
                                        <SelectItem value="fixed">Fixed Amount</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {formData.contribution_type === 'fixed' ? (
                                <div className="space-y-2">
                                    <Label>Fixed Amount ($)</Label>
                                    <Input
                                        type="number"
                                        value={formData.fixed_amount}
                                        onChange={e => setFormData({ ...formData, fixed_amount: e.target.value })}
                                        placeholder="500.00"
                                        className="h-10"
                                    />
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <Label>Min. Desposit ($)</Label>
                                    <Input
                                        type="number"
                                        value={formData.min_amount}
                                        onChange={e => setFormData({ ...formData, min_amount: e.target.value })}
                                        placeholder="10.00"
                                        className="h-10"
                                    />
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label>Duration (Weeks)</Label>
                                <Input
                                    type="number"
                                    value={formData.duration_weeks}
                                    onChange={e => setFormData({ ...formData, duration_weeks: e.target.value })}
                                    placeholder="e.g. 52"
                                    className="h-10"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Service Charge ($)</Label>
                                <Input
                                    type="number"
                                    value={formData.service_charge}
                                    onChange={e => setFormData({ ...formData, service_charge: e.target.value })}
                                    placeholder="0.00"
                                    className="h-10"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Start Date (Optional)</Label>
                                <Input
                                    type="date"
                                    value={formData.start_date}
                                    onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                                    className="h-10"
                                />
                                <p className="text-[10px] text-gray-500">Leaving empty means it starts on join.</p>
                            </div>

                            <div className="space-y-2 col-span-2">
                                <Label>WhatsApp Group Link</Label>
                                <Input
                                    value={formData.whatsapp_link}
                                    onChange={e => setFormData({ ...formData, whatsapp_link: e.target.value })}
                                    placeholder="https://chat.whatsapp.com/..."
                                    className="h-10"
                                />
                            </div>
                            <div className="space-y-2 col-span-2">
                                <Label>Description</Label>
                                <Textarea
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    rows={3}
                                    className="resize-none"
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                            <Button onClick={handleSubmit} className="bg-slate-900 text-white hover:bg-slate-800">Save Plan</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* View Details Dialog */}
                <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>Plan Details</DialogTitle>
                            <DialogDescription>Full configuration for {viewingPlan?.name}</DialogDescription>
                        </DialogHeader>
                        {viewingPlan && (
                            <div className="grid grid-cols-2 gap-4 py-4 text-sm">
                                <div className="col-span-2 p-3 bg-gray-50 rounded-lg border border-gray-100">
                                    <span className="text-gray-500 block text-xs uppercase font-bold mb-1">Description</span>
                                    {viewingPlan.description}
                                </div>
                                <div>
                                    <span className="text-gray-500 block text-xs uppercase font-bold mb-1">Type</span>
                                    <span className="capitalize px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
                                        {viewingPlan.contribution_type}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-gray-500 block text-xs uppercase font-bold mb-1">Service Fee</span>
                                    <span className="font-mono">{formatCurrency(viewingPlan.service_charge)}</span>
                                </div>
                                <div>
                                    <span className="text-gray-500 block text-xs uppercase font-bold mb-1">
                                        {viewingPlan.contribution_type === 'fixed' ? 'Fixed Amount' : 'Min Deposit'}
                                    </span>
                                    <span className="font-mono text-emerald-600 font-bold">
                                        {formatCurrency(viewingPlan.contribution_type === 'fixed' ? viewingPlan.fixed_amount : viewingPlan.min_amount)}
                                    </span>
                                </div>
                                <div className="col-span-2">
                                    <span className="text-gray-500 block text-xs uppercase font-bold mb-1">Visibility</span>
                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${viewingPlan.is_active !== false ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                        {viewingPlan.is_active !== false ? 'Visible on Dashboard' : 'Hidden from Users'}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-gray-500 block text-xs uppercase font-bold mb-1">Duration</span>
                                    {viewingPlan.duration_weeks ? `${viewingPlan.duration_weeks} Weeks` : 'Flexible'}
                                </div>
                                <div className="col-span-2">
                                    <span className="text-gray-500 block text-xs uppercase font-bold mb-1">WhatsApp Group</span>
                                    {viewingPlan.whatsapp_link ? (
                                        <a href={viewingPlan.whatsapp_link} target="_blank" className="text-blue-600 underline truncate block">
                                            {viewingPlan.whatsapp_link}
                                        </a>
                                    ) : (
                                        <span className="text-gray-400 italic">Not linked</span>
                                    )}
                                </div>
                            </div>
                        )}
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsDetailsOpen(false)}>Close</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Main Table */}
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
                <Table>
                    <TableHeader className="bg-gray-50/50">
                        <TableRow>
                            <TableHead className="w-[200px]">Plan Name</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Duration</TableHead>
                            <TableHead>Service Fee</TableHead>
                            <TableHead>Amount / Min.</TableHead>
                            <TableHead>Subscribers</TableHead>
                            <TableHead className="text-right w-[100px]">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center h-24 text-gray-500">
                                    Loading plans...
                                </TableCell>
                            </TableRow>
                        ) : plans.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center h-24 text-gray-500">
                                    No plans found. Create one to get started.
                                </TableCell>
                            </TableRow>
                        ) : (
                            plans.map((plan) => (
                                <TableRow key={plan.id} className={`hover:bg-gray-50/50 transition-colors ${plan.is_active === false ? 'opacity-60 bg-gray-50' : ''}`}>
                                    <TableCell className="font-medium text-slate-900 max-w-[200px]">
                                        <div className="flex items-center gap-2">
                                            {plan.is_active === false && <EyeOff className="w-3 h-3 text-gray-400" />}
                                            <div className="font-semibold break-words whitespace-normal">
                                                {plan.name}
                                            </div>
                                        </div>
                                        <div className="text-[10px] text-gray-400 break-words whitespace-normal font-normal mt-0.5 leading-tight">
                                            {plan.description}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${plan.contribution_type === 'fixed'
                                            ? 'bg-blue-50 text-blue-700'
                                            : 'bg-emerald-50 text-emerald-700'
                                            }`}>
                                            {plan.contribution_type === 'fixed' ? 'Fixed' : 'Flexible'}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <span className="text-gray-600 text-sm whitespace-nowrap">
                                            {plan.duration_weeks ? `${plan.duration_weeks} wks` : 'Flex'}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <span className="font-mono text-sm text-gray-600">
                                            {formatCurrency(plan.service_charge)}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <span className="font-mono text-sm font-semibold text-slate-700">
                                            {formatCurrency(plan.contribution_type === 'fixed' ? plan.fixed_amount : plan.min_amount)}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1.5 text-gray-600">
                                            <Users className="w-3.5 h-3.5 text-gray-400" />
                                            {plan.subscriber_count}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleEdit(plan)}
                                                className="h-8 w-8 text-gray-500 hover:text-blue-600 hover:bg-blue-50"
                                                title="Edit Plan"
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleToggleVisibility(plan)}
                                                className={`h-8 w-8 ${plan.is_active === false ? 'text-gray-400 hover:text-emerald-600 hover:bg-emerald-50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
                                                title={plan.is_active === false ? "Unhide Plan" : "Hide Plan"}
                                            >
                                                {plan.is_active === false ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleResetPlan(plan)}
                                                className="h-8 w-8 text-gray-500 hover:text-amber-600 hover:bg-amber-50"
                                                title="Reset Subscribers"
                                            >
                                                <RotateCcw className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleDelete(plan.id)}
                                                className="h-8 w-8 text-gray-500 hover:text-red-600 hover:bg-red-50"
                                                title="Delete Plan"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>

                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
