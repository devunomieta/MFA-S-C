import { useState, useEffect } from "react";

import { Loader2, Calendar, Play, Settings } from "lucide-react";
import { toast } from "sonner";

import { ActionConfirmModal } from "@/app/components/ui/ActionConfirmModal";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/app/components/ui/dialog";
import { Input } from "@/app/components/ui/input";
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
import { supabase } from "@/lib/supabase";

export function AjoCircleAdminView() {
  const [subscribers, setSubscribers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [newDuration, setNewDuration] = useState(10);
  const [newStartDate, setNewStartDate] = useState("");
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    desc: string;
    action: () => Promise<void>;
  } | null>(null);

  const fetchSubscribers = async () => {
    // Get Plan ID
    const { data: planData } = await supabase
      .from("plans")
      .select("id")
      .eq("type", "ajo_circle")
      .single();

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

  useEffect(() => {
    Promise.resolve().then(() => fetchSubscribers());
  }, []);

  const handleAssignTurn = async (userPlanId: string, turn: string) => {
    if (!turn) return;
    const week = parseInt(turn);

    // Fetch current picking turns
    const subscriber = subscribers.find((s) => s.id === userPlanId);
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
      picking_turns: currentTurns,
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

  const handleApproveTurn = async (userPlanId: string, accept: boolean) => {
    setProcessing(true);
    const subscriber = subscribers.find((s) => s.id === userPlanId);
    if (!subscriber) {
      setProcessing(false);
      return;
    }

    if (accept) {
      const proposed = subscriber.plan_metadata.proposed_turns || [];
      const updatedMetadata = {
        ...subscriber.plan_metadata,
        picking_turns: proposed,
      };

      const { error } = await supabase
        .from("user_plans")
        .update({ status: "active", plan_metadata: updatedMetadata })
        .eq("id", userPlanId);

      if (error) {
        toast.error("Failed to approve turn.");
      } else {
        toast.success("Turn approved and plan activated!");
      }
    } else {
      // Re-assigning means they are now in 'turn_reassigned' status and Admin must use Assign Turn select box
      const { error } = await supabase
        .from("user_plans")
        .update({ status: "turn_reassigned" })
        .eq("id", userPlanId);

      if (error) {
        toast.error("Failed to mark for reassignment.");
      } else {
        toast.success("Marked for reassignment. Please assign a new turn.");
      }
    }
    fetchSubscribers();
    setProcessing(false);
  };

  const triggerWeeklySettlement = async () => {
    setConfirmAction({
      title: "Settle Ajo Week",
      desc: "Are you sure you want to settle the week? This will apply penalties for missed payments and advance the week.",
      action: async () => {
        setProcessing(true);
        const { error } = await supabase.rpc("settle_ajo_circle_week");
        if (error) {
          toast.error(`Settlement failed: ${error.message}`);
        } else {
          toast.success("Weekly settlement completed.");
          fetchSubscribers();
        }
        setProcessing(false);
        setIsConfirmOpen(false);
      },
    });
    setIsConfirmOpen(true);
  };


  const updateSeasonConfig = async () => {
    setProcessing(true);
    // Fetch current config first to preserve amounts/fees
    const { data: plan } = await supabase
      .from("plans")
      .select("config")
      .eq("type", "ajo_circle")
      .single();
    if (!plan) return;

    const newConfig = {
      ...plan.config,
      duration_weeks: newDuration,
      season_start_date: newStartDate,
    };

    const { error } = await supabase
      .from("plans")
      .update({
        config: newConfig,
        duration_weeks: newDuration,
      })
      .eq("type", "ajo_circle");

    if (error) {
      toast.error("Failed to update season config");
    } else {
      toast.success("Season configuration updated!");
    }
    setProcessing(false);
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "NGN" }).format(val);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-orange-0 p-4 rounded-lg border border-orange-100 dark:bg-orange-900/20 dark:border-orange-800">
        <div>
          <h2 className="text-xl font-bold text-emerald-900">Digital Ajo Plan Dashboard</h2>
          <p className="text-sm text-gray-600 dark:text-gray-700">
            Manage picking turns and weekly progress.
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Settings className="w-4 h-4 mr-2" /> Ajo Settings
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Configure Ajo Season</DialogTitle>
                <DialogDescription>
                  Set the duration and start date for the next plan cycle.
                </DialogDescription>
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
                  {processing ? "Updating..." : "Update Season"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Button variant="destructive" onClick={triggerWeeklySettlement} disabled={processing}>
            <Calendar className="w-4 h-4 mr-2" /> Settle Week
          </Button>
        </div>
      </div>

      <ActionConfirmModal
        isOpen={isConfirmOpen}
        onOpenChange={setIsConfirmOpen}
        onConfirm={confirmAction?.action || (() => {})}
        title={confirmAction?.title || "Confirm Action"}
        description={confirmAction?.desc || "Are you sure?"}
        confirmText="Proceed"
        variant={confirmAction?.title.includes("Settle") ? "destructive" : "info"}
        isLoading={processing}
      />

      <Card>
        <CardHeader>
          <CardTitle>Active Subscribers ({subscribers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="animate-spin" />
            </div>
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
                        <div className="font-medium">{sub.profiles?.full_name || "Unknown"}</div>
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
                          {(sub.status === "pending_turn_approval" || sub.status === "appeal_pending") && meta.proposed_turns?.length > 0 ? (
                            <div className="flex flex-col gap-1">
                                {turns.length > 0 && <div className="text-[10px] text-gray-400">Current: {turns.map((t:any) => `W${t}`).join(', ')}</div>}
                                <div className="flex gap-1">
                                {meta.proposed_turns.map((t: number) => (
                                  <Badge key={t} className={sub.status === "appeal_pending" ? "bg-purple-100 text-purple-800" : "bg-amber-100 text-amber-800"}>
                                    {sub.status === "appeal_pending" ? "Appealed:" : "Proposed:"} W{t}
                                  </Badge>
                                ))}
                                </div>
                            </div>
                          ) : turns.length > 0 ? (
                            turns.map((t: number) => (
                              <Badge
                                key={t}
                                className="bg-indigo-100 text-indigo-800 hover:bg-indigo-200"
                              >
                                Week {t}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-gray-400 text-sm">None Assigned</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {sub.status === "pending_turn_approval" ? (
                          <Badge className="bg-amber-500 text-white">Pending Approval</Badge>
                        ) : sub.status === "turn_reassigned" ? (
                          <Badge className="bg-blue-500 text-white">Turn Reassigned</Badge>
                        ) : sub.status === "appeal_pending" ? (
                          <Badge className="bg-purple-500 text-white">Appeal Pending</Badge>
                        ) : weekPaid ? (
                          <Badge className="bg-emerald-100 text-emerald-800">Paid</Badge>
                        ) : (
                          <Badge variant="destructive">Due</Badge>
                        )}
                        {meta.missed_weeks > 0 && (
                          <div className="text-xs text-red-500 mt-1">
                            {meta.missed_weeks} Missed
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {sub.status === "pending_turn_approval" || sub.status === "appeal_pending" ? (
                          <div className="flex gap-2">
                            <Button size="sm" className={sub.status === "appeal_pending" ? "bg-purple-600 hover:bg-purple-700 text-white" : ""} onClick={() => handleApproveTurn(sub.id, true)} disabled={processing}>Approve</Button>
                            <Button size="sm" variant="destructive" onClick={() => handleApproveTurn(sub.id, false)} disabled={processing}>Re-assign</Button>
                          </div>
                        ) : (
                          <Select onValueChange={(val) => handleAssignTurn(sub.id, val)}>
                            <SelectTrigger className="w-[140px]">
                              <SelectValue placeholder="Assign Turn" />
                            </SelectTrigger>
                            <SelectContent>
                              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((w) => (
                                <SelectItem key={w} value={w.toString()}>
                                  Week {w} {turns.includes(w) ? "(Remove)" : ""}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
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
