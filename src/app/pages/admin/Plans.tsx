import { useEffect, useState } from "react";

import {
  Plus,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  RotateCcw,
  Users,
  Settings,
  Activity,
  TrendingUp,
} from "lucide-react";
import { ShieldCheck, ShieldAlert, Lock, Unlock, BadgeCheck } from "lucide-react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";

import { AdminActionAuthModal } from "@/app/components/admin/AdminActionAuthModal";
import { AdminPageHeader } from "@/app/components/admin/AdminPageHeader";
import { ActionConfirmModal } from "@/app/components/ui/ActionConfirmModal";
import { Button } from "@/app/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/app/components/ui/dialog";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/components/ui/table";
import { Textarea } from "@/app/components/ui/textarea";
import { useAuth } from "@/app/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { formatNaira } from "@/lib/utils";
import { Plan } from "@/types";

import { AjoCircleAdminView } from "./plans/AjoCircleAdminView";
import { AnchorAdminView } from "./plans/AnchorAdminView";
import { DailyDropAdminView } from "./plans/DailyDropAdminView";
import { MarathonAdminView } from "./plans/MarathonAdminView";
import { MonthlyBloomAdminView } from "./plans/MonthlyBloomAdminView";
import { SprintAdminView } from "./plans/SprintAdminView";
import { StepUpAdminView } from "./plans/StepUpAdminView";

