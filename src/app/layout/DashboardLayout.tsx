import { Outlet } from "react-router-dom";
import { Sidebar } from "@/app/components/dashboard/Sidebar";
import { useAuth } from "@/app/context/AuthContext";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/app/components/ui/dropdown-menu";
import { AccountSwitcher } from "@/app/components/AccountSwitcher";
import { Menu, LogOut, Repeat, Megaphone, X, LayoutDashboard, PiggyBank, Wallet as WalletIcon, Banknote, User, Shield, LifeBuoy, Bell } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/app/components/ui/button";
import { NotificationBell } from "@/app/components/dashboard/NotificationBell";
import { notificationService } from "@/lib/notification";
import { Badge } from "@/app/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/app/components/ui/sheet";
import { Link, useLocation } from "react-router-dom";

export function DashboardLayout() {
    const { user, signOut, isAdmin } = useAuth();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [showSwitcher, setShowSwitcher] = useState(false);
    const [announcement, setAnnouncement] = useState<any>(null);
    const location = useLocation();

    const [unreadCount, setUnreadCount] = useState(0);

    const sidebarItems = [
        { icon: LayoutDashboard, label: "Overview", href: "/dashboard" },
        { icon: PiggyBank, label: "Plans", href: "/dashboard/plans" },
        { icon: WalletIcon, label: "Wallet", href: "/dashboard/wallet" },
        { icon: Banknote, label: "Loans", href: "/dashboard/loans" },
        { icon: User, label: "Profile", href: "/dashboard/profile" },
        { icon: Bell, label: "Notifications", href: "/dashboard/notifications", count: unreadCount },
        { icon: LifeBuoy, label: "Request Help", href: "/dashboard/help" },
    ];

    useEffect(() => {
        if (!user) return;

        const fetchData = async () => {
            const { data } = await supabase
                .from('announcements')
                .select('*')
                .eq('is_active', true)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (data) {
                if (data.expires_at && new Date(data.expires_at) < new Date()) return;
                setAnnouncement(data);
            }

            // Unread count
            const count = await notificationService.getUnreadCount();
            setUnreadCount(count || 0);
        };
        fetchData();

        // Subscription
        const subscription = notificationService.subscribeToNotifications(user.id, () => {
            notificationService.getUnreadCount().then(c => setUnreadCount(c || 0));
        });

        return () => {
            subscription.unsubscribe();
        };
    }, [user]);

    return (
        <div className="min-h-screen bg-gray-50 flex dark:bg-gray-900 transition-colors relative">

            {/* Announcement Banner */}
            {announcement && (
                <div className={`fixed top-0 left-0 right-0 z-[60] px-4 py-2 text-white text-sm font-medium flex items-center justify-center gap-2 ${announcement.type === 'error' ? 'bg-red-600' :
                    announcement.type === 'success' ? 'bg-emerald-600' :
                        announcement.type === 'warning' ? 'bg-yellow-600' : 'bg-indigo-600'
                    }`}>
                    <Megaphone className="w-4 h-4 animate-pulse" />
                    <span>{announcement.message}</span>
                    <button onClick={() => setAnnouncement(null)} className="absolute right-4 hover:bg-white/20 p-1 rounded">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}
            <Sidebar />

            {/* Mobile Header */}
            <div className="flex-1 flex flex-col min-w-0">
                <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-4 md:px-8 sticky top-0 z-10 dark:bg-gray-900 dark:border-gray-800 transition-colors">
                    <div className="flex items-center gap-4 md:hidden">
                        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                            <SheetTrigger asChild>
                                <Button variant="ghost" size="icon" className="dark:text-white dark:hover:bg-gray-800 relative">
                                    <Menu className="size-6" />
                                    {unreadCount > 0 && (
                                        <span className="absolute top-2 right-2 flex h-2 w-2 rounded-full bg-red-600 ring-2 ring-white dark:ring-gray-900" />
                                    )}
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="left" className="w-64 p-0 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800">
                                <SheetHeader className="p-6 text-left border-b border-gray-100 dark:border-gray-800">
                                    <SheetTitle className="text-2xl font-bold text-emerald-600">AjoSave</SheetTitle>
                                </SheetHeader>
                                <nav className="flex-1 px-4 py-6 space-y-2">
                                    {sidebarItems.map((item) => {
                                        const isActive = location.pathname === item.href;
                                        return (
                                            <Link
                                                key={item.href}
                                                to={item.href}
                                                onClick={() => setIsMobileMenuOpen(false)}
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
                                            onClick={() => setIsMobileMenuOpen(false)}
                                            className="flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-purple-600 hover:bg-purple-50 hover:text-purple-700 dark:text-purple-400 dark:hover:bg-purple-900/20"
                                        >
                                            <Shield className="size-5" />
                                            Admin Panel
                                        </Link>
                                    )}
                                </nav>
                                <div className="absolute bottom-0 w-full p-4 border-t border-gray-100 dark:border-gray-800">
                                    <Button
                                        variant="ghost"
                                        className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/10"
                                        onClick={signOut}
                                    >
                                        <LogOut className="size-5 mr-3" />
                                        Sign Out
                                    </Button>
                                </div>
                            </SheetContent>
                        </Sheet>
                        <span className="text-xl font-bold text-emerald-600 uppercase">AjoSave</span>
                    </div>

                    <div className="ml-auto flex items-center gap-4">
                        <NotificationBell />

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button className="outline-none flex items-center gap-4">
                                    <div className="text-sm text-right hidden sm:block">
                                        <p className="font-medium text-gray-900 dark:text-gray-100">{user?.user_metadata?.full_name || 'User'}</p>
                                        <p className="text-gray-500 dark:text-gray-400">{user?.email}</p>
                                    </div>
                                    <div className="h-10 w-10 rounded-full overflow-hidden bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center text-emerald-600 dark:text-emerald-300 font-bold text-lg cursor-pointer border border-gray-200 dark:border-gray-700">
                                        {user?.user_metadata?.avatar_url ? (
                                            <img src={user.user_metadata.avatar_url} alt="Profile" className="h-full w-full object-cover" />
                                        ) : (
                                            (user?.user_metadata?.full_name?.[0] || user?.email?.[0] || 'U').toUpperCase()
                                        )}
                                    </div>
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => setShowSwitcher(true)} className="cursor-pointer">
                                    <Repeat className="mr-2 size-4" />
                                    <span>Switch Account</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={signOut} className="cursor-pointer text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400">
                                    <LogOut className="mr-2 size-4" />
                                    <span>Sign Out</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <AccountSwitcher open={showSwitcher} onOpenChange={setShowSwitcher} />
                    </div>
                </header>

                <main className="flex-1 p-4 md:p-8 overflow-y-auto dark:bg-gray-900">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
