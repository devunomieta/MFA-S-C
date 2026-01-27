import { Link, useLocation } from "react-router-dom";
import {
    LayoutDashboard,
    PiggyBank,
    Wallet,
    Banknote,
    User,
    LogOut
} from "lucide-react";
import { useAuth } from "@/app/context/AuthContext";
import { Button } from "@/app/components/ui/button";

const sidebarItems = [
    { icon: LayoutDashboard, label: "Overview", href: "/dashboard" },
    { icon: PiggyBank, label: "Plans", href: "/dashboard/plans" },
    { icon: Wallet, label: "Wallet", href: "/dashboard/wallet" },
    { icon: Banknote, label: "Loans", href: "/dashboard/loans" },
    { icon: User, label: "Profile", href: "/dashboard/profile" },
];

export function Sidebar() {
    const location = useLocation();
    const { signOut } = useAuth();

    return (
        <aside className="w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 hidden md:flex flex-col h-screen sticky top-0 transition-colors">
            <div className="p-6">
                <Link to="/" className="text-2xl font-bold text-emerald-600 block">
                    AjoSave
                </Link>
            </div>

            <nav className="flex-1 px-4 space-y-2">
                {sidebarItems.map((item) => {
                    const isActive = location.pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            to={item.href}
                            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive
                                    ? "bg-emerald-50 text-emerald-600 font-medium dark:bg-emerald-900/20 dark:text-emerald-400"
                                    : "text-gray-600 hover:bg-gray-50 hover:text-emerald-600 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-emerald-400"
                                }`}
                        >
                            <item.icon className="size-5" />
                            {item.label}
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-gray-200 dark:border-gray-800">
                <Button
                    variant="ghost"
                    className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/10"
                    onClick={signOut}
                >
                    <LogOut className="size-5 mr-3" />
                    Sign Out
                </Button>
            </div>
        </aside>
    );
}
