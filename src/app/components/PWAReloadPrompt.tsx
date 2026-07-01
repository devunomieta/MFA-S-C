import { X, RefreshCw } from "lucide-react";
import { useRegisterSW } from "virtual:pwa-register/react";

import { Button } from "@/app/components/ui/button";

export function PWAReloadPrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r: any) {
      console.log("SW Registered:", r);
    },
    onRegisterError(error: any) {
      console.error("SW registration error", error);
    },
  });

  const close = () => {
    setNeedRefresh(false);
  };

  if (!needRefresh) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[9999] bg-white dark:bg-gray-900 border border-emerald-500/30 shadow-2xl rounded-xl p-4 sm:p-6 w-[calc(100%-2rem)] sm:w-96 animate-in slide-in-from-bottom-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-emerald-600" />
            Update Available
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            A new version of Mary's Thrift is ready. Refresh to get the latest features and fixes!
          </p>
        </div>
        <button
          onClick={close}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="mt-4 flex gap-3">
        <Button
          onClick={() => updateServiceWorker(true)}
          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md text-xs h-9"
        >
          Refresh Now
        </Button>
      </div>
    </div>
  );
}
