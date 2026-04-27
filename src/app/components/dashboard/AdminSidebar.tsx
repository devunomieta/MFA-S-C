import { useEffect, useState } from "react";

import {
  LayoutDashboard,
  LogOut,
  X,
  Banknote,
  Users,
  Activity,
  Shield,
  Settings,
  ShieldCheck,
  Mail,
  ChevronDown,
  ChevronRight,
  Anchor,
  Droplets,
  TrendingUp,
  Quote,
  MessageSquare,
  BarChart3,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";

import { BrandLogo } from "@/app/components/ui/BrandLogo";
import { Button } from "@/app/components/ui/button";
import { useAuth } from "@/app/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

interface SidebarProps {
  isOpen?: boolean;
  setIsOpen?: (isOpen: boolean) => void;
}

export function AdminSidebar({ isOpen, setIsOpen }: SidebarProps) {
  const { pathname } = useLocation();
  const { signOut } = useAuth();
  const [isMobile, setIsMobile] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [appName, setAppName] = useState("ADMIN CORE");
  const [expandedGroups, setExpandedGroups] = useState<string[]>(["Manage Plans"]);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener("resize", checkMobile);

    const fetchBranding = async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "general")
        .single();
      if (data?.value?.logo_url) {
        setLogoUrl(data.value.logo_url);
      }
      if (data?.value?.app_name) {
        setAppName(data.value.app_name);
      }
    };
    fetchBranding();

    // Auto-expand group if on a sub-route
    if (pathname.includes("/admin/plans") && !expandedGroups.includes("Manage Plans")) {
      Promise.resolve().then(() => {
        setExpandedGroups((prev) =>
          prev.includes("Manage Plans") ? prev : [...prev, "Manage Plans"],
        );
      });
    }

    return () => window.removeEventListener("resize", checkMobile);
  }, [pathname]);

  const toggleGroup = (label: string) => {
    setExpandedGroups((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label],
    );
  };

  const routes = [
    {
      group: "Dashboard",
      items: [
        {
          label: "Overview",
          icon: LayoutDashboard,
          href: "/admin",
          active: pathname === "/admin",
        },
      ],
    },
    {
      group: "Operations",
      items: [
        {
          label: "Plans Catalog",
          icon: Banknote,
          href: "/admin/plans",
          active: pathname.includes("/admin/plans"),
          subItems: [
            { label: "Plan Config", href: "/admin/plans", icon: Settings },
            { label: "Marathon", href: "/admin/plans/marathon", icon: Activity },
            { label: "30-Weeks Sprint", href: "/admin/plans/sprint", icon: Activity },
            { label: "Anchor", href: "/admin/plans/anchor", icon: Anchor },
            { label: "Daily Drop", href: "/admin/plans/daily_drop", icon: Droplets },
            { label: "Rapid Savings", href: "/admin/plans/step_up", icon: TrendingUp },
            { label: "Monthly Saving", href: "/admin/plans/monthly_bloom", icon: Settings },
            { label: "Digital Ajo", href: "/admin/plans/ajo_circle", icon: Users },
          ],
        },
        {
          label: "Loans",
          icon: ShieldCheck,
          href: "/admin/loans",
          active: pathname.includes("/admin/loans"),
        },
        {
          label: "Transactions",
          icon: Activity,
          href: "/admin/transactions",
          active: pathname.includes("/admin/transactions"),
        },
        {
          label: "Approvals",
          icon: Shield,
          href: "/admin/approvals",
          active: pathname.includes("/admin/approvals"),
        },
      ],
    },
    {
      group: "Management",
      items: [
        {
          label: "Users",
          icon: Users,
          href: "/admin/users",
          active: pathname.includes("/admin/users"),
        },
        {
          label: "Inquiries",
          icon: MessageSquare,
          href: "/admin/inquiries",
          active: pathname.includes("/admin/inquiries"),
        },
        {
          label: "Newsletter",
          icon: Mail,
          href: "/admin/newsletter",
          active: pathname.includes("/admin/newsletter"),
        },
        {
          label: "Testimonials",
          icon: Quote,
          href: "/admin/testimonials",
          active: pathname.includes("/admin/testimonials"),
        },
        {
          label: "Surveys",
          icon: BarChart3,
          href: "/admin/surveys",
          active: pathname.includes("/admin/surveys"),
        },
      ],
    },
    {
      group: "System",
      items: [
        {
          label: "Settings",
          icon: Settings,
          href: "/admin/settings",
          active: pathname === "/admin/settings",
        },
      ],
    },
  ];

  const content = (
    <SidebarContent
      logoUrl={logoUrl}
      isMobile={isMobile}
      setIsOpen={setIsOpen}
      routes={routes}
      expandedGroups={expandedGroups}
      toggleGroup={toggleGroup}
      signOut={signOut}
      pathname={pathname}
      appName={appName}
    />
  );

  if (isMobile) {
    return (
      <>
        <div
          className={cn(
            "fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-40 transition-opacity",
            isOpen ? "opacity-100" : "opacity-0 pointer-events-none",
          )}
          onClick={() => setIsOpen && setIsOpen(false)}
        />
        <div
          className={cn(
            "fixed inset-y-0 left-0 w-72 bg-slate-950 z-50 transition-transform duration-300 ease-in-out transform shadow-2xl",
            isOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          {content}
        </div>
      </>
    );
  }

  return (
    <aside className="w-64 hidden lg:block border-r border-slate-800 shrink-0">{content}</aside>
  );
}

interface SidebarContentProps {
  logoUrl: string | null;
  isMobile: boolean;
  setIsOpen?: (isOpen: boolean) => void;
  routes: any[];
  expandedGroups: string[];
  toggleGroup: (label: string) => void;
  signOut: () => void;
  pathname: string;
  appName: string;
}

const SidebarContent = ({
  logoUrl,
  isMobile,
  setIsOpen,
  routes,
  expandedGroups,
  toggleGroup,
  signOut,
  pathname,
  appName,
}: SidebarContentProps) => (
  <div className="flex flex-col h-full bg-[#0a0f1c] text-slate-300 font-sans">
    <div className="h-20 flex items-center px-6 mb-4">
      {logoUrl ? (
        <BrandLogo src={logoUrl} alt="Logo" size="sm" />
      ) : (
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Shield className="size-5 text-slate-950 font-bold" />
          </div>
          <span className="text-xl font-black tracking-tighter text-white">
            {appName.includes(" ") ? (
              <>
                {appName.split(" ")[0]}
                <span className="text-emerald-500 italic ml-1">
                  {appName.split(" ").slice(1).join(" ")}
                </span>
              </>
            ) : (
              appName
            )}
          </span>
        </div>
      )}
      {isMobile && setIsOpen && (
        <Button
          variant="ghost"
          size="icon"
          className="ml-auto text-slate-500 hover:text-white hover:bg-slate-800"
          onClick={() => setIsOpen(false)}
        >
          <X className="w-5 h-5" />
        </Button>
      )}
    </div>

    <div className="flex-1 overflow-y-auto px-4 space-y-8 custom-scrollbar pb-10">
      {routes.map((group, idx) => (
        <div key={idx} className="space-y-2">
          <h3 className="px-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-4 select-none">
            {group.group}
          </h3>
          <div className="space-y-1">
            {group.items.map((route: any) => {
              const isExpanded = expandedGroups.includes(route.label);
              const hasSubItems = route.subItems && route.subItems.length > 0;

              return (
                <div key={route.href} className="space-y-1">
                  {hasSubItems ? (
                    <button
                      onClick={() => toggleGroup(route.label)}
                      className={cn(
                        "flex items-center justify-between w-full gap-3 px-4 py-2.5 text-sm font-semibold rounded-xl transition-all duration-300",
                        route.active
                          ? "bg-slate-800/40 text-emerald-400"
                          : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/30",
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <route.icon
                          className={cn(
                            "size-5",
                            route.active ? "text-emerald-400" : "text-slate-500",
                          )}
                        />
                        {route.label}
                      </div>
                      {isExpanded ? (
                        <ChevronDown className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5" />
                      )}
                    </button>
                  ) : (
                    <Link
                      to={route.href}
                      onClick={() => isMobile && setIsOpen && setIsOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-4 py-2.5 text-sm font-semibold rounded-xl transition-all duration-300",
                        route.active
                          ? "bg-emerald-600/10 text-emerald-400 shadow-sm border border-emerald-600/20"
                          : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/30",
                      )}
                    >
                      <route.icon
                        className={cn(
                          "size-5",
                          route.active ? "text-emerald-400" : "text-slate-500",
                        )}
                      />
                      {route.label}
                    </Link>
                  )}

                  {hasSubItems && isExpanded && (
                    <div className="space-y-1 ml-4 mt-1 border-l border-slate-800/50 pl-3 animate-in fade-in slide-in-from-top-1 duration-300">
                      {route.subItems.map((subItem: any) => {
                        const isSubActive = pathname === subItem.href;
                        return (
                          <Link
                            key={subItem.href}
                            to={subItem.href}
                            onClick={() => isMobile && setIsOpen && setIsOpen(false)}
                            className={cn(
                              "flex items-center gap-3 px-4 py-2 text-xs font-semibold rounded-lg transition-all",
                              isSubActive
                                ? "text-emerald-400 bg-emerald-400/5 font-bold"
                                : "text-slate-500 hover:text-slate-200 hover:bg-slate-800/20",
                            )}
                          >
                            {subItem.icon && <subItem.icon className="size-3.5" />}
                            {subItem.label}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>

    <div className="p-4 mt-auto border-t border-slate-800 bg-slate-950/20 mb-2">
      <Button
        variant="ghost"
        onClick={() => signOut()}
        className="w-full flex items-center justify-start gap-3 px-4 py-3 text-slate-400 hover:text-red-400 hover:bg-red-400/5 rounded-xl transition-all"
      >
        <LogOut className="size-5" />
        <span className="font-bold text-sm">Sign Out</span>
      </Button>
    </div>
  </div>
);
