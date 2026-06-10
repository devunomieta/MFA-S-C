import { useEffect } from "react";

import { Plus, User, Check, Trash2 } from "lucide-react";

import { Button } from "@/app/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { useAuth } from "@/app/context/AuthContext";
import { supabase } from "@/lib/supabase";

interface AccountSwitcherProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AccountSwitcher({ open, onOpenChange }: AccountSwitcherProps) {
  const { user, savedSessions, switchAccount, addAccount, removeSavedAccount } = useAuth();

  useEffect(() => {
    if (open && savedSessions.length > 0) {
      const checkExistingProfiles = async () => {
        const userIds = savedSessions.map((s) => s.user.id);
        try {
          const { data, error } = await supabase.from("profiles").select("id").in("id", userIds);

          if (!error && data) {
            const existingIds = new Set(data.map((p) => p.id));
            for (const session of savedSessions) {
              if (!existingIds.has(session.user.id)) {
                removeSavedAccount(session.user.id);
              }
            }
          }
        } catch (err) {
          console.error("Failed to validate saved sessions profiles:", err);
        }
      };

      checkExistingProfiles();
    }
  }, [open, savedSessions, removeSavedAccount]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Switch Account</DialogTitle>
          <DialogDescription>
            Manage your active sessions and switch between your logged-in accounts.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="space-y-2">
            {savedSessions.map((session) => (
              <div key={session.user.id} className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (session.user.id !== user?.id) {
                      switchAccount(session.session);
                    } else {
                      onOpenChange(false);
                    }
                  }}
                  className={`flex-1 flex items-center gap-3 p-3 rounded-lg border transition-all hover:bg-gray-50 dark:hover:bg-gray-800 ${
                    session.user.id === user?.id
                      ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/20"
                      : "border-gray-200 dark:border-gray-700"
                  }`}
                >
                  <div className="h-10 w-10 rounded-full overflow-hidden bg-emerald-100 dark:bg-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-300 font-bold shrink-0 border border-emerald-200 dark:border-emerald-700">
                    {session.user.user_metadata?.avatar_url ? (
                      <img
                        src={session.user.user_metadata.avatar_url}
                        alt="Avatar"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      session.user.email?.[0].toUpperCase() || <User className="size-5" />
                    )}
                  </div>
                  <div className="text-left flex-1 min-w-0">
                    <p className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
                      {session.user.user_metadata?.full_name || "User"}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {session.user.email}
                    </p>
                  </div>
                  {session.user.id === user?.id && <Check className="size-5 text-emerald-500" />}
                </button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeSavedAccount(session.user.id);
                  }}
                  className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 h-10 w-10 shrink-0"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-200 dark:border-gray-700" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or</span>
            </div>
          </div>

          <Button variant="outline" className="w-full gap-2 border-dashed" onClick={addAccount}>
            <Plus className="size-4" />
            Add another account
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
