import { useEffect, useState } from "react";

import { Search, AlertTriangle, Play } from "lucide-react";
import { toast } from "sonner";

import { ActionConfirmModal } from "@/app/components/ui/ActionConfirmModal";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/components/ui/table";
import { supabase } from "@/lib/supabase";
import { Plan, UserPlan } from "@/types";

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
  const [isSettleOpen, setIsSettleOpen] = useState(false);
  const [isAutoSaveOpen, setIsAutoSaveOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchSubscribers();
  }, [plan.id]);

  async function fetchSubscribers() {
    setLoading(true);
    const { data, error } = await supabase
      .from("user_plans")
      .select("*, profiles(full_name, email)")
      .eq("plan_id", plan.id)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setSubscribers(data as any);
    }
    setLoading(false);
  }

  async function handleSettleWeek() {
    setLoading(true);
    setIsProcessing(true);
    const { error } = await supabase.rpc("settle_step_up_week");
    setLoading(false);
    setIsProcessing(false);
    setIsSettleOpen(false);

    if (error) {
      toast.error("Settlement Failed: " + error.message);
    } else {
      toast.success("Week Settled Successfully.");

      fetchSubscribers();
    }
  }

  async function handleTriggerAutoSave() {
    setLoading(true);
    setIsProcessing(true);
    const { data, error } = await supabase.rpc("trigger_all_auto_saves");
    setLoading(false);
    setIsProcessing(false);
    setIsAutoSaveOpen(false);

    if (error) {
      toast.error("Auto-Save Job Failed: " + error.message);
    } else {
      toast.success(
        `Auto-Save executed: ${data.processed} updated, ${data.arrears_created} arrears recorded.`,
      );
      fetchSubscribers();
    }
  }

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "NGN" }).format(val);

  const filteredSubs = subscribers.filter(
    (sub) =>
      sub.profiles?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      sub.profiles?.email?.toLowerCase().includes(search.toLowerCase()),
  );

  // Stats
  const totalSaved = subscribers.reduce((acc, sub) => acc + sub.current_balance, 0);
  const totalArrears = subscribers.reduce(
    (acc, sub) => acc + (sub.plan_metadata?.arrears_amount || 0),
    0,
  );

  const activeUsers = subscribers.filter((s) => s.status === "active").length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-purple-50 p-4 rounded-lg border border-purple-100 mb-4">
        <div>
          <h3 className="font-bold text-purple-900">Rapid Fixed Savings Controls</h3>
          <p className="text-sm text-purple-700">Manual triggers for recurring jobs.</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setIsSettleOpen(true)}
            variant="destructive"
            size="sm"
            disabled={isProcessing}
          >
            <Play className="w-4 h-4 mr-2" /> Force Week Settlement
          </Button>
          <Button
            onClick={() => setIsAutoSaveOpen(true)}
            variant="default"
            className="bg-purple-600 hover:bg-purple-700 text-white"
            size="sm"
            disabled={isProcessing}
          >
            <Play className="w-4 h-4 mr-2" /> Trigger Auto-Save
          </Button>
        </div>
      </div>

      <ActionConfirmModal
        isOpen={isSettleOpen}
        onOpenChange={setIsSettleOpen}
        onConfirm={handleSettleWeek}
        title="Force Week Settlement"
        description={`Force Settle Week for ALL active users? \n\nThis will check if they met their FIXED TARGET, apply charges or penalties, and reset their weekly counter. \n\nOnly do this if you know what you are doing (e.g. testing or missed Sunday cron job).`}
        confirmText="Settle All"
        variant="destructive"
        isLoading={isProcessing}
      />

      <ActionConfirmModal
        isOpen={isAutoSaveOpen}
        onOpenChange={setIsAutoSaveOpen}
        onConfirm={handleTriggerAutoSave}
        title="Trigger Global Auto-Save"
        description={`Run AUTO-SAVE Logic for ALL PLAN TYPES (Daily, Weekly, Monthly)?\n\nThis simulates the recurring background job.\nIt will attempt to cover deficits from General Wallet and record arrears if funds are missing.`}
        confirmText="Run Now"
        variant="info"
        isLoading={isProcessing}
      />

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
            <CardTitle className="text-sm font-medium text-slate-500">
              Total Arrears (Penalties)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(totalArrears)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Active Participants
            </CardTitle>
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
                <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                  Loading subscribers...
                </TableCell>
              </TableRow>
            ) : filteredSubs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                  No subscribers found.
                </TableCell>
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
                      <div className="font-medium">{sub.profiles?.full_name || "Unknown"}</div>
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
                      <span className="text-xs">
                        {weeksCompleted} / {totalWeeks}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span
                            className={isGoalMet ? "text-emerald-600 font-bold" : "text-slate-600"}
                          >
                            {formatCurrency(weekPaid)}
                          </span>
                        </div>
                        <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${isGoalMet ? "bg-emerald-500" : "bg-purple-400"}`}
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
                      <span
                        className={`text-xs font-medium px-2 py-1 rounded-full ${
                          sub.status === "active"
                            ? "bg-emerald-50 text-emerald-700"
                            : sub.status === "completed"
                              ? "bg-blue-50 text-blue-700"
                              : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {sub.status.replace("_", " ")}
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