export function AdminPlans() {
  const { isSuperadmin } = useAuth();
  const { view } = useParams();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isSystemUnlocked, setIsSystemUnlocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    desc: string;
    action: () => Promise<void>;
  } | null>(null);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    min_amount: "",
    duration_weeks: "",
    service_charge: "",
    service_charge_type: "fixed", // 'fixed', 'percentage', 'tiered'
    service_charge_fixed: "",
    service_charge_percentage: "",
    service_charge_tiers: [] as { min: number; max: number; fee: number }[],
    description: "",
    whatsapp_link: "",
    contribution_type: "flexible", // 'fixed' or 'flexible'
    fixed_amount: "",
    start_date: "",
    service_charge_is_recurring: false,
    service_charge_interval_days: "31",
  });

  useEffect(() => {
    fetchPlans();
  }, []);

  async function fetchPlans() {
    setLoading(true);
    // Fetch plans and their active user counts
    const { data: plansData, error: plansError } = await supabase
      .from("plans")
      .select("*")
      .order("created_at", { ascending: false });

    if (plansError) {
      toast.error("Failed to fetch plans");
    } else {
      // Fetch active counts for each plan (more accurate than a single query with orphaned records)
      const { data: countData } = await supabase
        .from("user_plans")
        .select("plan_id")
        .eq("status", "active");

      const countsByPlan: Record<string, number> = {};
      (countData || []).forEach((up) => {
        countsByPlan[up.plan_id] = (countsByPlan[up.plan_id] || 0) + 1;
      });

      const plansWithCount =
        plansData?.map((p: any) => ({
          ...p,
          subscriber_count: countsByPlan[p.id] || 0,
        })) || [];
      setPlans(plansWithCount);
    }
    setLoading(false);
  }

  const handleGlobalAutoSave = async () => {
    setConfirmAction({
      title: "Trigger Global Auto-Save",
      desc: "This will run the auto-save job for ALL active users across ALL plans (Daily, Weekly, Monthly). This should normally happen automatically at 11:59PM or Sundays, but you can trigger it manually now.",
      action: async () => {
        setIsAutoSaving(true);
        const { data, error } = await supabase.rpc("trigger_all_auto_saves");
        if (error) {
          toast.error("Global Auto-Save failed: " + error.message);
        } else {
          toast.success(
            `Success! Processed: ${data.processed}, Arrears Recorded: ${data.arrears_created}`,
          );
          fetchPlans();
        }
        setIsAutoSaving(false);
        setIsConfirmOpen(false);
      },
    });
    setIsConfirmOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      min_amount: "",
      duration_weeks: "",
      service_charge: "",
      service_charge_type: "fixed",
      service_charge_fixed: "",
      service_charge_percentage: "",
      service_charge_tiers: [],
      description: "",
      whatsapp_link: "",
      contribution_type: "flexible",
      fixed_amount: "",
      start_date: "",
      service_charge_is_recurring: false,
      service_charge_interval_days: "31",
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
      service_charge_type: plan.service_charge_type || "fixed",
      service_charge_fixed: plan.service_charge_fixed || plan.service_charge || "",
      service_charge_percentage: plan.service_charge_percentage || "",
      service_charge_tiers: plan.service_charge_tiers || [],
      description: plan.description || "",
      whatsapp_link: plan.whatsapp_link || "",
      contribution_type: plan.contribution_type || "flexible",
      fixed_amount: plan.fixed_amount || "",
      start_date: plan.start_date || "",
      service_charge_is_recurring: plan.service_charge_is_recurring || false,
      service_charge_interval_days: plan.service_charge_interval_days?.toString() || "31",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (planId: string) => {
    setConfirmAction({
      title: "Delete Plan",
      desc: "Are you sure? This will hide the plan from new users.",
      action: async () => {
        const { error } = await supabase.from("plans").delete().eq("id", planId);
        if (error) {
          toast.error("Cannot delete plan. It likely has active subscribers.");
        } else {
          toast.success("Plan deleted.");
          fetchPlans();
        }
        setIsConfirmOpen(false);
      },
    });
    setIsConfirmOpen(true);
  };

  const handleToggleVisibility = async (plan: any) => {
    const newStatus = !plan.is_active;
    const { error } = await supabase
      .from("plans")
      .update({ is_active: newStatus })
      .eq("id", plan.id);

    if (error) {
      toast.error("Failed to update visibility");
      console.error(error);
    } else {
      toast.success(newStatus ? "Plan is now visible" : "Plan hidden from dashboard");
      fetchPlans();
    }
  };

  const handleResetPlan = async (plan: any) => {
    setConfirmAction({
      title: "Reset Plan Subscribers",
      desc: `WARNING: This will remove ALL ${plan.subscriber_count} subscribers from "${plan.name}".\n\nThey will be removed from the plan and their progress resets. Funds are NOT automatically refunded (handled separately). \n\nContinue?`,
      action: async () => {
        const { error } = await supabase.from("user_plans").delete().eq("plan_id", plan.id);

        if (error) {
          toast.error("Failed to reset plan: " + error.message);
        } else {
          toast.success("All users removed from plan.");
          fetchPlans();
        }
        setIsConfirmOpen(false);
      },
    });
    setIsConfirmOpen(true);
  };

  const initiateCreatePlan = () => {
    setPendingAction(() => () => setIsDialogOpen(true));
    setIsAuthModalOpen(true);
  };

  const handleApprovePlan = async (plan: any) => {
    setPendingAction(() => async () => {
      const { error } = await supabase
        .from("plans")
        .update({
          is_approved: true,
          approved_at: new Date().toISOString(),
        })
        .eq("id", plan.id);

      if (error) {
        toast.error("Approval failed: " + error.message);
      } else {
        toast.success(`Plan "${plan.name}" successfully approved and is now live.`);
        fetchPlans();
      }
    });
    setIsAuthModalOpen(true);
  };

  const handleSubmit = async () => {
    const payload = {
      name: formData.name,
      min_amount: Number(formData.min_amount),
      duration_weeks: Number(formData.duration_weeks),
      duration_months: Math.ceil(Number(formData.duration_weeks) / 4), // Fallback
      service_charge: Number(formData.service_charge_fixed || formData.service_charge), // Backwards compatibility
      service_charge_type: formData.service_charge_type,
      service_charge_fixed: formData.service_charge_fixed
        ? Number(formData.service_charge_fixed)
        : null,
      service_charge_percentage: formData.service_charge_percentage
        ? Number(formData.service_charge_percentage)
        : null,
      service_charge_tiers:
        formData.service_charge_type === "tiered" ? formData.service_charge_tiers : null,
      description: formData.description,
      whatsapp_link: formData.whatsapp_link,
      contribution_type: formData.contribution_type,
      fixed_amount: formData.contribution_type === "fixed" ? Number(formData.fixed_amount) : null,
      start_date: formData.start_date || null,
      service_charge_is_recurring: formData.service_charge_is_recurring,
      service_charge_interval_days: formData.service_charge_is_recurring
        ? Number(formData.service_charge_interval_days)
        : null,
      is_approved: editingPlan ? editingPlan.is_approved : false, // New plans require separate approval
    };

    let error;
    if (editingPlan) {
      const { error: updateError } = await supabase
        .from("plans")
        .update(payload)
        .eq("id", editingPlan.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase.from("plans").insert([payload]);
      error = insertError;
    }

    if (error) {
      toast.error("Failed to save plan: " + error.message);
    } else {
      toast.success(
        editingPlan
          ? "Plan updated"
          : "Plan created successfully! Pending administrative approval.",
      );
      setIsDialogOpen(false);
      fetchPlans();
      resetForm();
    }
  };

  const marathonPlan = plans.find((p) => p.type === "marathon");
  const sprintPlan = plans.find((p) => p.type === "sprint");
  const anchorPlan = plans.find((p) => p.type === "anchor");
  const dailyDropPlan = plans.find((p) => p.type === "daily_drop");
  const stepUpPlan = plans.find((p) => p.type === "step_up");
  const monthlyBloomPlan = plans.find((p) => p.type === "monthly_bloom");

  // Determin view content
  const currentTab = view || "management";

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <AdminPageHeader
        title={
          currentTab === "management"
            ? "Standard Savings Catalog"
            : currentTab === "ajo_circle"
              ? "Digital Ajo Plan Dashboard"
              : currentTab.replace("_", " ") + " Dashboard"
        }
        description="Create, monitor, and approve savings products for MTF users."
        breadcrumbs={[
          { label: "Plans", href: "/admin/plans" },
          { label: currentTab === "ajo_circle" ? "Ajo Plan" : currentTab.replace("_", " ") },
        ]}
        actions={
          <Button
            onClick={handleGlobalAutoSave}
            variant="default"
            disabled={isAutoSaving}
            className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-xl shadow-emerald-500/10 active:scale-95 transition-all h-11 px-6 rounded-xl"
          >
            {isAutoSaving ? (
              <Activity className="w-5 h-5 mr-2 animate-spin" />
            ) : (
              <TrendingUp className="w-5 h-5 mr-2" />
            )}
            Trigger Global Lifecycle
          </Button>
        }
      />

      {/* PIN Handlers for System Section */}
      <AdminActionAuthModal
        isOpen={isAuthModalOpen}
        onOpenChange={setIsAuthModalOpen}
        onAuthenticated={() => {
          if (pendingAction) {
            pendingAction();
            setPendingAction(null);
          }
        }}
        title={
          pendingAction?.toString().includes("setIsSystemUnlocked")
            ? "Unlock Sensitive System Conduits"
            : pendingAction?.toString().includes("setIsDialogOpen")
              ? "Authorize New Plan Creation"
              : "Authorize Plan Approval"
        }
        description="This action requires top-level administrative clearance. Please verify your identity."
      />

      <div className="space-y-6">
        {currentTab === "management" && (
          <>
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-4">
                <div className="bg-emerald-50 text-emerald-700 px-4 py-2 rounded-xl border border-emerald-100 flex items-center gap-2">
                  <BadgeCheck className="w-5 h-5" />
                  <span className="text-sm font-black uppercase tracking-tighter">
                    {plans.length} Registered Plans
                  </span>
                </div>
              </div>
              <Dialog
                open={isDialogOpen}
                onOpenChange={(open) => {
                  setIsDialogOpen(open);
                  if (!open) resetForm();
                }}
              >
                <Button
                  onClick={initiateCreatePlan}
                  className="bg-slate-950 hover:bg-slate-900 text-white shadow-2xl h-11 px-8 rounded-xl font-bold transition-all hover:scale-[1.02] active:scale-95"
                >
                  <Plus className="w-5 h-5 mr-3" /> Create New Standard Plan
                </Button>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="text-xl font-bold">
                      {editingPlan ? "Edit Plan" : "Create New Plan"}
                    </DialogTitle>
                    <DialogDescription>
                      Standard plans only. Specialized plans (Marathon, etc.) are managed via
                      codebase/database.
                    </DialogDescription>
                  </DialogHeader>
                  {/* Form Content - Simplified for brevity but functional */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                    {editingPlan && editingPlan.type !== "standard" && (
                      <div className="col-span-2 p-3 bg-amber-50 text-amber-800 text-xs border border-amber-200 rounded flex items-center gap-2">
                        <Settings className="w-4 h-4" />
                        <span>
                          <strong>Specialized Plan:</strong> Core configuration (Pricing, Duration)
                          is managed via code. You can edit the <strong>Service Charges</strong>,
                          Description and WhatsApp Link.
                        </span>
                      </div>
                    )}

                    <div className="space-y-2 col-span-2">
                      <Label>Plan Name</Label>
                      <Input
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        disabled={editingPlan && editingPlan.type !== "standard"}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Type</Label>
                      <Select
                        value={formData.contribution_type}
                        onValueChange={(val) =>
                          setFormData({ ...formData, contribution_type: val })
                        }
                        disabled={editingPlan && editingPlan.type !== "standard"}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
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
                        value={
                          formData.contribution_type === "fixed"
                            ? formData.fixed_amount
                            : formData.min_amount
                        }
                        onChange={(e) =>
                          formData.contribution_type === "fixed"
                            ? setFormData({ ...formData, fixed_amount: e.target.value })
                            : setFormData({ ...formData, min_amount: e.target.value })
                        }
                        disabled={editingPlan && editingPlan.type !== "standard"}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Weeks</Label>
                      <Input
                        type="number"
                        value={formData.duration_weeks}
                        onChange={(e) =>
                          setFormData({ ...formData, duration_weeks: e.target.value })
                        }
                        disabled={editingPlan && editingPlan.type !== "standard"}
                      />
                    </div>
                    <div className="space-y-4 col-span-2 border-t pt-4 mt-2">
                      <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                        <Activity className="w-4 h-4 text-emerald-600" />
                        Dynamic Service Charges
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Charge Type</Label>
                          <Select
                            value={formData.service_charge_type}
                            onValueChange={(val: any) =>
                              setFormData({ ...formData, service_charge_type: val })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="fixed">Fixed Amount</SelectItem>
                              <SelectItem value="percentage">Percentage Rate</SelectItem>
                              <SelectItem value="tiered">Tiered (Amount Range)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {formData.service_charge_type === "fixed" && (
                          <div className="space-y-2 animate-in slide-in-from-left-2 duration-300">
                            <Label>Fixed Fee (₦)</Label>
                            <Input
                              type="number"
                              value={formData.service_charge_fixed}
                              onChange={(e) =>
                                setFormData({ ...formData, service_charge_fixed: e.target.value })
                              }
                              placeholder="e.g. 2000"
                            />
                          </div>
                        )}

                        {formData.service_charge_type === "percentage" && (
                          <div className="space-y-2 animate-in slide-in-from-left-2 duration-300">
                            <Label>Charge Rate (%)</Label>
                            <Input
                              type="number"
                              value={formData.service_charge_percentage}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  service_charge_percentage: e.target.value,
                                })
                              }
                              placeholder="e.g. 2.5"
                            />
                          </div>
                        )}
                      </div>

                      <div className="flex items-center space-x-4 border-l-2 border-slate-200 pl-4 py-1">
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="is_recurring"
                            className="w-4 h-4 rounded border-gray-300 text-slate-900 focus:ring-slate-900"
                            checked={formData.service_charge_is_recurring}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                service_charge_is_recurring: e.target.checked,
                              })
                            }
                          />
                          <Label
                            htmlFor="is_recurring"
                            className="text-sm font-medium cursor-pointer"
                          >
                            Recurring Fee
                          </Label>
                        </div>

                        {formData.service_charge_is_recurring && (
                          <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-300">
                            <span className="text-xs text-slate-500">Every</span>
                            <Input
                              type="number"
                              className="h-8 w-20 text-xs"
                              value={formData.service_charge_interval_days}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  service_charge_interval_days: e.target.value,
                                })
                              }
                            />
                            <span className="text-xs text-slate-500">days</span>
                          </div>
                        )}
                      </div>

                      {formData.service_charge_type === "tiered" && (
                        <div className="space-y-3 animate-in fade-in duration-500 bg-slate-50 p-3 rounded-lg border border-slate-200">
                          <div className="flex justify-between items-center">
                            <Label className="text-xs font-bold uppercase text-slate-500">
                              Charge Tiers
                            </Label>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-[10px]"
                              onClick={() =>
                                setFormData({
                                  ...formData,
                                  service_charge_tiers: [
                                    ...formData.service_charge_tiers,
                                    { min: 0, max: 0, fee: 0 },
                                  ],
                                })
                              }
                            >
                              Add Tier
                            </Button>
                          </div>
                          <div className="space-y-2">
                            {formData.service_charge_tiers.map((tier, index) => (
                              <div key={index} className="flex items-center gap-2">
                                <div className="flex-1 grid grid-cols-3 gap-2">
                                  <Input
                                    type="number"
                                    placeholder="Min"
                                    className="h-8 text-xs"
                                    value={tier.min}
                                    onChange={(e) => {
                                      const newTiers = [...formData.service_charge_tiers];
                                      newTiers[index].min = Number(e.target.value);
                                      setFormData({ ...formData, service_charge_tiers: newTiers });
                                    }}
                                  />
                                  <Input
                                    type="number"
                                    placeholder="Max"
                                    className="h-8 text-xs"
                                    value={tier.max}
                                    onChange={(e) => {
                                      const newTiers = [...formData.service_charge_tiers];
                                      newTiers[index].max = Number(e.target.value);
                                      setFormData({ ...formData, service_charge_tiers: newTiers });
                                    }}
                                  />
                                  <Input
                                    type="number"
                                    placeholder="Fee"
                                    className="h-8 text-xs"
                                    value={tier.fee}
                                    onChange={(e) => {
                                      const newTiers = [...formData.service_charge_tiers];
                                      newTiers[index].fee = Number(e.target.value);
                                      setFormData({ ...formData, service_charge_tiers: newTiers });
                                    }}
                                  />
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-red-500"
                                  onClick={() => {
                                    const newTiers = formData.service_charge_tiers.filter(
                                      (_, i) => i !== index,
                                    );
                                    setFormData({ ...formData, service_charge_tiers: newTiers });
                                  }}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            ))}
                            {formData.service_charge_tiers.length === 0 && (
                              <p className="text-[10px] text-slate-400 italic text-center">
                                No tiers added. Add a tier to define ranges.
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="space-y-2 col-span-2">
                      <Label>WhatsApp Group Link</Label>
                      <Input
                        value={formData.whatsapp_link}
                        onChange={(e) =>
                          setFormData({ ...formData, whatsapp_link: e.target.value })
                        }
                        placeholder="https://chat.whatsapp.com/..."
                      />
                    </div>
                    <div className="space-y-2 col-span-2">
                      <Label>Description</Label>
                      <Textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleSubmit} className="bg-slate-900 text-white">
                      Save Plan
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
              <Table>
                <TableHeader className="bg-gray-50/50">
                  <TableRow>
                    <TableHead className="w-[30%] text-slate-400 font-black uppercase tracking-widest text-[10px]">
                      Plan Identity
                    </TableHead>
                    <TableHead className="w-[10%] text-slate-400 font-black uppercase tracking-widest text-[10px]">
                      Structure
                    </TableHead>
                    <TableHead className="w-[10%] text-slate-400 font-black uppercase tracking-widest text-[10px]">
                      Timeline
                    </TableHead>
                    <TableHead className="w-[15%] text-center text-slate-400 font-black uppercase tracking-widest text-[10px]">
                      Service Fee
                    </TableHead>
                    <TableHead className="w-[15%] text-center text-slate-400 font-black uppercase tracking-widest text-[10px]">
                      Subscribers
                    </TableHead>
                    <TableHead className="w-[10%] text-center text-slate-400 font-black uppercase tracking-widest text-[10px]">
                      Status
                    </TableHead>
                    <TableHead className="text-right w-[10%] text-slate-400 font-black uppercase tracking-widest text-[10px]">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center h-24 text-gray-500">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : plans.filter((p) => !p.name.includes("Wallet") && !p.name.includes("Payouts"))
                      .length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center h-24 text-gray-500">
                        No standard plans found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    plans
                      .filter((p) => !p.name.includes("Wallet") && !p.name.includes("Payouts"))
                      .map((plan) => (
                        <TableRow
                          key={plan.id}
                          className={plan.is_active === false ? "opacity-60 bg-gray-50" : ""}
                        >
                          <TableCell className="font-medium max-w-[400px]">
                            <div className="flex items-center gap-2">
                              {plan.type === "marathon" && (
                                <Activity className="w-3 h-3 text-emerald-600" />
                              )}
                              <span className="truncate">{plan.name}</span>
                            </div>
                            <div className="text-[10px] text-gray-400 font-normal mt-0.5 whitespace-normal break-words leading-relaxed">
                              {plan.description}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="capitalize px-2 py-0.5 rounded-full bg-slate-100 text-xs">
                              {plan.contribution_type}
                            </span>
                          </TableCell>
                          <TableCell>{plan.duration_weeks || "Flexible"} wks</TableCell>
                          <TableCell className="text-center bg-[#f8fafc]">
                            <div className="flex flex-col items-center">
                              <span className="font-extrabold text-slate-900">
                                {plan.service_charge_type === "percentage"
                                  ? `${plan.service_charge_percentage}%`
                                  : plan.service_charge_type === "tiered"
                                    ? "Tiered"
                                    : formatNaira(
                                        plan.service_charge_fixed || plan.service_charge || 0,
                                      )}
                              </span>
                              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                                {plan.service_charge_is_recurring ? "Monthly" : "One-time"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center gap-2 text-slate-700 font-black bg-white border border-slate-200 rounded-xl py-2 px-3 shadow-sm mx-auto w-fit">
                              <Users className="w-4 h-4 text-emerald-500" />
                              {plan.subscriber_count as number}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            {plan.is_approved ? (
                              <div className="inline-flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full text-[10px] font-black uppercase border border-emerald-100">
                                <BadgeCheck className="w-3.5 h-3.5" /> Approved
                              </div>
                            ) : (
                              <div className="inline-flex items-center gap-1 text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full text-[10px] font-black uppercase border border-amber-100">
                                <Lock className="w-3.5 h-3.5" /> Pending
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              {!plan.is_approved && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  title="Review & Approve"
                                  onClick={() => handleApprovePlan(plan)}
                                  className="text-amber-500 hover:text-amber-600 hover:bg-amber-50"
                                >
                                  <Unlock className="w-4 h-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(plan)}
                                className="h-8 w-8 text-gray-500 hover:text-blue-600 hover:bg-blue-50"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleToggleVisibility(plan)}
                                className="h-8 w-8 text-gray-500"
                              >
                                {plan.is_active === false ? (
                                  <Eye className="h-4 w-4" />
                                ) : (
                                  <EyeOff className="h-4 w-4" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleResetPlan(plan)}
                                className="h-8 w-8 text-amber-500"
                              >
                                <RotateCcw className="h-4 w-4" />
                              </Button>
                              {plan.type === "standard" && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDelete(plan.id)}
                                  className="h-8 w-8 text-red-500"
                                >
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

            {/* Section 2: Internal System Conduits (Superadmin Only) */}
            {isSuperadmin && (
              <div className="mt-12 space-y-6 animate-in slide-in-from-bottom-4 duration-1000">
                <div className="flex items-center gap-3">
                  <div className="bg-slate-950 p-2 rounded-xl">
                    <ShieldCheck className="size-6 text-emerald-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-900 tracking-tight">
                      Internal System Conduits
                    </h2>
                    <p className="text-sm font-medium text-slate-500">
                      Core financial infrastructure for payouts and maturing funds. Restricted
                      access.
                    </p>
                  </div>
                </div>

                {!isSystemUnlocked ? (
                  <div className="bg-white border-2 border-dashed border-slate-200 rounded-[2rem] p-12 text-center space-y-4">
                    <div className="size-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-2">
                      <Lock className="size-8 text-slate-400" />
                    </div>
                    <div className="max-w-md mx-auto">
                      <h3 className="text-lg font-bold text-slate-900">Sensitive Section Locked</h3>
                      <p className="text-sm text-slate-500 mb-6">
                        Viewing internal conduits requires active identity verification via
                        Administration PIN. Standard actions are disabled for these conduits.
                      </p>
                      <Button
                        onClick={() => {
                          setPendingAction(() => () => setIsSystemUnlocked(true));
                          setIsAuthModalOpen(true);
                        }}
                        className="bg-slate-950 text-white rounded-xl h-11 px-8 font-bold"
                      >
                        <Unlock className="size-4 mr-2" /> Unlock System Conduits
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-gray-200 bg-emerald-50/10 shadow-sm overflow-hidden animate-in fade-in duration-500">
                    <Table>
                      <TableHeader className="bg-slate-950">
                        <TableRow>
                          <TableHead className="w-[40%] text-slate-400 font-black uppercase tracking-widest text-[10px]">
                            Plan Identity (System)
                          </TableHead>
                          <TableHead className="w-[15%] text-slate-400 font-black uppercase tracking-widest text-[10px]">
                            Structure
                          </TableHead>
                          <TableHead className="w-[15%] text-slate-400 font-black uppercase tracking-widest text-[10px]">
                            Timeline
                          </TableHead>
                          <TableHead className="w-[15%] text-center text-slate-400 font-black uppercase tracking-widest text-[10px]">
                            Service Fee
                          </TableHead>
                          <TableHead className="w-[15%] text-center text-slate-400 font-black uppercase tracking-widest text-[10px]">
                            Subscribers
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody className="bg-white">
                        {plans
                          .filter((p) => p.name.includes("Wallet") || p.name.includes("Payouts"))
                          .map((plan) => (
                            <TableRow key={plan.id} className="hover:bg-slate-50/50">
                              <TableCell className="font-medium">
                                <div className="flex items-center gap-2">
                                  <div className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                                  <span className="font-bold text-slate-900">{plan.name}</span>
                                </div>
                                <div className="text-[10px] text-gray-400 font-normal mt-0.5 max-w-sm whitespace-normal leading-relaxed">
                                  {plan.description}
                                </div>
                              </TableCell>
                              <TableCell>
                                <span className="capitalize px-2 py-0.5 rounded-full bg-slate-100 text-[10px] font-bold">
                                  INTERNAL
                                </span>
                              </TableCell>
                              <TableCell className="text-slate-500 font-medium">FIXED</TableCell>
                              <TableCell className="text-center font-black text-slate-900">
                                ₦0.00
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center justify-center gap-2 text-slate-700 font-black bg-white border border-slate-200 rounded-xl py-2 px-3 shadow-sm mx-auto w-fit">
                                  <Users className="w-4 h-4 text-emerald-500" />
                                  {plan.subscriber_count as number}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                    <div className="p-4 bg-emerald-50 border-t border-emerald-100 flex items-center gap-3">
                      <ShieldAlert className="size-4 text-emerald-600" />
                      <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-widest">
                        Read-Only Conduits: Standard administrative actions are disabled to prevent
                        core system failure.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {currentTab === "marathon" && marathonPlan && (
          <div>
            <div className="flex items-center justify-between mb-4 bg-emerald-50 p-4 rounded-lg border border-emerald-100">
              <div>
                <h2 className="text-lg font-bold text-emerald-900">Marathon Dashboard</h2>
                <p className="text-sm text-emerald-700">
                  Monitor all 30/48 week challenge participants.
                </p>
              </div>
              <Button
                variant="outline"
                className="border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                asChild
              >
                <a href={marathonPlan.whatsapp_link} target="_blank">
                  WhatsApp Group
                </a>
              </Button>
            </div>
            <MarathonAdminView plan={marathonPlan} />
          </div>
        )}

        {currentTab === "sprint" && sprintPlan && (
          <div>
            <div className="flex items-center justify-between mb-4 bg-blue-50 p-4 rounded-lg border border-blue-100">
              <div>
                <h2 className="text-lg font-bold text-blue-900">
                  30-Weeks Saving Sprint Dashboard
                </h2>
                <p className="text-sm text-blue-700">
                  Monitor active 30-week sprint participants and weekly targets.
                </p>
              </div>
              <Button
                variant="outline"
                className="border-blue-200 text-blue-700 hover:bg-blue-100"
                asChild
              >
                <a href={sprintPlan.whatsapp_link} target="_blank">
                  WhatsApp Group
                </a>
              </Button>
            </div>
            <SprintAdminView plan={sprintPlan} />
          </div>
        )}

        {currentTab === "anchor" && anchorPlan && (
          <div>
            <div className="flex items-center justify-between mb-4 bg-indigo-50 p-4 rounded-lg border border-indigo-100">
              <div>
                <h2 className="text-lg font-bold text-indigo-900">
                  48-Weeks Saving Sprint Dashboard
                </h2>
                <p className="text-sm text-indigo-700">
                  Monitor 48-week Anchor participants and weekly targets.
                </p>
              </div>
              <Button
                variant="outline"
                className="border-indigo-200 text-indigo-700 hover:bg-indigo-100"
                asChild
              >
                <a href={anchorPlan.whatsapp_link} target="_blank">
                  WhatsApp Group
                </a>
              </Button>
            </div>
            <AnchorAdminView plan={anchorPlan} />
          </div>
        )}

        {currentTab === "daily_drop" && dailyDropPlan && (
          <div>
            <div className="flex items-center justify-between mb-4 bg-cyan-50 p-4 rounded-lg border border-cyan-100">
              <div>
                <h2 className="text-lg font-bold text-cyan-900">Daily Savings Dashboard</h2>
                <p className="text-sm text-cyan-700">Monitor active daily savers.</p>
              </div>
              <Button
                variant="outline"
                className="border-cyan-200 text-cyan-700 hover:bg-cyan-100"
                asChild
              >
                <a href={dailyDropPlan.whatsapp_link} target="_blank">
                  WhatsApp Group
                </a>
              </Button>
            </div>
            <DailyDropAdminView plan={dailyDropPlan} />
          </div>
        )}

        {currentTab === "step_up" && stepUpPlan && (
          <div>
            <div className="flex items-center justify-between mb-4 bg-purple-50 p-4 rounded-lg border border-purple-100">
              <div>
                <h2 className="text-lg font-bold text-purple-900">Rapid Fixed Savings Dashboard</h2>
                <p className="text-sm text-purple-700">
                  Monitor active Rapid Fixed Savings tiers and weekly progress.
                </p>
              </div>
              <Button
                variant="outline"
                className="border-purple-200 text-purple-700 hover:bg-purple-100"
                asChild
              >
                <a href={stepUpPlan.whatsapp_link} target="_blank">
                  WhatsApp Group
                </a>
              </Button>
            </div>
            <StepUpAdminView plan={stepUpPlan} />
          </div>
        )}

        {currentTab === "monthly_bloom" && monthlyBloomPlan && (
          <div>
            <div className="flex items-center justify-between mb-4 bg-pink-50 p-4 rounded-lg border border-pink-100">
              <div>
                <h2 className="text-lg font-bold text-pink-900">Monthly Saving Plan Dashboard</h2>
                <p className="text-sm text-pink-700">
                  Monitor active Monthly Saving Plan participants.
                </p>
              </div>
              {monthlyBloomPlan.whatsapp_link && (
                <Button
                  variant="outline"
                  className="border-pink-200 text-pink-700 hover:bg-pink-100"
                  asChild
                >
                  <a href={monthlyBloomPlan.whatsapp_link} target="_blank">
                    WhatsApp Group
                  </a>
                </Button>
              )}
            </div>
            <MonthlyBloomAdminView />
          </div>
        )}

        {currentTab === "ajo_circle" && <AjoCircleAdminView />}
      </div>

      {/* The individual PIN modal is now handled at the top for clarity and single-state management */}

      <ActionConfirmModal
        isOpen={isConfirmOpen}
        onOpenChange={setIsConfirmOpen}
        onConfirm={confirmAction?.action || (async () => {})}
        title={confirmAction?.title || ""}
        description={confirmAction?.desc || ""}
        confirmText="Confirm Action"
        variant={confirmAction?.title.includes("Delete") ? "destructive" : "default"}
      />
    </div>
  );
}
