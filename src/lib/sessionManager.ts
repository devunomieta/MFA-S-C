import { Session, User } from '@supabase/supabase-js';

const STORAGE_KEY = 'ajo_saved_sessions';

export interface SavedSession {
    user: User;
    session: Session;
    lastActive: string; // ISO date
}

export const SessionManager = {
    getSavedSessions(): SavedSession[] {
        if (typeof window === 'undefined') return [];
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            console.error("Failed to parse saved sessions", e);
            return [];
        }
    },

    saveSession(session: Session) {
        if (!session?.user || typeof window === 'undefined') return;

        const sessions = this.getSavedSessions();
        const existingIndex = sessions.findIndex(s => s.user.id === session.user.id);

        const newEntry: SavedSession = {
            user: session.user,
            session: session,
            lastActive: new Date().toISOString()
        };

        if (existingIndex >= 0) {
            sessions[existingIndex] = newEntry;
        } else {
            sessions.push(newEntry);
        }

        localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    },

    removeSession(userId: string) {
        if (typeof window === 'undefined') return;
        const sessions = this.getSavedSessions().filter(s => s.user.id !== userId);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    },

    /**
     * Clears the Supabase-specific persistence key from local storage.
     * This effectively "logs out" the client without revoking the token on the server,
     * allowing the token to remain valid for other sessions/devices.
     */
    clearSupabaseAuthLocal() {
        if (typeof window === 'undefined') return;
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
                localStorage.removeItem(key);
            }
        });
    }
};
