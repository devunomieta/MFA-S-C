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
import { Menu, LogOut, Repeat } from "lucide-react";
import { useState } from "react";
import { Button } from "@/app/components/ui/button";
import { ThemeToggle } from "@/app/components/ThemeToggle";

export function DashboardLayout() {
    const { user, signOut } = useAuth();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [showSwitcher, setShowSwitcher] = useState(false);

    return (
        <div className="min-h-screen bg-gray-50 flex dark:bg-gray-900 transition-colors">
            <Sidebar />

            {/* Mobile Header */}
            <div className="flex-1 flex flex-col min-w-0">
                <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-4 md:px-8 sticky top-0 z-10 dark:bg-gray-900 dark:border-gray-800 transition-colors">
                    <div className="flex items-center gap-4 md:hidden">
                        <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="dark:text-white dark:hover:bg-gray-800">
                            <Menu className="size-6" />
                        </Button>
                        <span className="text-xl font-bold text-emerald-600">AjoSave</span>
                    </div>

                    <div className="ml-auto flex items-center gap-4">
                        <ThemeToggle />

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button className="outline-none flex items-center gap-4">
                                    <div className="text-sm text-right hidden sm:block">
                                        <p className="font-medium text-gray-900 dark:text-gray-100">{user?.user_metadata?.full_name || 'User'}</p>
                                        <p className="text-gray-500 dark:text-gray-400">{user?.email}</p>
                                    </div>
                                    <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center text-emerald-600 dark:text-emerald-300 font-bold text-lg cursor-pointer">
                                        {(user?.user_metadata?.full_name?.[0] || user?.email?.[0] || 'U').toUpperCase()}
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
