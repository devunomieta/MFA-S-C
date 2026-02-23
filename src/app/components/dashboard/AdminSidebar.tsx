
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/app/context/AuthContext";
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
    Home
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { Button } from "@/app/components/ui/button";
import { supabase } from "@/lib/supabase";

interface SidebarProps {
    isOpen?: boolean;
    setIsOpen?: (isOpen: boolean) => void;
}

export function AdminSidebar({ isOpen, setIsOpen }: SidebarProps) {
    const { pathname } = useLocation();
    const { signOut } = useAuth();
    const [isMobile, setIsMobile] = useState(false);
    const [logoUrl, setLogoUrl] = useState<string | null>(null);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener("resize", checkMobile);

        const fetchBranding = async () => {
            const { data } = await supabase.from('app_settings').select('value').eq('key', 'general').single();
            if (data?.value?.logo_url) {
                setLogoUrl(data.value.logo_url);
            }
        };
        fetchBranding();

        return () => window.removeEventListener("resize", checkMobile);
    }, []);

    const routes = [
        {
            label: "Overview",
            icon: LayoutDashboard,
            href: "/admin",
            active: pathname === "/admin",
        },
        {
            label: "Manage Plans",
            icon: Banknote,
            href: "/admin/plans",
            active: pathname.includes("/admin/plans"),
        },
        {
            label: "Loans",
            icon: Banknote,
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
            label: "Users",
            icon: Users,
            href: "/admin/users",
            active: pathname.includes("/admin/users"),
        },
        {
            label: "Settings",
            icon: Settings,
            href: "/admin/settings",
            active: pathname === "/admin/settings",
        },
        {
            label: "Approvals",
            icon: ShieldCheck,
            href: "/admin/approvals",
            active: pathname.includes("/admin/approvals"),
        },
        {
            label: "Newsletter",
            icon: Mail,
            href: "/admin/newsletter",
            active: pathname.includes("/admin/newsletter"),
        },
    ];



    if (isMobile) {
        return (
            <>
                <div
                    className={cn(
                        "fixed inset-0 bg-black/50 z-40 transition-opacity",
                        isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
                    )}
                    onClick={() => setIsOpen && setIsOpen(false)}
                />
                <div
                    className={cn(
                        "fixed inset-y-0 left-0 w-64 bg-slate-900 z-50 transition-transform duration-300 ease-in-out transform",
                        isOpen ? "translate-x-0" : "-translate-x-full"
                    )}
                >
                    <SidebarContent
                        logoUrl={logoUrl}
                        isMobile={isMobile}
                        setIsOpen={setIsOpen}
                        routes={routes}
                        signOut={signOut}
                    />
                </div>
            </>
        );
    }

    return (
        <aside className="w-64 hidden md:block">
            <SidebarContent
                logoUrl={logoUrl}
                isMobile={isMobile}
                setIsOpen={setIsOpen}
                routes={routes}
                signOut={signOut}
            />
        </aside>
    );
}

interface SidebarContentProps {
    logoUrl: string | null;
    isMobile: boolean;
    setIsOpen?: (isOpen: boolean) => void;
    routes: any[];
    signOut: () => void;
}

const SidebarContent = ({ logoUrl, isMobile, setIsOpen, routes, signOut }: SidebarContentProps) => (
    <div className="flex flex-col h-full bg-slate-900 border-r border-slate-800 text-slate-100">
        <div className="h-16 flex items-center px-6 border-b border-slate-800">
            {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="h-8 w-auto object-contain mr-2" />
            ) : (
                <Shield className="h-6 w-6 text-emerald-500 mr-2" />
            )}
            <span className="text-xl font-bold">{logoUrl ? '' : 'Admin Panel'}</span>
            {isMobile && setIsOpen && (
                <Button
                    variant="ghost"
                    size="icon"
                    className="ml-auto text-slate-400 hover:text-white"
                    onClick={() => setIsOpen(false)}
                >
                    <X className="w-5 h-5" />
                </Button>
            )}
        </div>

        <div className="flex-1 overflow-y-auto py-4">
            <nav className="space-y-1 px-2">
                {routes.map((route) => (
                    <Link
                        key={route.href}
                        to={route.href}
                        onClick={() => isMobile && setIsOpen && setIsOpen(false)}
                        className={cn(
                            "flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors",
                            route.active
                                ? "bg-emerald-600 text-white shadow-md shadow-emerald-900/20"
                                : "text-slate-400 hover:text-white hover:bg-slate-800"
                        )}
                    >
                        <route.icon className="w-5 h-5" />
                        {route.label}
                    </Link>
                ))}
            </nav>
        </div>

        <div className="p-4 border-t border-slate-800 space-y-2">
            <Link
                to="/dashboard"
                className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-emerald-400 rounded-lg hover:bg-emerald-900/20 hover:text-emerald-300 transition-colors"
            >
                <Home className="w-5 h-5" />
                User Dashboard
            </Link>
            <button
                onClick={signOut}
                className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-red-400 rounded-lg hover:bg-red-900/20 hover:text-red-300 transition-colors"
            >
                <LogOut className="w-5 h-5" />
                Sign Out
            </button>
        </div>
    </div>
);
