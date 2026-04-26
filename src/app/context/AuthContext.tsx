import { createContext, useContext, useEffect, useState, ReactNode } from "react";

import { Session, User } from "@supabase/supabase-js";

import { SessionManager, SavedSession } from "@/lib/sessionManager";
import { supabase } from "@/lib/supabase";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  isAdmin: boolean;
  isSuperadmin: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
  savedSessions: SavedSession[];
  switchAccount: (session: Session) => Promise<void>;
  addAccount: () => void;
  lastActivity: number;
  refreshSession: () => Promise<void>;
  mfaEnabled: boolean;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  isAdmin: false,
  isSuperadmin: false,
  loading: true,
  signOut: async () => {},
  savedSessions: [],
  switchAccount: async () => {},
  addAccount: () => {},
  lastActivity: Date.now(),
  refreshSession: async () => {},
  mfaEnabled: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperadmin, setIsSuperadmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savedSessions, setSavedSessions] = useState<SavedSession[]>(() =>
    SessionManager.getSavedSessions(),
  );
  const [lastActivity, setLastActivity] = useState<number>(() => Date.now());
  const [mfaEnabled, setMfaEnabled] = useState(false);

  const signOut = async () => {
    if (user) {
      SessionManager.removeSession(user.id);
      setSavedSessions(SessionManager.getSavedSessions());
    }
    await supabase.auth.signOut();
  };

  useEffect(() => {
    let mounted = true;

    async function ensureProfileExists(user: User) {
      try {
        // First check if profile exists to avoid unnecessary upserts that might trigger DB locks or race conditions
        const { data: existing, error: fetchError } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", user.id)
          .maybeSingle();

        if (fetchError) throw fetchError;

        if (!existing) {
          const { error: insertError } = await supabase.from("profiles").insert({
            id: user.id,
            email: user.email,
            full_name: user.user_metadata?.full_name || "User " + user.id.substring(0, 4),
          });
          if (insertError) console.error("Profile auto-creation failed:", insertError.message);
        }
      } catch (e) {
        console.error("Critical error in ensureProfileExists", e);
      }
    }

    async function fetchRoleStatus(userId: string) {
      try {
        // 1. Check profiles table first
        const { data, error } = await supabase
          .from("profiles")
          .select("is_admin, is_superadmin, email")
          .eq("id", userId)
          .single();

        if (error) throw error;

        if (data) {
          setIsAdmin(data.is_admin || false);
          setIsSuperadmin(data.is_superadmin || false);

          // 2. Double-check against system_config via secure RPC if they aren't marked as admin yet
          // This acts as a real-time fail-safe using server-side logic
          if (!data.is_admin) {
            const checkEmail = data.email || session?.user?.email;
            if (checkEmail) {
              const { data: isRpcAdmin, error: rpcError } = await supabase.rpc("is_admin_check", {
                p_email: checkEmail,
              });

              if (!rpcError && isRpcAdmin) {
                setIsAdmin(true);
                setIsSuperadmin(true);
              }
            }
          }
        }
      } catch (e) {
        console.error("Error fetching role status:", e);
        // Fallback is already handled by default state (false)
      }
    }

    async function init() {
      try {
        // 1. Get initial session
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (mounted) {
          setSession(session);
          setUser(session?.user ?? null);

          if (session?.user) {
            // Blocking checks for initial load
            await ensureProfileExists(session.user);
            await fetchRoleStatus(session.user.id);

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

    // 2. Inactivity Timer (4 hours for auto-logout)
    let inactivityTimer: NodeJS.Timeout;
    const AUTO_LOGOUT_TIMEOUT = 4 * 60 * 60 * 1000; // 4 hours

    const resetTimer = () => {
      const now = Date.now();
      if (mounted) setLastActivity(now);

      if (inactivityTimer) clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(() => {
        console.debug("Auto-logout timeout reached. Signing out.");
        signOut();
      }, AUTO_LOGOUT_TIMEOUT);
    };

    const activityEvents = ["mousedown", "mousemove", "keydown", "scroll", "touchstart"];

    activityEvents.forEach((event) => {
      window.addEventListener(event, resetTimer);
    });

    resetTimer();

    // 3. Listen for changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        if (event === "SIGNED_IN" || event === "INITIAL_SESSION" || event === "USER_UPDATED") {
          // Set loading state for transitions
          setLoading(true);
          try {
            await ensureProfileExists(session.user);
            await fetchRoleStatus(session.user.id);

            SessionManager.saveSession(session);
            setSavedSessions(SessionManager.getSavedSessions());

            const { data: mfaData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
            setMfaEnabled(mfaData?.currentLevel === "aal2");
          } catch (err) {
            console.error("Auth change tasks failed:", err);
          } finally {
            setLoading(false);
          }
        }
      } else {
        setIsAdmin(false);
        setIsSuperadmin(false);
        setMfaEnabled(false);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
      activityEvents.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });
      if (inactivityTimer) clearTimeout(inactivityTimer);
    };
  }, []);

  const switchAccount = async (targetSession: Session) => {
    const { error } = await supabase.auth.setSession(targetSession);
    if (error) {
      console.error("Failed to switch session:", error);
      SessionManager.removeSession(targetSession.user.id);
      setSavedSessions(SessionManager.getSavedSessions());
      alert("Session expired. Please login again.");
      return;
    }
    window.location.reload();
  };

  const addAccount = () => {
    SessionManager.clearSupabaseAuthLocal();
    window.location.href = "/login";
  };

  const refreshSession = async () => {
    const { data, error } = await supabase.auth.refreshSession();
    if (error) {
      console.error("Session refresh failed:", error);
      signOut();
    } else {
      setSession(data.session);
      setUser(data.user);
    }
  };

  const value = {
    session,
    user,
    isAdmin,
    isSuperadmin,
    loading,
    signOut,
    savedSessions,
    switchAccount,
    addAccount,
    lastActivity,
    refreshSession,
    mfaEnabled,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  return useContext(AuthContext);
};
