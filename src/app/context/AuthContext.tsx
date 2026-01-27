import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { Session, User } from '@supabase/supabase-js';

import { SessionManager, SavedSession } from '@/lib/sessionManager';

interface AuthContextType {
    session: Session | null;
    user: User | null;
    loading: boolean;
    signOut: () => Promise<void>;
    savedSessions: SavedSession[];
    switchAccount: (session: Session) => Promise<void>;
    addAccount: () => void;
}

const AuthContext = createContext<AuthContextType>({
    session: null,
    user: null,
    loading: true,
    signOut: async () => { },
    savedSessions: [],
    switchAccount: async () => { },
    addAccount: () => { },
});

export function AuthProvider({ children }: { children: ReactNode }) {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [savedSessions, setSavedSessions] = useState<SavedSession[]>([]);

    useEffect(() => {
        // Load stored sessions initially
        setSavedSessions(SessionManager.getSavedSessions());

        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
            if (session) {
                SessionManager.saveSession(session);
                setSavedSessions(SessionManager.getSavedSessions());
            }
        });

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
            if (session) {
                SessionManager.saveSession(session);
                setSavedSessions(SessionManager.getSavedSessions());
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const signOut = async () => {
        if (user) {
            // Remove ONLY current user from saved list if explicit sign out
            SessionManager.removeSession(user.id);
            setSavedSessions(SessionManager.getSavedSessions());
        }
        await supabase.auth.signOut();
    };

    const switchAccount = async (targetSession: Session) => {
        // Just set the session - Supabase client will verify and might auto-refresh if needed
        const { error } = await supabase.auth.setSession(targetSession);
        if (error) {
            console.error("Failed to switch session:", error);
            // If invalid, remove it
            SessionManager.removeSession(targetSession.user.id);
            setSavedSessions(SessionManager.getSavedSessions());
            alert("Session expired. Please login again.");
            return;
        }
        window.location.reload();
    };

    const addAccount = () => {
        SessionManager.clearSupabaseAuthLocal();
        window.location.href = '/login';
    };

    const value = {
        session,
        user,
        loading,
        signOut,
        savedSessions,
        switchAccount,
        addAccount
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
    return useContext(AuthContext);
};
