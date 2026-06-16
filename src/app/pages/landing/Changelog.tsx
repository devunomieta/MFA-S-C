import { useEffect, useState, useMemo } from "react";

import { motion } from "framer-motion";
import { Sparkles, Wrench, Info, Search, ListFilter, ChevronLeft, ChevronRight, X } from "lucide-react";

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

  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"date_desc" | "date_asc" | "version_desc" | "version_asc">("date_desc");
  const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const periods = useMemo(() => {
    const p = new Set<string>();
    changelogs.forEach(log => {
      const date = new Date(log.created_at);
      const periodStr = date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
      p.add(periodStr);
    });
    return Array.from(p);
  }, [changelogs]);

  const processedLogs = useMemo(() => {
    let result = [...changelogs];

    if (selectedPeriod) {
      result = result.filter(log => {
        const date = new Date(log.created_at);
        const periodStr = date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
        return periodStr === selectedPeriod;
      });
    }

    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      result = result.filter(log => {
        const inMessage = log.message?.toLowerCase().includes(q);
        const inVersion = log.version?.toLowerCase().includes(q);
        const inFeatures = log.features?.some((f: string) => f.toLowerCase().includes(q));
        const inBugfixes = log.bugfixes?.some((f: string) => f.toLowerCase().includes(q));
        return inMessage || inVersion || inFeatures || inBugfixes;
      });
    }

    result.sort((a, b) => {
      if (sortBy.startsWith("date")) {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        return sortBy === "date_desc" ? dateB - dateA : dateA - dateB;
      } else {
        const vA = a.version || "";
        const vB = b.version || "";
        return sortBy === "version_desc" ? vB.localeCompare(vA) : vA.localeCompare(vB);
      }
    });

    return result;
  }, [changelogs, searchQuery, selectedPeriod, sortBy]);

  const totalPages = Math.ceil(processedLogs.length / itemsPerPage);
  const currentLogs = processedLogs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedPeriod, sortBy]);

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

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-32 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-4 text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-emerald-400">
            Changelog & Updates
          </h1>
          <p className="text-base text-slate-500 dark:text-slate-400 max-w-xl mx-auto font-medium">
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
          <>
            <div className="sticky top-20 z-40 bg-white/80 dark:bg-slate-950/90 backdrop-blur-2xl border-b border-slate-200 dark:border-slate-800 pb-4 pt-4 mb-16 -mx-4 px-4 sm:mx-0 sm:px-0 transition-all">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row gap-4 items-center">
                  <div className="relative flex-1 w-full">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder="Search updates, features, or fixes..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all shadow-sm"
                    />
                    {searchQuery && (
                      <button onClick={() => setSearchQuery("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                    <ListFilter className="w-4 h-4 text-slate-400 hidden sm:block" />
                    <select 
                      value={sortBy}
                      onChange={(e: any) => setSortBy(e.target.value)}
                      className="w-full sm:w-auto px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer shadow-sm text-slate-700 dark:text-slate-300 appearance-none pr-10"
                      style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: `right 0.5rem center`, backgroundRepeat: `no-repeat`, backgroundSize: `1.5em 1.5em` }}
                    >
                      <option value="date_desc">Newest First</option>
                      <option value="date_asc">Oldest First</option>
                      <option value="version_desc">Highest Version</option>
                      <option value="version_asc">Lowest Version</option>
                    </select>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide pt-2">
                  <button
                    onClick={() => setSelectedPeriod(null)}
                    className={`shrink-0 px-5 py-2 rounded-xl text-xs font-bold transition-all ${!selectedPeriod ? 'bg-emerald-500 text-white shadow-md border border-emerald-500' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-emerald-500/50 dark:hover:border-emerald-500/50'}`}
                  >
                    All Updates
                  </button>
                  {periods.map(period => (
                    <button
                      key={period}
                      onClick={() => setSelectedPeriod(period)}
                      className={`shrink-0 px-5 py-2 rounded-xl text-xs font-bold transition-all ${selectedPeriod === period ? 'bg-emerald-500 text-white shadow-md border border-emerald-500' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-emerald-500/50 dark:hover:border-emerald-500/50'}`}
                    >
                      {period}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {currentLogs.length === 0 ? (
              <div className="text-center py-12 bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl rounded-3xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm">
                <Search className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                <p className="text-slate-500 dark:text-slate-400 font-medium">
                  No updates found matching your search.
                </p>
                <button 
                  onClick={() => { setSearchQuery(""); setSelectedPeriod(null); }}
                  className="mt-4 px-4 py-2 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-lg text-sm font-bold hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              <div className="space-y-16">
                {currentLogs.map((log, index) => (
              <motion.article
                key={log.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="relative pb-16 border-b border-slate-200 dark:border-slate-800/60 last:border-0 last:pb-0"
              >
                <div className="flex flex-col md:flex-row md:items-baseline gap-4 mb-8">
                  <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                    {log.message}
                  </h2>
                  <div className="flex flex-wrap items-center gap-3 md:ml-auto text-sm shrink-0">
                    {getTypeBadge(log.type)}
                    <span className="font-mono font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/50 px-2.5 py-1 rounded-md">
                      {log.version || "Update"}
                    </span>
                    <span className="hidden sm:inline text-slate-300 dark:text-slate-700">•</span>
                    <span className="font-medium text-slate-500 dark:text-slate-400">
                      {new Date(log.created_at).toLocaleDateString(undefined, {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </div>

                <div className="space-y-8 md:grid md:grid-cols-2 md:space-y-0 md:gap-12">
                  {log.features && log.features.length > 0 && (
                    <div>
                      <h3 className="flex items-center gap-2 font-bold text-slate-900 dark:text-white mb-4 text-xs uppercase tracking-widest">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                        New Features
                      </h3>
                      <ul className="space-y-3">
                        {log.features.map((feature: string, i: number) => (
                          <li
                            key={i}
                            className="flex items-start gap-3 text-sm md:text-base text-slate-600 dark:text-slate-300"
                          >
                            <span className="mt-2 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                            <span className="leading-relaxed">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {log.bugfixes && log.bugfixes.length > 0 && (
                    <div className={!(log.features && log.features.length > 0) ? "md:col-span-2" : ""}>
                      <h3 className="flex items-center gap-2 font-bold text-slate-900 dark:text-white mb-4 text-xs uppercase tracking-widest">
                        <Wrench className="w-3.5 h-3.5 text-amber-500" />
                        Bug Fixes
                      </h3>
                      <ul className="space-y-3">
                        {log.bugfixes.map((fix: string, i: number) => (
                          <li
                            key={i}
                            className="flex items-start gap-3 text-sm md:text-base text-slate-600 dark:text-slate-300"
                          >
                            <span className="mt-2 w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"></span>
                            <span className="leading-relaxed">{fix}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </motion.article>
            ))}
          </div>
            )}

            {!loading && processedLogs.length > 0 && totalPages > 1 && (
              <div className="mt-12 flex items-center justify-between border-t border-slate-200 dark:border-slate-800/60 pt-8">
                <button 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" /> Previous
                </button>
                <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  Page {currentPage} of {totalPages}
                </span>
                <button 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}
