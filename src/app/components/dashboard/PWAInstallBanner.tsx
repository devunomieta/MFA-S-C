import { useState, useEffect } from "react";

import { Download, X } from "lucide-react";

import { Button } from "@/app/components/ui/button";

export function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if running in standalone mode (already installed & opened as PWA)
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;

    if (isStandalone) {
      localStorage.setItem("pwa_installed", "true");
      return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);

      // Check if user has already installed PWA
      const isInstalled = localStorage.getItem("pwa_installed") === "true";
      if (isInstalled) return;

      // Check 7-day reminder logic
      const dismissedAt = localStorage.getItem("pwa_install_prompt_dismissed_at");
      if (dismissedAt) {
        const elapsed = Date.now() - parseInt(dismissedAt, 10);
        const sevenDays = 7 * 24 * 60 * 60 * 1000;
        if (elapsed < sevenDays) {
          return; // Do not show yet
        }
      }

      setIsVisible(true);
    };

    const handleAppInstalled = () => {
      localStorage.setItem("pwa_installed", "true");
      setIsVisible(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    // If the event was already fired before listener set up, some browsers support prompting or re-dispatching,
    // but standard behavior is to wait for the event.

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      localStorage.setItem("pwa_installed", "true");
      setIsVisible(false);
      setDeferredPrompt(null);
    }
  };

  const handleDismissClick = () => {
    setIsVisible(false);
    localStorage.setItem("pwa_install_prompt_dismissed_at", Date.now().toString());
  };

  if (!isVisible) return null;

  return (
    <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl border-b border-emerald-500/20 relative animate-in fade-in slide-in-from-top duration-500 z-50">
      <div className="flex items-center gap-3 flex-1">
        <div className="p-2.5 bg-white/10 rounded-xl text-emerald-100 hidden sm:block">
          <Download className="size-5" />
        </div>
        <div>
          <h4 className="text-sm font-bold tracking-tight">Install Mary's Thrift App</h4>
          <p className="text-xs text-emerald-100 font-medium">
            Install the PWA on your home screen or desktop for offline access, faster loading, and
            full dashboard features.
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
        <Button
          onClick={handleInstallClick}
          className="bg-white text-emerald-800 hover:bg-emerald-50 font-bold text-xs rounded-xl shadow-md px-4 py-2 border-none h-auto active:scale-95 transition-all w-full sm:w-auto"
        >
          Install Now
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleDismissClick}
          className="text-white hover:bg-white/15 h-9 w-9 rounded-xl active:scale-95 transition-all shrink-0"
        >
          <X className="size-4" />
        </Button>
      </div>
    </div>
  );
}
