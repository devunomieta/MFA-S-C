import { useEffect, useCallback } from "react";
import { useAuth } from "@/app/context/AuthContext";
import { toast } from "sonner";

const TIMEOUT_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

export function AutoLogout() {
    const { user, signOut } = useAuth();

    const handleLogout = useCallback(() => {
        if (user) {
            toast.info("Logged out due to inactivity", {
                description: "You have been inactive for 1 hour. Please log in again to continue.",
            });
            signOut();
        }
    }, [user, signOut]);

    useEffect(() => {
        if (!user) return;

        let timeoutId: NodeJS.Timeout;

        const resetTimer = () => {
            if (timeoutId) clearTimeout(timeoutId);
            timeoutId = setTimeout(handleLogout, TIMEOUT_DURATION);
        };

        // Events to listen for
        const events = [
            "mousedown",
            "mousemove",
            "keydown",
            "scroll",
            "touchstart",
            "click"
        ];

        // Add event listeners
        events.forEach((event) => {
            window.addEventListener(event, resetTimer);
        });

        // Initialize timer
        resetTimer();

        // Cleanup
        return () => {
            if (timeoutId) clearTimeout(timeoutId);
            events.forEach((event) => {
                window.removeEventListener(event, resetTimer);
            });
        };
    }, [user, handleLogout]);

    return null;
}
