import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, LogIn, Wallet, CheckCircle2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

type UIActivityType = 'joined' | 'deposited' | 'withdrew';

interface Activity {
    id: string | number;
    name: string;
    action: UIActivityType;
    plan: string;
    isReal?: boolean;
}

const names = ["Daniel", "Blessing", "Joseph", "Chioma", "Ibrahim", "Amara", "Samuel", "Fatima", "David", "Nneka", "Tunde", "Zainab"];
const plans = ["Marathon Plan", "Sprint Circle", "Ajo Daily", "Anchor Savings", "Monthly Bloom", "Step Up Habit"];
const uiActions: UIActivityType[] = ['joined', 'deposited', 'withdrew'];

export function ActivityPopup() {
    const [activity, setActivity] = useState<Activity | null>(null);

    const showActivity = useCallback((act: Activity) => {
        setActivity(act);
        // Clear activity after 5 seconds
        setTimeout(() => setActivity(null), 5000);
    }, []);

    const generateDummyActivity = useCallback(() => {
        const name = names[Math.floor(Math.random() * names.length)];
        const plan = plans[Math.floor(Math.random() * plans.length)];
        const action = uiActions[Math.floor(Math.random() * uiActions.length)];

        showActivity({
            id: Date.now(),
            name,
            action,
            plan,
            isReal: false
        });
    }, [showActivity]);

    const mapDbToUi = (log: any): Activity => {
        let action: UIActivityType = 'joined';
        if (log.action === 'DEPOSIT') action = 'deposited';
        if (log.action === 'WITHDRAWAL') action = 'withdrew';

        return {
            id: log.id,
            name: log.details?.display_name || 'Someone',
            action: action,
            plan: log.details?.plan_name || 'the platform',
            isReal: true
        };
    };

    useEffect(() => {
        // 1. Initial Fetch of recent public activities
        const fetchInitial = async () => {
            const { data } = await supabase
                .from('activity_logs')
                .select('*')
                .eq('is_public', true)
                .order('created_at', { ascending: false })
                .limit(5);

            if (data && data.length > 0) {
                // Show most recent one after a delay
                setTimeout(() => showActivity(mapDbToUi(data[0])), 3000);
            } else {
                // No real data yet, start dummy
                setTimeout(generateDummyActivity, 3000);
            }
        };

        fetchInitial();

        // 2. Real-time Subscription
        const channel = supabase
            .channel('public_activities')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'activity_logs',
                    filter: 'is_public=eq.true'
                },
                (payload) => {
                    console.log('New real activity:', payload.new);
                    showActivity(mapDbToUi(payload.new));
                }
            )
            .subscribe();

        // 3. Fallback Interval (Filler)
        const interval = setInterval(() => {
            // Only generate dummy if no activity is showing
            if (!activity) {
                generateDummyActivity();
            }
        }, 20000); // Less frequent if we have real data potentially

        return () => {
            supabase.removeChannel(channel);
            clearInterval(interval);
        };
    }, [generateDummyActivity, showActivity]);

    const getActionDetails = (action: UIActivityType) => {
        switch (action) {
            case 'joined':
                return { text: "just joined", icon: <Users className="size-4 text-emerald-600" />, color: "bg-emerald-50" };
            case 'deposited':
                return { text: "deposited into", icon: <Wallet className="size-4 text-blue-600" />, color: "bg-blue-50" };
            case 'withdrew':
                return { text: "just payouts from", icon: <CheckCircle2 className="size-4 text-emerald-600" />, color: "bg-emerald-50" };
            default:
                return { text: "active on", icon: <LogIn className="size-4 text-slate-600" />, color: "bg-slate-50" };
        }
    };

    return (
        <div className="fixed bottom-8 left-8 z-[100] pointer-events-none">
            <AnimatePresence>
                {activity && (
                    <motion.div
                        key={activity.id}
                        initial={{ opacity: 0, x: -40, scale: 0.9 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: -20, scale: 0.95 }}
                        className="pointer-events-auto"
                    >
                        <div className="bg-white/95 backdrop-blur-xl border border-slate-200 p-4 rounded-2xl shadow-2xl flex items-center gap-4 max-w-sm ring-1 ring-black/5">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${getActionDetails(activity.action).color}`}>
                                {getActionDetails(activity.action).icon}
                            </div>
                            <div className="flex flex-col">
                                <p className="text-sm font-bold text-slate-900 leading-tight">
                                    {activity.name} <span className="text-slate-500 font-medium">{getActionDetails(activity.action).text}</span> {activity.plan}
                                </p>
                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">
                                    Just Now
                                </p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
