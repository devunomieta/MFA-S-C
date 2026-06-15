import { useEffect } from "react";
import { lazy, Suspense, useLayoutEffect } from "react";

import { AnimatePresence, motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { Toaster } from "sonner";

import { AdminRoute } from "@/app/components/AdminRoute";
import { AutoLogout } from "@/app/components/AutoLogout";
import { Footer } from "@/app/components/Footer";
import { Navbar } from "@/app/components/Navbar";
import { UserRoute } from "@/app/components/UserRoute";
import { WhatsAppFloating } from "@/app/components/WhatsAppFloating";
import { AuthProvider, useAuth } from "@/app/context/AuthContext";
import { BalanceRevealProvider } from "@/app/context/BalanceRevealContext";
import { NotificationProvider } from "@/app/context/NotificationContext";
import { ThemeProvider } from "@/app/context/ThemeContext";
import { AuthLayout } from "@/app/layout/AuthLayout";
import { supabase } from "@/lib/supabase";

// Lazy Loaded Pages
const Landing = lazy(() => import("@/app/pages/Landing").then((m) => ({ default: m.Landing })));
const Login = lazy(() => import("@/app/pages/auth/Login").then((m) => ({ default: m.Login })));
const Signup = lazy(() => import("@/app/pages/auth/Signup").then((m) => ({ default: m.Signup })));
const ForgotPassword = lazy(() =>
  import("@/app/pages/auth/ForgotPassword").then((m) => ({ default: m.ForgotPassword })),
);
const UpdatePassword = lazy(() =>
  import("@/app/pages/auth/UpdatePassword").then((m) => ({ default: m.UpdatePassword })),
);
const VerifyOTP = lazy(() =>
  import("@/app/pages/auth/VerifyOTP").then((m) => ({ default: m.VerifyOTP })),
);

const DashboardLayout = lazy(() =>
  import("@/app/layout/DashboardLayout").then((m) => ({ default: m.DashboardLayout })),
);
const Overview = lazy(() =>
  import("@/app/pages/dashboard/Overview").then((m) => ({ default: m.Overview })),
);
const Plans = lazy(() => import("@/app/pages/dashboard/Plans").then((m) => ({ default: m.Plans })));
const PlanDetailsPage = lazy(() =>
  import("@/app/pages/dashboard/PlanDetailsPage").then((m) => ({ default: m.PlanDetailsPage })),
);
const Wallet = lazy(() =>
  import("@/app/pages/dashboard/Wallet").then((m) => ({ default: m.Wallet })),
);
const Loans = lazy(() => import("@/app/pages/dashboard/Loans").then((m) => ({ default: m.Loans })));
const Profile = lazy(() =>
  import("@/app/pages/dashboard/Profile").then((m) => ({ default: m.Profile })),
);
const Help = lazy(() => import("@/app/pages/dashboard/Help").then((m) => ({ default: m.Help })));
const Notifications = lazy(() =>
  import("@/app/pages/dashboard/Notifications").then((m) => ({ default: m.Notifications })),
);

const AdminLayout = lazy(() =>
  import("@/app/layout/AdminLayout").then((m) => ({ default: m.AdminLayout })),
);
const AdminOverview = lazy(() =>
  import("@/app/pages/admin/Overview").then((m) => ({ default: m.AdminOverview })),
);
const AdminLoans = lazy(() =>
  import("@/app/pages/admin/Loans").then((m) => ({ default: m.AdminLoans })),
);
const AdminTransactions = lazy(() =>
  import("@/app/pages/admin/Transactions").then((m) => ({ default: m.AdminTransactions })),
);
const AdminUsers = lazy(() =>
  import("@/app/pages/admin/Users").then((m) => ({ default: m.AdminUsers })),
);
const AdminUserDetails = lazy(() =>
  import("@/app/pages/admin/UserDetails").then((m) => ({ default: m.AdminUserDetails })),
);
const AdminPlans = lazy(() =>
  import("@/app/pages/admin/Plans").then((m) => ({ default: m.AdminPlans })),
);
const AdminSettings = lazy(() =>
  import("@/app/pages/admin/Settings").then((m) => ({ default: m.AdminSettings })),
);
const AdminNewsletter = lazy(() =>
  import("@/app/pages/admin/Newsletter").then((m) => ({ default: m.AdminNewsletter })),
);
const AdminApprovals = lazy(() =>
  import("@/app/pages/admin/Approvals").then((m) => ({ default: m.AdminApprovals })),
);
const AdminProfile = lazy(() =>
  import("@/app/pages/admin/Profile").then((m) => ({ default: m.AdminProfile })),
);
const AdminSurvey = lazy(() =>
  import("@/app/pages/admin/Survey").then((m) => ({ default: m.default })),
);

const AdminTestimonials = lazy(() => import("@/app/pages/admin/Testimonials"));
const AdminInquiries = lazy(() => import("@/app/pages/admin/Inquiries"));

const PrivacyPolicy = lazy(() =>
  import("@/app/pages/legal/PrivacyPolicy").then((m) => ({ default: m.PrivacyPolicy })),
);
const TermsOfService = lazy(() =>
  import("@/app/pages/legal/TermsOfService").then((m) => ({ default: m.TermsOfService })),
);
const Compliance = lazy(() =>
  import("@/app/pages/legal/Compliance").then((m) => ({ default: m.Compliance })),
);
const Security = lazy(() =>
  import("@/app/pages/legal/Security").then((m) => ({ default: m.Security })),
);
const Changelog = lazy(() =>
  import("@/app/pages/landing/Changelog").then((m) => ({ default: m.Changelog })),
);

function LoadingFallback() {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white/70 dark:bg-slate-950/70 backdrop-blur-md transition-all">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-12 h-12 animate-spin text-emerald-600" />
        <p className="text-sm font-bold text-gray-500 dark:text-gray-400">
          Loading Mary's Thrift...
        </p>
      </div>
    </div>
  );
}

