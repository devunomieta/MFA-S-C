import { Link, useLocation } from "react-router-dom";
import {
    LayoutDashboard,
    PiggyBank,
    Wallet,
    Banknote,
    User,
    LogOut,
    Shield,
    LifeBuoy,
    Bell
} from "lucide-react";
import { useAuth } from "@/app/context/AuthContext";
import { useNotifications } from "@/app/context/NotificationContext";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";

export function Sidebar() {
    const location = useLocation();
    const { signOut, isAdmin, user } = useAuth();
    const [logoUrl, setLogoUrl] = useState<string | null>(null);
    const [appName] = useState("AjoSave");
    const { unreadCount } = useNotifications();

    const sidebarItems = [
        { icon: LayoutDashboard, label: "Overview", href: "/dashboard" },
        { icon: PiggyBank, label: "Plans", href: "/dashboard/plans" },
        { icon: Wallet, label: "Wallet", href: "/dashboard/wallet" },
        { icon: Banknote, label: "Loans", href: "/dashboard/loans" },
        { icon: User, label: "Profile", href: "/dashboard/profile" },
        { icon: Bell, label: "Notifications", href: "/dashboard/notifications", count: unreadCount },
        { icon: LifeBuoy, label: "Request Help", href: "/dashboard/help" },
    ];

    useEffect(() => {
        if (!user) return;

        const fetchData = async () => {
            const { data } = await supabase.from('app_settings').select('value').eq('key', 'general').single();
            if (data?.value?.logo_url) {
                setLogoUrl(data.value.logo_url);
            }
        };
        fetchData();
    }, [user]);

    return (
        <aside className="w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 hidden md:flex flex-col h-screen sticky top-0 transition-colors">
            <div className="p-6">
                <Link to="/" className="block">
                    {logoUrl ? (
                        <img src={logoUrl} alt={appName} className="h-8 w-auto object-contain" />
                    ) : (
                        <span className="text-2xl font-bold text-emerald-600">{appName}</span>
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
                            className={`flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${isActive
                                ? "bg-emerald-50 text-emerald-600 font-medium dark:bg-emerald-900/20 dark:text-emerald-400"
                                : "text-gray-600 hover:bg-gray-50 hover:text-emerald-600 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-emerald-400"
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <item.icon className="size-5" />
                                {item.label}
                            </div>
                            {item.count !== undefined && item.count > 0 && (
                                <Badge className="h-5 min-w-[20px] px-1 flex items-center justify-center bg-red-600 text-white border-0 text-[10px] font-bold">
                                    {item.count > 9 ? '9+' : item.count}
                                </Badge>
                            )}
                        </Link>
                    );
                })}

                {isAdmin && (
                    <Link
                        to="/admin"
                        className="flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-purple-600 hover:bg-purple-50 hover:text-purple-700 dark:text-purple-400 dark:hover:bg-purple-900/20"
                    >
                        <Shield className="size-5" />
                        Admin Panel
                    </Link>
                )}
            </nav>

            <div className="p-4 border-t border-gray-200 dark:border-gray-800 space-y-4">
                {user && (
                    <div className="flex items-center gap-3 px-2 py-1">
                        <div className="h-10 w-10 rounded-full overflow-hidden bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center text-emerald-600 dark:text-emerald-300 font-bold shrink-0 border border-emerald-200 dark:border-emerald-700">
                            {user.user_metadata?.avatar_url ? (
                                <img src={user.user_metadata.avatar_url} alt="Profile" className="h-full w-full object-cover" />
                            ) : (
                                (user.user_metadata?.full_name?.[0] || user.email?.[0] || 'U').toUpperCase()
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                                {user.user_metadata?.full_name || 'User'}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                {user.email}
                            </p>
                        </div>
                    </div>
                )}
                <Button
                    variant="ghost"
                    className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/10 h-10 px-3 rounded-lg"
                    onClick={signOut}
                >
                    <LogOut className="size-5 mr-3" />
                    <span className="font-medium">Sign Out</span>
                </Button>
            </div>
        </aside>
    );
}
