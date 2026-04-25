import { useEffect, useState } from "react";

import { History, ArrowDownLeft, ArrowUpRight, Scale, Receipt } from "lucide-react";

import { Badge } from "@/app/components/ui/badge";
import { supabase } from "@/lib/supabase";

interface PlanActivityHistoryProps {
  userId: string;
  planId: string; // Generic Plan ID
  userPlanId: string; // Specific Enrollment ID
}

export function PlanActivityHistory({ userId, planId, userPlanId }: PlanActivityHistoryProps) {
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, [userId, planId, userPlanId]);

  async function fetchHistory() {
    setLoading(true);
    try {
      // Currently filtering by user_id and plan_id (generic)
      // Ideally should filter by user_plan_id if schema allowed it.
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", userId)
        .eq("plan_id", planId)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      setActivities(data || []);
    } catch (err) {
      console.error("Error fetching plan history:", err);
    } finally {
      setLoading(false);
    }
  }

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "NGN" }).format(val);

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });

  if (loading)
    return (
      <div className="flex justify-center p-12">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <History className="size-8 text-gray-200" />
          <div className="h-4 w-32 bg-gray-100 rounded-full" />
        </div>
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded-xl">
            <History className="size-5 text-gray-500" />
          </div>
          <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">
            Activity History
          </h3>
        </div>
        <Badge variant="outline" className="font-bold border-gray-200 text-gray-400">
          Recent {activities.length}
        </Badge>
      </div>

      <div className="space-y-3">
        {activities.length === 0 ? (
          <div className="py-12 text-center bg-gray-50 dark:bg-gray-900/50 rounded-[2rem] border border-dashed border-gray-200 dark:border-gray-800">
            <Receipt className="size-10 mx-auto text-gray-300 mb-3" />
            <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">
              No activities yet
            </p>
          </div>
        ) : (
          activities.map((tx) => (
            <div
              key={tx.id}
              className="group bg-white dark:bg-gray-950 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 hover:border-emerald-200 dark:hover:border-emerald-900/30 transition-all flex items-center justify-between shadow-sm"
            >
              <div className="flex items-center gap-4">
                <div
                  className={`size-10 rounded-xl flex items-center justify-center ${
                    tx.type === "deposit" || tx.type === "transfer"
                      ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20"
                      : tx.type === "fee"
                        ? "bg-amber-50 text-amber-600 dark:bg-amber-900/20"
                        : "bg-rose-50 text-rose-600 dark:bg-rose-900/20"
                  }`}
                >
                  {tx.type === "deposit" || tx.type === "transfer" ? (
                    <ArrowDownLeft className="size-5" />
                  ) : tx.type === "fee" ? (
                    <Scale className="size-5" />
                  ) : (
                    <ArrowUpRight className="size-5" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-black text-gray-900 dark:text-white capitalize leading-none mb-1">
                    {tx.type === "fee" ? "Service Charge" : tx.type}
                  </p>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                    {tx.description || "Transaction completed"}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p
                  className={`text-sm font-black ${
                    tx.type === "deposit" || tx.type === "transfer"
                      ? "text-emerald-600"
                      : "text-gray-900 dark:text-white"
                  }`}
                >
                  {tx.type === "fee" ? "-" : "+"}
                  {formatCurrency(tx.amount)}
                </p>
                <p className="text-[10px] font-bold text-gray-400">{formatDate(tx.created_at)}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