function ScrollToTop() {
  const { pathname } = useLocation();

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

function MainLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const authPaths = ["/login", "/signup", "/forgot-password", "/update-password", "/verify-otp"];
  const isAuthPage = authPaths.includes(location.pathname);

  return (
    <div
      className={`min-h-screen ${isAuthPage ? "bg-slate-50 dark:bg-slate-950" : "bg-white dark:bg-slate-950"}`}
    >
      {!isAuthPage && <Navbar />}
      <main>{children}</main>
      {!isAuthPage && <Footer />}
    </div>
  );
}

function AppRoutes() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAdmin, loading } = useAuth();
  const isDashboard = location.pathname.startsWith("/dashboard");
  const isAdminPath = location.pathname.startsWith("/admin");

  useEffect(() => {
    if (loading) return;
    if (!user || !isAdmin) return;

    // Admin is logged in — redirect away from any non-admin path
    const isOnAdminPath = location.pathname.startsWith("/admin");
    if (!isOnAdminPath) {
      navigate("/admin", { replace: true });
    }
  }, [loading, user, isAdmin, location.pathname, navigate]);

  useEffect(() => {
    const applyBranding = async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "general")
        .maybeSingle();

      if (data?.value) {
        const { app_name, favicon_url } = data.value;
        if (app_name) {
          document.title = `${app_name} | Secure Thrift & Loan Management`;
        }
        if (favicon_url) {
          let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
          if (!link) {
            link = document.createElement("link");
            link.rel = "icon";
            document.getElementsByTagName("head")[0].appendChild(link);
          }
          link.href = favicon_url;

          let appleLink = document.querySelector("link[rel='apple-touch-icon']") as HTMLLinkElement;
          if (!appleLink) {
            appleLink = document.createElement("link");
            appleLink.rel = "apple-touch-icon";
            document.getElementsByTagName("head")[0].appendChild(appleLink);
          }
          appleLink.href = favicon_url;
        }

        // Dynamically update the PWA manifest to use the app settings app_name and favicon_url
        try {
          const manifest = {
            name: app_name || "Mary's Thrift Finance",
            short_name: app_name ? app_name.split(" ")[0] : "Mary's Thrift",
            description: "Secure Thrift & Loan Management",
            theme_color: "#ffffff",
            background_color: "#ffffff",
            display: "standalone",
            start_url: "/",
            launch_handler: {
              client_mode: "focus-existing",
            },
            icons: [
              {
                src: favicon_url || "/pwa-192x192.png",
                sizes: "192x192",
                type: "image/png",
              },
              {
                src: favicon_url || "/pwa-512x512.png",
                sizes: "512x512",
                type: "image/png",
              },
            ],
          };

          const stringManifest = JSON.stringify(manifest);
          const blob = new Blob([stringManifest], { type: "application/json" });
          const manifestURL = URL.createObjectURL(blob);

          let link = document.querySelector('link[rel="manifest"]') as HTMLLinkElement;
          if (!link) {
            link = document.createElement("link");
            link.rel = "manifest";
            document.head.appendChild(link);
          }
          link.href = manifestURL;
        } catch (err) {
          console.error("Error dynamically updating PWA manifest:", err);
        }
      }
    };
    applyBranding();
  }, []);

  if (loading) {
    return <LoadingFallback />;
  }

  const authPaths = ["/login", "/signup", "/forgot-password", "/update-password", "/verify-otp"];
  const isAuthPage = authPaths.includes(location.pathname);

  return (
    <ThemeProvider
      defaultTheme="system"
      storageKey="vite-ui-theme"
      forceTheme={isDashboard || isAuthPage ? undefined : "light"}
    >
      <NotificationProvider>
        <Toaster />
        <AutoLogout />
        <ScrollToTop />
        {!isAdminPath && <WhatsAppFloating />}
        <Suspense fallback={<LoadingFallback />}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="min-h-screen"
            >
              <Routes location={location}>
                <Route element={<UserRoute />}>
                  <Route path="/dashboard" element={<DashboardLayout />}>
                    <Route index element={<Overview />} />
                    <Route path="notifications" element={<Notifications />} />
                    <Route path="plans" element={<Plans />} />
                    <Route path="plans/:id" element={<PlanDetailsPage />} />
                    <Route path="wallet" element={<Wallet />} />
                    <Route path="loans" element={<Loans />} />
                    <Route path="profile" element={<Profile />} />
                    <Route path="help" element={<Help />} />
                  </Route>
                </Route>

                <Route element={<AdminRoute />}>
                  <Route path="/admin" element={<AdminLayout />}>
                    <Route index element={<AdminOverview />} />
                    <Route path="loans" element={<AdminLoans />} />
                    <Route path="transactions" element={<AdminTransactions />} />
                    <Route path="users" element={<AdminUsers />} />
                    <Route path="users/:id" element={<AdminUserDetails />} />
                    <Route path="plans" element={<AdminPlans />} />
                    <Route path="plans/:view" element={<AdminPlans />} />
                    <Route path="settings" element={<AdminSettings />} />
                    <Route path="newsletter" element={<AdminNewsletter />} />
                    <Route path="approvals" element={<AdminApprovals />} />
                    <Route path="testimonials" element={<AdminTestimonials />} />
                    <Route path="inquiries" element={<AdminInquiries />} />
                    <Route path="profile" element={<AdminProfile />} />
                    <Route path="surveys" element={<AdminSurvey />} />
                  </Route>
                </Route>

                <Route
                  path="/"
                  element={
                    <MainLayout>
                      <Landing />
                    </MainLayout>
                  }
                />
                <Route element={<AuthLayout />}>
                  <Route path="/login" element={<Login />} />
                  <Route path="/signup" element={<Signup />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/update-password" element={<UpdatePassword />} />
                  <Route path="/verify-otp" element={<VerifyOTP />} />
                </Route>
                <Route
                  path="/privacy"
                  element={
                    <MainLayout>
                      <PrivacyPolicy />
                    </MainLayout>
                  }
                />
                <Route
                  path="/terms"
                  element={
                    <MainLayout>
                      <TermsOfService />
                    </MainLayout>
                  }
                />
                <Route
                  path="/compliance"
                  element={
                    <MainLayout>
                      <Compliance />
                    </MainLayout>
                  }
                />
                <Route
                  path="/security"
                  element={
                    <MainLayout>
                      <Security />
                    </MainLayout>
                  }
                />
                <Route
                  path="/changelog"
                  element={
                    <MainLayout>
                      <Changelog />
                    </MainLayout>
                  }
                />

                <Route
                  path="*"
                  element={
                    <MainLayout>
                      <Landing />
                    </MainLayout>
                  }
                />
              </Routes>
            </motion.div>
          </AnimatePresence>
        </Suspense>
      </NotificationProvider>
    </ThemeProvider>
  );
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <BalanceRevealProvider>
          <AppRoutes />
        </BalanceRevealProvider>
      </AuthProvider>
    </Router>
  );
}
