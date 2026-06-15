import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, Sparkles, Wrench, Info, CheckCircle2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

export function Changelog() {
  const [changelogs, setChangelogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchChangelogs();
  }, []);

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

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'success': return <Sparkles className="w-5 h-5 text-emerald-500" />;
      case 'warning': return <Wrench className="w-5 h-5 text-amber-500" />;
      case 'error': return <CheckCircle2 className="w-5 h-5 text-red-500" />;
      default: return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'success': return <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">New Feature</span>;
      case 'warning': return <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Maintenance</span>;
      case 'error': return <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Critical Fix</span>;
      default: return <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">System Upgrade</span>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center text-slate-600 hover:text-emerald-600 transition-colors font-medium">
            <ChevronLeft className="w-5 h-5 mr-1" />
            Back to Home
          </Link>
          <span className="font-bold text-emerald-600 text-lg">Mary's Thrift Services</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-4">
            Changelog & Updates
          </h1>
          <p className="text-lg text-slate-500 max-w-xl mx-auto">
            Stay up to date with the latest features, bug fixes, and improvements to Mary's Thrift Services.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
          </div>
        ) : changelogs.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-100 shadow-sm">
            <Info className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">No updates published yet.</p>
          </div>
        ) : (
          <div className="space-y-12">
            {changelogs.map((log) => (
              <article key={log.id} className="relative pl-8 md:pl-0">
                {/* Timeline Line for desktop */}
                <div className="hidden md:block absolute left-[120px] top-0 bottom-0 w-px bg-slate-200"></div>
                
                <div className="md:flex gap-8 items-start relative">
                  {/* Date column (Desktop) */}
                  <div className="hidden md:block w-[100px] shrink-0 text-right pt-2 relative">
                    <span className="text-sm font-semibold text-slate-500">
                      {new Date(log.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                    {/* Timeline dot */}
                    <div className="absolute right-[-21px] top-3.5 w-3 h-3 rounded-full bg-emerald-500 border-4 border-white shadow-sm z-10"></div>
                  </div>

                  {/* Main content card */}
                  <div className="flex-1 bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                    <div className="md:hidden text-sm font-semibold text-slate-500 mb-3 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                      {new Date(log.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>

                    <div className="flex items-center gap-3 mb-4 flex-wrap">
                      <span className="font-mono text-lg font-bold text-slate-800 bg-slate-100 px-3 py-1 rounded-md">
                        {log.version || 'Update'}
                      </span>
                      {getTypeBadge(log.type)}
                    </div>

                    <h2 className="text-2xl font-bold text-slate-900 mb-4">{log.message}</h2>

                    <div className="space-y-8 mt-6">
                      {log.features && log.features.length > 0 && (
                        <div>
                          <h3 className="flex items-center gap-2 font-bold text-slate-900 mb-3">
                            <div className="p-1.5 bg-emerald-100 rounded-md text-emerald-600">
                              <Sparkles className="w-4 h-4" />
                            </div>
                            New Features
                          </h3>
                          <ul className="space-y-3">
                            {log.features.map((feature: string, i: number) => (
                              <li key={i} className="flex items-start gap-3 text-slate-600">
                                <span className="text-emerald-500 mt-1">•</span>
                                <span className="leading-relaxed">{feature}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {log.bugfixes && log.bugfixes.length > 0 && (
                        <div>
                          <h3 className="flex items-center gap-2 font-bold text-slate-900 mb-3">
                            <div className="p-1.5 bg-amber-100 rounded-md text-amber-600">
                              <Wrench className="w-4 h-4" />
                            </div>
                            Bug Fixes
                          </h3>
                          <ul className="space-y-3">
                            {log.bugfixes.map((fix: string, i: number) => (
                              <li key={i} className="flex items-start gap-3 text-slate-600">
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
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
