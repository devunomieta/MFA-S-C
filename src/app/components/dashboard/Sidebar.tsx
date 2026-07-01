import { useEffect, useState } from "react";

import {
  LayoutDashboard,
  PiggyBank,
  Wallet,
  Banknote,
  User,
  LogOut,
  Shield,
  LifeBuoy,
  Bell,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";

import { Badge } from "@/app/components/ui/badge";
import { BrandLogo } from "@/app/components/ui/BrandLogo";
import { Button } from "@/app/components/ui/button";
import { useAuth } from "@/app/context/AuthContext";
import { useNotifications } from "@/app/context/NotificationContext";
import { supabase } from "@/lib/supabase";

export function Sidebar() {
  const location = useLocation();
  const { signOut, isAdmin, user } = useAuth();
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [appName, setAppName] = useState("Mary's Thrift Services");
  const { unreadCount } = useNotifications();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const sidebarItems = [
    { icon: LayoutDashboard, label: "Overview", href: "/dashboard" },
    { icon: Wallet, label: "Wallet", href: "/dashboard/wallet" },
    { icon: PiggyBank, label: "Plans", href: "/dashboard/plans" },
    { icon: Banknote, label: "Loans", href: "/dashboard/loans" },
    { icon: LifeBuoy, label: "Request Help", href: "/dashboard/help" },
    { icon: Bell, label: "Notifications", href: "/dashboard/notifications", count: unreadCount },
    { icon: User, label: "Profile", href: "/dashboard/profile" },
  ];

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
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
    fetchData();
  }, [user]);

  return (
    <aside
      className={`${
        isCollapsed ? "w-20" : "w-64"
      } bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 hidden md:flex flex-col h-screen sticky top-0 transition-all duration-300 relative z-50`}
    >
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-4 top-6 z-50 h-8 w-8 rounded-full border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800"
      >
        {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </Button>

      <div
        className={`p-6 h-20 flex items-center ${isCollapsed ? "justify-center" : "justify-start"}`}
      >
        <Link
          to="/"
          className={`block overflow-hidden whitespace-nowrap flex items-center ${isCollapsed ? "justify-center" : "justify-start"}`}
        >
          {logoUrl ? (
            <BrandLogo
              src={isCollapsed ? "/pwa-192x192.png" : logoUrl}
              alt={appName}
              size="sm"
              transparent={true}
              className={isCollapsed ? "object-contain" : ""}
              containerClassName={isCollapsed ? "!w-8 !h-8 md:!w-8 md:!h-8 lg:!w-8 lg:!h-8" : ""}
            />
          ) : (
            <span
              className={`text-2xl font-bold text-emerald-600 transition-all ${isCollapsed ? "text-xl" : ""}`}
            >
              {isCollapsed ? "MT" : appName}
            </span>
          )}
        </Link>
      </div>

      <nav className="flex-1 px-4 space-y-2">
        {sidebarItems.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.href}
              to={item.href}
              className={`flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? "bg-emerald-50 text-emerald-600 font-medium dark:bg-emerald-900/20 dark:text-emerald-400"
                  : "text-gray-600 hover:bg-gray-50 hover:text-emerald-600 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-emerald-400"
              }`}
            >
              <div className="flex items-center gap-3">
                <item.icon className="size-5 shrink-0" />
                {!isCollapsed && <span className="whitespace-nowrap">{item.label}</span>}
              </div>
              {!isCollapsed && item.count !== undefined && item.count > 0 && (
                <Badge className="h-5 min-w-[20px] px-1 flex items-center justify-center bg-red-600 text-white border-0 text-[10px] font-bold">
                  {item.count > 9 ? "9+" : item.count}
                </Badge>
              )}
              {isCollapsed && item.count !== undefined && item.count > 0 && (
                <span className="absolute top-2 right-2 flex h-2 w-2 rounded-full bg-red-600 ring-2 ring-white dark:ring-gray-900" />
              )}
            </Link>
          );
        })}

        {isAdmin && (
          <Link
            to="/admin"
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-purple-600 hover:bg-purple-50 hover:text-purple-700 dark:text-purple-400 dark:hover:bg-purple-900/20 ${isCollapsed ? "justify-center" : ""}`}
            title={isCollapsed ? "Admin Panel" : undefined}
          >
            <Shield className="size-5 shrink-0" />
            {!isCollapsed && <span className="whitespace-nowrap">Admin Panel</span>}
          </Link>
        )}
      </nav>

      <div className="p-4 border-t border-gray-200 dark:border-gray-800 space-y-4">
        <Button
          variant="ghost"
          className={`w-full text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/10 h-10 px-3 rounded-lg ${isCollapsed ? "justify-center" : "justify-start"}`}
          onClick={signOut}
          title={isCollapsed ? "Sign Out" : undefined}
        >
          <LogOut className={`size-5 ${isCollapsed ? "" : "mr-3"} shrink-0`} />
          {!isCollapsed && <span className="font-medium whitespace-nowrap">Sign Out</span>}
        </Button>
      </div>
    </aside>
  );
}
