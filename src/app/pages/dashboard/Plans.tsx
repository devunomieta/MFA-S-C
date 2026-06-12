import { useEffect, useState } from "react";

import { Loader2, PiggyBank, Calendar, ShieldCheck } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { PlanRecommender } from "@/app/components/PlanRecommender";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { useAuth } from "@/app/context/AuthContext";
import { checkAndProcessMaturity } from "@/lib/planUtils";
import { slugify } from "@/lib/slug";
import { supabase } from "@/lib/supabase";
import { Plan, UserPlan } from "@/types";

const PlanCardGrid = ({
  items,
  type,
  myPlans,
}: {
  items: any[];
  type: "available" | "active";
  myPlans: UserPlan[];
}) => {
  const navigate = useNavigate();

  const hasJoinedPlan = (planId: string) =>
    myPlans.some((p) => p.plan_id === planId && p.status !== "cancelled");

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
      {items.length === 0 ? (
        <div className="col-span-full py-20 text-center bg-gray-50/50 dark:bg-gray-800/20 rounded-2xl border-2 border-dashed border-gray-100 dark:border-gray-800">
          <PiggyBank className="size-12 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 font-medium">No plans found in this category.</p>
        </div>
      ) : (
        items.map((item, index) => {
          const plan = type === "active" ? item.plan : item;
          const isJoined = hasJoinedPlan(plan.id);

          return (
            <Card
              key={item.id || `plan-${index}`}
              className="group hover:shadow-2xl transition-all duration-500 border-gray-100 dark:border-gray-800 overflow-hidden flex flex-col h-full bg-white dark:bg-gray-950 shadow-sm relative hover:-translate-y-1"
            >
              {/* Decorative accent */}
              <div
                className={`absolute top-0 left-0 w-full h-1.5 ${
                  plan.type === "marathon"
                    ? "bg-emerald-500"
                    : plan.type === "sprint"
                      ? "bg-blue-500"
                      : plan.type === "anchor"
                        ? "bg-indigo-600"
                        : plan.type === "daily_drop"
                          ? "bg-cyan-500"
                          : plan.type === "step_up"
                            ? "bg-teal-600"
                            : plan.type === "monthly_bloom"
                              ? "bg-pink-500"
                              : "bg-emerald-600"
                }`}
              />

              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div className="space-y-1.5">
                    <CardTitle className="text-xl font-bold tracking-tight text-gray-900 dark:text-white line-clamp-1">
                      {plan.name}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      {type === "active" ? (
                        <Badge
                          className={`text-[10px] font-black px-2 py-0.5 border-none ${
                            item.status === "matured"
                              ? "bg-amber-100 text-amber-700"
                              : item.status === "active"
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {item.status.toUpperCase()}
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-[10px] uppercase font-black text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30 bg-emerald-50 dark:bg-emerald-900/10 tracking-wider px-2 shadow-sm"
                        >
                          {plan.type === "marathon"
                            ? "Endurance"
                            : plan.type === "sprint"
                              ? "Velocity"
                              : plan.type === "anchor"
                                ? "Stability"
                                : plan.type === "daily_drop"
                                  ? "Consistency"
                                  : plan.type === "step_up"
                                    ? "Progress"
                                    : plan.type === "monthly_bloom"
                                      ? "Harvest"
                                      : "Community"}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 space-y-5 pt-4">
                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed h-[3.25em] overflow-hidden">
                  {plan.description}
                </p>

                <div className="space-y-3.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400 flex items-center gap-2 font-semibold">
                      <Calendar className="size-4 text-gray-300" />
                      Duration
                    </span>
                    <span className="text-gray-700 dark:text-gray-200 font-bold">
                      {plan.type === "marathon"
                        ? "30 or 48 Weeks"
                        : plan.duration_weeks
                          ? `${plan.duration_weeks} Weeks`
                          : plan.duration_months
                            ? `${plan.duration_months} Months`
                            : "Flexible"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-gray-400 flex items-center gap-2 font-semibold">
                      <ShieldCheck className="size-4 text-emerald-400" />
                      Min. Savings
                    </span>
                    <span className="text-emerald-700 dark:text-emerald-400 font-black">
                      ₦{new Intl.NumberFormat("en-US").format(plan.min_amount)}
                    </span>
                  </div>

                  {type === "active" && (
                    <div className="flex items-center justify-between text-xs border-t border-gray-50 dark:border-gray-800 pt-3.5">
                      <span className="text-gray-400 flex items-center gap-2 font-semibold">
                        <PiggyBank className="size-4 text-emerald-400" />
                        Saved Balance
                      </span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-black text-sm">
                        ₦{new Intl.NumberFormat("en-US").format(item.current_balance)}
                      </span>
                    </div>
                  )}
                </div>

                <Button
                  className="w-full h-12 transition-all font-bold tracking-wide mt-2 shadow-lg shadow-emerald-500/10 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white border-none transition-all duration-300 hover:-translate-y-0.5"
                  onClick={() => navigate(`/dashboard/plans/${slugify(plan.name)}`)}
                >
                  {type === "active" || isJoined
                    ? "Manage Plan"
                    : `Join ${plan.name.replace(/^The\s+/i, "")}`}
                </Button>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
};

export function Plans() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [availablePlans, setAvailablePlans] = useState<Plan[]>([]);
  const [myPlans, setMyPlans] = useState<UserPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const joinId = searchParams.get("join");
  const [activeTab, setActiveTab] = useState("available");

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "compare" || tabParam === "my-plans" || tabParam === "available") {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const handleTabChange = (val: string) => {
    setActiveTab(val);
    setSearchParams((prev) => {
      prev.set("tab", val);
      return prev;
    });
  };

  useEffect(() => {
    const fetchData = async () => {
      // Fetch Plans
      const { data: plansData, error: plansError } = await supabase
        .from("plans")
        .select("*")
        .eq("is_active", true)
        .order("min_amount", { ascending: true });

      if (!plansError && plansData) {
        setAvailablePlans(plansData as any);
      }

      // Fetch My Plans
      if (user) {
        const { data: myData, error: myError } = await supabase
          .from("user_plans")
          .select(`*, plan:plans(*)`)
          .eq("user_id", user.id);

        if (!myError && myData) {
          setMyPlans(myData as any);
          await checkAndProcessMaturity(supabase, myData);
        }
        setLoading(false);
      }
    };

    fetchData();

    const channel = supabase
      .channel("user_plans_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_plans", filter: `user_id=eq.${user?.id}` },
        () => {
          fetchData();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Handle auto-join from URL param
  useEffect(() => {
    if (joinId && availablePlans.length > 0) {
      const targetPlan = availablePlans.find((p) => p.id === joinId);
      if (targetPlan) {
        // Clear param to avoid infinite loop or repeated redirects
        navigate(`/dashboard/plans/${slugify(targetPlan.name)}`, { replace: true });
      }
    }
  }, [joinId, availablePlans, navigate]);

  // Filter and De-duplicate active plans list
  const activePlansList = myPlans
    .filter(
      (p) =>
        p.status === "active" ||
        p.status === "matured" ||
        p.status === "pending_activation" ||
        p.status === "completed" ||
        p.status === "pending_turn_approval" ||
        p.status === "turn_reassigned",
    )
    .sort((a, b) => {
      // Prioritize Active > Pending > Matured (Descending Weight)
      const statusWeight = {
        active: 5,
        turn_reassigned: 4,
        pending_turn_approval: 3,
        pending_activation: 2,
        matured: 1,
        completed: 0,
      };
      const weightA = statusWeight[a.status as keyof typeof statusWeight] || 0;
      const weightB = statusWeight[b.status as keyof typeof statusWeight] || 0;

      if (weightB !== weightA) return weightB - weightA;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    })
    .filter(
      (plan, index, self) =>
        // Only keep the first (highest priority/latest) instance of each plan type
        index === self.findIndex((p) => p.plan_id === plan.plan_id),
    );

  if (loading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div className="space-y-1">
        <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">
          Savings Plans
        </h1>
        <p className="text-gray-500 dark:text-gray-400 font-medium">
          Choose a plan that suits your financial goals.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="bg-gray-100/50 dark:bg-gray-800/50 p-1.5 rounded-2xl w-fit flex h-auto gap-1 mb-6 border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-sm">
          <TabsTrigger
            value="available"
            className="px-8 py-3 rounded-xl data-[state=active]:bg-white dark:data-[state=active]:bg-gray-900 data-[state=active]:text-emerald-600 data-[state=active]:shadow-lg font-black transition-all text-gray-400 tracking-tight text-sm"
          >
            Available Plans
          </TabsTrigger>
          <TabsTrigger
            value="my-plans"
            className="px-8 py-3 rounded-xl data-[state=active]:bg-white dark:data-[state=active]:bg-gray-900 data-[state=active]:text-emerald-600 data-[state=active]:shadow-lg font-black transition-all text-gray-400 tracking-tight text-sm flex items-center gap-2"
          >
            My Active Plans
            {activePlansList.length > 0 && (
              <Badge className="bg-emerald-100 text-emerald-700 border-none px-1.5 h-5 min-w-5 flex items-center justify-center font-black rounded-lg">
                {activePlansList.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="compare"
            className="px-8 py-3 rounded-xl data-[state=active]:bg-white dark:data-[state=active]:bg-gray-900 data-[state=active]:text-emerald-600 data-[state=active]:shadow-lg font-black transition-all text-gray-400 tracking-tight text-sm"
          >
            Compare Plans
          </TabsTrigger>
        </TabsList>

        <TabsContent value="available" className="pt-8">
          <PlanCardGrid
            items={availablePlans.filter(
              (ap) => !myPlans.some((mp) => mp.plan_id === ap.id && mp.status !== "cancelled"),
            )}
            type="available"
            myPlans={myPlans}
          />
        </TabsContent>

        <TabsContent value="my-plans" className="pt-8">
          <PlanCardGrid items={activePlansList} type="active" myPlans={myPlans} />
        </TabsContent>

        <TabsContent value="compare" className="pt-8">
          <PlanRecommender inline defaultTab="compare" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
