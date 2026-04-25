import { Loader2 } from "lucide-react";
import { Navigate, Outlet } from "react-router-dom";

import { useAuth } from "@/app/context/AuthContext";

export function UserRoute() {
  const { user, isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Force redirect admins away from user dashboard
  if (isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  return <Outlet />;
}
