import { useState, useEffect } from "react";
import { Bell, X, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useNotifications } from "@/app/context/NotificationContext";
import { Button } from "@/app/components/ui/button";

export function NotificationBanner() {
  const { unreadCount } = useNotifications();
  const [isVisible, setIsVisible] = useState(false);
  const [bannerText, setBannerText] = useState("You have an unread notification(s)");

  useEffect(() => {
    if (unreadCount === 0) {
      setIsVisible(false);
      return;
    }

    const now = Date.now();
    const dismissedAtStr = localStorage.getItem("notification_banner_dismissed_at");
    const lastCountStr = localStorage.getItem("notification_banner_last_count");

    const lastCount = lastCountStr ? parseInt(lastCountStr, 10) : 0;

    // 1. If unread count has INCREASED, show "You have new notification(s)" and force display
    if (unreadCount > lastCount) {
      setBannerText("You have new notification(s)");
      setIsVisible(true);
      localStorage.removeItem("notification_banner_dismissed_at");
      localStorage.setItem("notification_banner_last_count", unreadCount.toString());
      return;
    }

    // 2. If it hasn't increased, check if the 6-hour dismissal period has passed
    if (dismissedAtStr) {
      const dismissedAt = parseInt(dismissedAtStr, 10);
      const elapsed = now - dismissedAt;
      const sixHours = 6 * 60 * 60 * 1000;

      if (elapsed >= sixHours) {
        setBannerText("You have an unread notification(s)");
        setIsVisible(true);
        localStorage.removeItem("notification_banner_dismissed_at");
      } else {
        setIsVisible(false);
      }
    } else {
      setBannerText("You have an unread notification(s)");
      setIsVisible(true);
    }

    // Update last count to match current count to keep in sync
    localStorage.setItem("notification_banner_last_count", unreadCount.toString());
  }, [unreadCount]);

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsVisible(false);
    localStorage.setItem("notification_banner_dismissed_at", Date.now().toString());
    localStorage.setItem("notification_banner_last_count", unreadCount.toString());
  };

  if (!isVisible) return null;

  return (
    <div className="fixed top-[76px] right-4 z-50 w-full max-w-sm bg-white/80 dark:bg-gray-950/80 backdrop-blur-md border border-amber-200/50 dark:border-amber-900/30 rounded-2xl shadow-xl p-4 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
      <Link
        to="/dashboard/notifications"
        className="flex items-center gap-3 flex-1 hover:opacity-95 active:scale-[0.99] transition-all cursor-pointer text-gray-900 dark:text-gray-100"
      >
        <div className="p-2.5 bg-amber-500/10 dark:bg-amber-500/20 rounded-xl text-amber-600 dark:text-amber-400 shrink-0">
          <Bell className="size-4 animate-bounce" />
        </div>
        <div className="flex flex-col gap-0.5">
          <p className="text-xs font-bold tracking-tight">{bannerText}</p>
          <span className="text-[10px] text-gray-400 dark:text-gray-500 font-semibold flex items-center gap-0.5">
            Click to view notifications <ChevronRight className="size-3 text-amber-500 shrink-0" />
          </span>
        </div>
      </Link>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleDismiss}
        className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:text-gray-500 dark:hover:text-gray-300 dark:hover:bg-gray-800 h-8 w-8 rounded-xl active:scale-95 transition-all shrink-0"
      >
        <X className="size-4" />
      </Button>
    </div>
  );
}
