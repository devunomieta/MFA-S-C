import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/app/components/ui/dialog";
import { Button } from "@/app/components/ui/button";
import { useAuth } from "@/app/context/AuthContext";
import { Plus, User, Check } from "lucide-react";

interface AccountSwitcherProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function AccountSwitcher({ open, onOpenChange }: AccountSwitcherProps) {
    const { user, savedSessions, switchAccount, addAccount } = useAuth();

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Switch Account</DialogTitle>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <div className="space-y-2">
                        {savedSessions.map((session) => (
                            <button
                                key={session.user.id}
                                onClick={() => {
                                    if (session.user.id !== user?.id) {
                                        switchAccount(session.session);
                                    } else {
                                        onOpenChange(false);
                                    }
                                }}
                                className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all hover:bg-gray-50 dark:hover:bg-gray-800 ${session.user.id === user?.id
                                        ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/20"
                                        : "border-gray-200 dark:border-gray-700"
                                    }`}
                            >
                                <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-300 font-bold shrink-0">
                                    {session.user.email?.[0].toUpperCase() || <User className="size-5" />}
                                </div>
                                <div className="text-left flex-1 min-w-0">
                                    <p className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
                                        {session.user.user_metadata?.full_name || 'User'}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                        {session.user.email}
                                    </p>
                                </div>
                                {session.user.id === user?.id && (
                                    <Check className="size-5 text-emerald-500" />
                                )}
                            </button>
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

                    <Button
                        variant="outline"
                        className="w-full gap-2 border-dashed"
                        onClick={addAccount}
                    >
                        <Plus className="size-4" />
                        Add another account
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
