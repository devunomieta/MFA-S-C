import { useState } from "react";

import { Menu, LogOut, User, Shield } from "lucide-react";
import { Outlet } from "react-router-dom";
import { Link } from "react-router-dom";

import { AdminSidebar } from "@/app/components/dashboard/AdminSidebar";
import { Button } from "@/app/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/app/components/ui/dropdown-menu";
import { useAuth } from "@/app/context/AuthContext";

export function AdminLayout() {
  const { user, loading, signOut } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  if (loading)
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  // Access controlled by AdminRoute guard

  return (
    <div className="min-h-screen bg-[#f8fafc] flex font-sans overflow-hidden">
      <AdminSidebar isOpen={isMobileMenuOpen} setIsOpen={setIsMobileMenuOpen} />

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Admin Header */}
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 h-16 flex items-center justify-between px-6 sticky top-0 z-40">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden text-slate-500 hover:bg-slate-100 rounded-xl"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              <Menu className="size-5" />
            </Button>
            <div className="hidden lg:flex items-center gap-2 text-slate-400">
              <Shield className="size-4" />
              <span className="text-xs font-bold uppercase tracking-widest">Admin Control</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex flex-col items-right text-right mr-2">
              <span className="text-sm font-bold text-slate-900 leading-none">
                {user?.email?.split("@")[0]}
              </span>
              <span className="text-[10px] font-medium text-emerald-600 uppercase tracking-tighter">
                Administrator
              </span>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="outline-none group focus:ring-0">
                  <div className="h-10 w-10 rounded-xl bg-slate-950 flex items-center justify-center text-white font-black text-sm cursor-pointer group-hover:bg-emerald-600 transition-all shadow-lg shadow-slate-950/20 group-hover:shadow-emerald-500/20 ring-2 ring-white ring-offset-2 ring-offset-slate-100">
                    {(user?.email?.[0] || "A").toUpperCase()}
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-64 p-2 shadow-2xl border-slate-200 rounded-2xl animate-in fade-in zoom-in-95 duration-200"
              >
                <DropdownMenuLabel className="px-3 py-2">
                  <p className="text-sm font-bold text-slate-900 leading-none">{user?.email}</p>
                  <p className="text-xs text-slate-500 mt-1">Admin Access</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-slate-100" />
                <DropdownMenuItem
                  asChild
                  className="cursor-pointer rounded-xl py-2.5 focus:bg-slate-50"
                >
                  <Link to="/admin/profile" className="flex items-center">
                    <div className="size-8 rounded-lg bg-slate-100 flex items-center justify-center mr-3">
                      <User className="size-4 text-slate-600" />
                    </div>
                    <span className="font-semibold text-slate-700">Account Profile</span>
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuSeparator className="bg-slate-100" />

                <DropdownMenuItem
                  onClick={() => signOut()}
                  className="cursor-pointer rounded-xl py-2.5 text-red-600 focus:text-red-600 focus:bg-red-50"
                >
                  <div className="size-8 rounded-lg bg-red-100/50 flex items-center justify-center mr-3">
                    <LogOut className="size-4" />
                  </div>
                  <span className="font-bold">Sign Out System</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 p-6 md:p-10 overflow-y-auto custom-scrollbar bg-slate-50/50">
          <div className="max-w-7xl mx-auto w-full pb-20">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
