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
import { useLayoutEffect } from "react";
import { ThemeProvider } from "@/app/context/ThemeContext";

function ScrollToTop() {
  const { pathname } = useLocation();

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

function MainLayout() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/update-password" element={<UpdatePassword />} />
          <Route path="/test-connection" element={<TestSupabase />} />
        </Routes>
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
      <Toaster />
      <ScrollToTop />
      <Routes>
        {/* Public Routes */}
        <Route path="/*" element={<MainLayout />} />

        {/* Protected Dashboard Routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<Overview />} />
            <Route path="plans" element={<Plans />} />
            <Route path="wallet" element={<Wallet />} />
            <Route path="loans" element={<Loans />} />
            <Route path="profile" element={<Profile />} />
          </Route>
        </Route>
      </Routes>
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
