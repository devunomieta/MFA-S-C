import { useEffect, useState } from "react";

import { motion } from "framer-motion";
import { Sparkles, Wrench, Info } from "lucide-react";

import { Footer } from "@/app/components/Footer";
import { Navbar } from "@/app/components/Navbar";
import { supabase } from "@/lib/supabase";

export function Changelog() {
  const [changelogs, setChangelogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchChangelogs() {
      try {
        const { data } = await supabase
          .from("announcements")
          .select("*")
          .eq("is_active", true)
          .order("created_at", { ascending: false });

        if (data) setChangelogs(data);
      } catch (error) {
        console.error("Failed to load changelogs:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchChangelogs();
  }, []);

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "success":
        return (
          <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
            New Feature
          </span>
        );
      case "warning":
        return (
          <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
            Maintenance
          </span>
        );
      case "error":
        return (
          <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
            Critical Fix
          </span>
        );
      default:
        return (
          <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
            System Upgrade
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen relative flex flex-col overflow-hidden bg-white dark:bg-slate-950">
      <div className="absolute inset-0 pointer-events-none">
        <motion.div
          animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-emerald-50/50 dark:bg-emerald-900/10 rounded-full blur-[100px]"
        />
        <motion.div
          animate={{ scale: [1.2, 1, 1.2], rotate: [0, -90, 0] }}
          transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-50/50 dark:bg-blue-900/10 rounded-full blur-[100px]"
        />
      </div>

      <Navbar />

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-32 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4 text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-emerald-400">
            Changelog & Updates
          </h1>
          <p className="text-lg text-slate-500 dark:text-slate-400 max-w-xl mx-auto font-medium">
            Stay up to date with the latest features, bug fixes, and improvements to Mary's Thrift
            Services.
          </p>
        </motion.div>

        {loading ? (
          <div className="flex justify-center py-12">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="size-8 border-2 border-emerald-600/30 border-t-emerald-600 rounded-full"
            />
          </div>
        ) : changelogs.length === 0 ? (
          <div className="text-center py-12 bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl rounded-3xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm">
            <Info className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500 dark:text-slate-400 font-medium">
              No updates published yet.
            </p>
          </div>
        ) : (
          <div className="space-y-12">
            {changelogs.map((log, index) => (
              <motion.article
                key={log.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="relative pl-8 md:pl-0"
              >
                {/* Timeline Line for desktop */}
                <div className="hidden md:block absolute left-[120px] top-0 bottom-0 w-px bg-slate-200 dark:bg-slate-800"></div>

                <div className="md:flex gap-8 items-start relative">
                  {/* Date column (Desktop) */}
                  <div className="hidden md:block w-[100px] shrink-0 text-right pt-2 relative">
                    <span className="text-sm font-bold text-slate-500 dark:text-slate-400">
                      {new Date(log.created_at).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                    {/* Timeline dot */}
                    <div className="absolute right-[-21px] top-3.5 w-3 h-3 rounded-full bg-emerald-500 border-4 border-white dark:border-slate-950 shadow-sm z-10"></div>
                  </div>

                  {/* Main content card */}
                  <div className="flex-1 bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl rounded-3xl p-6 md:p-8 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-slate-200/50 dark:border-slate-800/50 hover:shadow-[0_20px_50px_rgba(0,0,0,0.08)] transition-all">
                    <div className="md:hidden text-sm font-bold text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                      {new Date(log.created_at).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </div>

                    <div className="flex items-center gap-3 mb-4 flex-wrap">
                      <span className="font-mono text-sm font-bold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-lg">
                        {log.version || "Update"}
                      </span>
                      {getTypeBadge(log.type)}
                    </div>

                    <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-4 tracking-tight">
                      {log.message}
                    </h2>

                    <div className="space-y-8 mt-6">
                      {log.features && log.features.length > 0 && (
                        <div>
                          <h3 className="flex items-center gap-2 font-bold text-slate-900 dark:text-white mb-3">
                            <div className="p-1.5 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg text-emerald-600 dark:text-emerald-400">
                              <Sparkles className="w-4 h-4" />
                            </div>
                            New Features
                          </h3>
                          <ul className="space-y-3">
                            {log.features.map((feature: string, i: number) => (
                              <li
                                key={i}
                                className="flex items-start gap-3 text-slate-600 dark:text-slate-300 font-medium"
                              >
                                <span className="text-emerald-500 mt-1">•</span>
                                <span className="leading-relaxed">{feature}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {log.bugfixes && log.bugfixes.length > 0 && (
                        <div>
                          <h3 className="flex items-center gap-2 font-bold text-slate-900 dark:text-white mb-3">
                            <div className="p-1.5 bg-amber-50 dark:bg-amber-900/30 rounded-lg text-amber-600 dark:text-amber-400">
                              <Wrench className="w-4 h-4" />
                            </div>
                            Bug Fixes
                          </h3>
                          <ul className="space-y-3">
                            {log.bugfixes.map((fix: string, i: number) => (
                              <li
                                key={i}
                                className="flex items-start gap-3 text-slate-600 dark:text-slate-300 font-medium"
                              >
                                <span className="text-amber-500 mt-1">•</span>
                                <span className="leading-relaxed">{fix}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
