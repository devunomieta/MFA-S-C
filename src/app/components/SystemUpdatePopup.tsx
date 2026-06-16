import { useEffect, useState } from "react";

import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, CheckCircle2, Wrench, Info } from "lucide-react";

import { supabase } from "@/lib/supabase";

import { Button } from "./ui/button";

interface SystemUpdate {
  id: string;
  version: string;
  type: string;
  message: string;
  features: string[];
  bugfixes: string[];
  created_at: string;
}

export function SystemUpdatePopup() {
  const [update, setUpdate] = useState<SystemUpdate | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  async function fetchLatestUpdate() {
    try {
      const { data } = await supabase
        .from("announcements")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        // Check if user has already dismissed this specific update version/id
        const dismissedUpdates = JSON.parse(localStorage.getItem("dismissed_updates") || "[]");
        if (!dismissedUpdates.includes(data.id)) {
          setUpdate(data);
          // Small delay before showing popup for better UX
          setTimeout(() => setIsOpen(true), 1500);
        }
      }
    } catch (err) {
      console.error("Failed to fetch system update", err);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line
    fetchLatestUpdate();
  }, []);

  function handleDismiss() {
    if (update) {
      const dismissedUpdates = JSON.parse(localStorage.getItem("dismissed_updates") || "[]");
      dismissedUpdates.push(update.id);
      localStorage.setItem("dismissed_updates", JSON.stringify(dismissedUpdates));
      setIsOpen(false);
    }
  }

  if (!update) return null;

  const getTypeIcon = () => {
    switch (update.type) {
      case "success":
        return <Sparkles className="w-6 h-6 text-emerald-500" />;
      case "warning":
        return <Wrench className="w-6 h-6 text-amber-500" />;
      case "error":
        return <CheckCircle2 className="w-6 h-6 text-red-500" />;
      default:
        return <Info className="w-6 h-6 text-blue-500" />;
    }
  };

  const getTypeBadgeColor = () => {
    switch (update.type) {
      case "success":
        return "bg-emerald-100 text-emerald-700";
      case "warning":
        return "bg-amber-100 text-amber-700";
      case "error":
        return "bg-red-100 text-red-700";
      default:
        return "bg-blue-100 text-blue-700";
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden relative"
          >
            <button
              onClick={handleDismiss}
              className="absolute top-4 right-4 p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 transition-colors z-10"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="p-8">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  {getTypeIcon()}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 leading-tight tracking-tight">
                    System Update
                  </h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-mono text-sm font-semibold text-slate-500">
                      {update.version || "v1.0"}
                    </span>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${getTypeBadgeColor()}`}
                    >
                      {update.type === "success"
                        ? "New Feature"
                        : update.type === "warning"
                          ? "Maintenance"
                          : update.type === "error"
                            ? "Critical Fix"
                            : "Info"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="prose prose-slate prose-sm mb-6">
                <p className="text-slate-600 text-base leading-relaxed">{update.message}</p>
              </div>

              <div className="space-y-6">
                {update.features && update.features.length > 0 && (
                  <div className="bg-emerald-50/50 rounded-2xl p-5 border border-emerald-100">
                    <h3 className="flex items-center gap-2 font-bold text-emerald-800 mb-3 text-sm uppercase tracking-wide">
                      <Sparkles className="w-4 h-4" /> What's New
                    </h3>
                    <ul className="space-y-2">
                      {update.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-2 text-emerald-700 text-sm">
                          <span className="text-emerald-400 mt-0.5">•</span>
                          <span className="leading-relaxed">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {update.bugfixes && update.bugfixes.length > 0 && (
                  <div className="bg-amber-50/50 rounded-2xl p-5 border border-amber-100">
                    <h3 className="flex items-center gap-2 font-bold text-amber-800 mb-3 text-sm uppercase tracking-wide">
                      <Wrench className="w-4 h-4" /> Bug Fixes & Improvements
                    </h3>
                    <ul className="space-y-2">
                      {update.bugfixes.map((fix, i) => (
                        <li key={i} className="flex items-start gap-2 text-amber-700 text-sm">
                          <span className="text-amber-400 mt-0.5">•</span>
                          <span className="leading-relaxed">{fix}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end">
                <Button
                  onClick={handleDismiss}
                  className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl px-8 h-12 text-sm font-semibold w-full sm:w-auto shadow-xl shadow-slate-900/10 active:scale-95 transition-all"
                >
                  Got it, thanks!
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
