import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { Session, User } from '@supabase/supabase-js';

import { SessionManager, SavedSession } from '@/lib/sessionManager';

interface AuthContextType {
    session: Session | null;
    user: User | null;
    isAdmin: boolean;
    loading: boolean;
    signOut: () => Promise<void>;
    savedSessions: SavedSession[];
    switchAccount: (session: Session) => Promise<void>;
    addAccount: () => void;
}

const AuthContext = createContext<AuthContextType>({
    session: null,
    user: null,
    isAdmin: false,
    loading: true,
    signOut: async () => { },
    savedSessions: [],
    switchAccount: async () => { },
    addAccount: () => { },
});

export function AuthProvider({ children }: { children: ReactNode }) {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);
    const [savedSessions, setSavedSessions] = useState<SavedSession[]>([]);

    useEffect(() => {
        // Load stored sessions initially
        setSavedSessions(SessionManager.getSavedSessions());

        let mounted = true;

        async function init() {
            try {
                // 1. Get initial session
                const { data: { session }, error } = await supabase.auth.getSession();
                if (error) throw error;

                if (mounted) {
                    setSession(session);
                    setUser(session?.user ?? null);
                    if (session?.user) {
                        await checkAdminStatus(session.user.id);
                        SessionManager.saveSession(session);
                        setSavedSessions(SessionManager.getSavedSessions());
                    }
                }
            } catch (err) {
                console.error("Auth init failed:", err);
            } finally {
                if (mounted) setLoading(false);
            }
        }

        init();

        // 2. Listen for changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log("Auth Event:", event);
            if (!mounted) return;

            setSession(session);
            setUser(session?.user ?? null);

            if (session?.user) {
                // Only re-check admin if user changed or we don't know yet
                // preventing spam on every token refresh
                if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
                    checkAdminStatus(session.user.id);
                    SessionManager.saveSession(session);
                    setSavedSessions(SessionManager.getSavedSessions());
                }
            } else {
                setIsAdmin(false);
                setLoading(false);
            }
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, []);

    // NEW: Handle URL-based Impersonation


    async function checkAdminStatus(userId: string) {
        console.log("Checking admin status for:", userId);
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('is_admin')
                .eq('id', userId)
                .single();

            console.log("Admin Check Result:", { data, error });

            if (data) {
                setIsAdmin(data.is_admin || false);
            }
        } catch (e) {
            console.error("Error checking admin status", e);
        } finally {
            setLoading(false);
        }
    }

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

    // Old state-based impersonation removed.





    const value = {
        session,
        user,
        isAdmin,
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
