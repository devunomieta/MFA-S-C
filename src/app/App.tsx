import { Navbar } from "@/app/components/Navbar";
import { Footer } from "@/app/components/Footer";
import { Toaster } from "sonner";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import { Landing } from "@/app/pages/Landing";
import { Login } from "@/app/pages/auth/Login";
import { Signup } from "@/app/pages/auth/Signup";
import { ForgotPassword } from "@/app/pages/auth/ForgotPassword";
import { UpdatePassword } from "@/app/pages/auth/UpdatePassword";
import { TestSupabase } from "@/app/pages/TestSupabase";
import { ProtectedRoute } from "@/app/components/ProtectedRoute";
import { DashboardLayout } from "@/app/layout/DashboardLayout";
import { Overview } from "@/app/pages/dashboard/Overview";
import { Plans } from "@/app/pages/dashboard/Plans";
import { Wallet } from "@/app/pages/dashboard/Wallet";
import { Loans } from "@/app/pages/dashboard/Loans";
import { Profile } from "@/app/pages/dashboard/Profile";
import { Help } from "@/app/pages/dashboard/Help";
import { Notifications } from "@/app/pages/dashboard/Notifications";
import { AdminLayout } from "@/app/layout/AdminLayout";
import { AdminOverview } from "@/app/pages/admin/Overview";
import { AdminLoans } from "@/app/pages/admin/Loans";
import { AdminTransactions } from "@/app/pages/admin/Transactions";
import { AdminUsers } from "@/app/pages/admin/Users";
import { AdminUserDetails } from "@/app/pages/admin/UserDetails";
import { AdminPlans } from "@/app/pages/admin/Plans";
import { AdminSettings } from "@/app/pages/admin/Settings";
import { AdminNewsletter } from "@/app/pages/admin/Newsletter";
import { AdminApprovals } from "@/app/pages/admin/Approvals";
import { AdminProfile } from "@/app/pages/admin/Profile";
import { useLayoutEffect } from "react";
import { ThemeProvider } from "@/app/context/ThemeContext";
import { NotificationProvider } from "@/app/context/NotificationContext";

function ScrollToTop() {
  const { pathname } = useLocation();

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

// MainLayout is now just a wrapper for public pages
function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main>
        {children}
      </main>
      <Footer />
    </div>
  );
}

// Internal component to handle theme logic based on route
function AppRoutes() {
  const location = useLocation();
  // Only allow dark mode on dashboard routes. Force light mode everywhere else.
  const isDashboard = location.pathname.startsWith("/dashboard");

  return (
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme" forceTheme={isDashboard ? undefined : 'light'}>
      <NotificationProvider>
        <Toaster />
        <ScrollToTop />
        <Routes>
          {/* Protected Dashboard Routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<DashboardLayout />}>
              <Route index element={<Overview />} />
              <Route path="notifications" element={<Notifications />} />
              <Route path="plans" element={<Plans />} />
              <Route path="wallet" element={<Wallet />} />
              <Route path="loans" element={<Loans />} />
              <Route path="profile" element={<Profile />} />
              <Route path="help" element={<Help />} />
            </Route>
          </Route>

          {/* Admin Routes (Protected by AdminLayout) */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminOverview />} />
            <Route path="loans" element={<AdminLoans />} />
            <Route path="transactions" element={<AdminTransactions />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="users/:id" element={<AdminUserDetails />} />
            <Route path="plans" element={<AdminPlans />} />
            <Route path="settings" element={<AdminSettings />} />
            <Route path="newsletter" element={<AdminNewsletter />} />
            <Route path="approvals" element={<AdminApprovals />} />
            <Route path="profile" element={<AdminProfile />} />
          </Route>

          {/* Public Routes */}
          <Route path="/" element={<MainLayout><Landing /></MainLayout>} />
          <Route path="/login" element={<MainLayout><Login /></MainLayout>} />
          <Route path="/signup" element={<MainLayout><Signup /></MainLayout>} />
          <Route path="/forgot-password" element={<MainLayout><ForgotPassword /></MainLayout>} />
          <Route path="/update-password" element={<MainLayout><UpdatePassword /></MainLayout>} />
          <Route path="/test-connection" element={<MainLayout><TestSupabase /></MainLayout>} />

          {/* Catch-all to Home */}
          <Route path="*" element={<MainLayout><Landing /></MainLayout>} />
        </Routes>
      </NotificationProvider>
    </ThemeProvider>
  );
}

export default function App() {
  return (
    <Router>
      <AppRoutes />
    </Router>
  );
}
