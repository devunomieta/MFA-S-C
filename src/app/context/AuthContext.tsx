import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";

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
  removeSavedAccount: (userId: string) => void;
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
  removeSavedAccount: () => {},
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

  // Tracks the user ID that init() resolved — lets onAuthStateChange distinguish
  // a genuine new sign-in from a session-restore SIGNED_IN.
  // Supabase fires SIGNED_IN on tab restore / page reload from storage, NOT just on login.
  const initializedUserId = useRef<string | null>(null);

  const signOut = async () => {
    if (user) {
      SessionManager.removeSession(user.id);
      setSavedSessions(SessionManager.getSavedSessions());
    }
    await supabase.auth.signOut();
  };

  async function ensureProfileExists(authUser: User) {
    try {
      const metadata = authUser.user_metadata || {};
      const fullName = metadata.full_name || metadata.name || "User " + authUser.id.substring(0, 4);
      const avatarUrl = metadata.avatar_url || metadata.picture || null;

      const { error: upsertError } = await supabase.from("profiles").upsert(
        {
          id: authUser.id,
          email: authUser.email,
          full_name: fullName,
          avatar_url: avatarUrl,
        },
        { onConflict: "id" },
      );

      if (upsertError) {
        console.error("Profile synchronization failed:", upsertError.message);
      }
    } catch (e) {
      console.error("Critical error in ensureProfileExists", e);
    }
  }

  async function fetchRoleStatus(userId: string, userEmail?: string | null) {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("is_admin, is_superadmin, email")
        .eq("id", userId)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          console.warn("Profile not found during role check");
          return false;
        }
        throw error;
      }

      if (data) {
        setIsAdmin(data.is_admin || false);
        setIsSuperadmin(data.is_superadmin || false);

        if (!data.is_admin) {
          const checkEmail = data.email || userEmail;
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
      return true;
    } catch (e: any) {
      console.error("Error fetching role status:", e);
      if (e.status === 401 || e.status === 403 || e.message?.includes("JWT")) {
        return false;
      }
      return true;
    }
  }

  // Failsafe: Ensure loading is ALWAYS turned off after 10s regardless of network/auth state
  useEffect(() => {
    let mounted = true;

    const failsafeTimer = setTimeout(() => {
      if (mounted) {
        setLoading((current) => {
          if (current) console.warn("Auth loading failsafe triggered after 10s");
          return false;
        });
      }
    }, 10000);

    async function handleAuthStateChange(event: string, newSession: Session | null) {
      if (!mounted) return;

      // Skip redundant INITIAL_SESSION if we already have a session from init
      // But we actually want to handle it to unify the logic

      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (newSession?.user) {
        const isNewUser = initializedUserId.current !== newSession.user.id;

        // Only show loading for actual sign-ins or initial loads
        if (isNewUser || event === "SIGNED_IN") {
          setLoading(true);
          try {
            await ensureProfileExists(newSession.user);
            const success = await fetchRoleStatus(newSession.user.id, newSession.user.email);

            if (!success) {
              console.warn("Session validation failed, signing out...");
              await supabase.auth.signOut();
              return;
            }

            SessionManager.saveSession(newSession);
            setSavedSessions(SessionManager.getSavedSessions());
            initializedUserId.current = newSession.user.id;

            const { data: mfaData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
            if (mounted) setMfaEnabled(mfaData?.currentLevel === "aal2");
          } catch (err) {
            console.error("Auth task failure:", err);
          } finally {
            if (mounted) setLoading(false);
          }
        } else {
          // Token refreshed or user updated - just sync local storage
          SessionManager.saveSession(newSession);
          setSavedSessions(SessionManager.getSavedSessions());
        }
      } else {
        // No user
        initializedUserId.current = null;
        setIsAdmin(false);
        setIsSuperadmin(false);
        setMfaEnabled(false);
        setLoading(false);
      }
    }

    // Initial Session Fetch
    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (mounted) {
        await handleAuthStateChange("INITIAL_SESSION", session);
      }
    };

    init();

    // Auth State Listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (event === "INITIAL_SESSION") return; // Handled by init()
      handleAuthStateChange(event, newSession);
    });

    // ── Inactivity Timer ──────────────────────────────────────────────────
    const activityEvents = ["mousedown", "mousemove", "keypress", "scroll", "touchstart"];
    const resetTimer = () => {
      setLastActivity(Date.now());
    };

    activityEvents.forEach((e) => window.addEventListener(e, resetTimer));
    resetTimer();

    return () => {
      mounted = false;
      subscription.unsubscribe();
      clearTimeout(failsafeTimer);
      activityEvents.forEach((e) => window.removeEventListener(e, resetTimer));
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

  const removeSavedAccount = (userId: string) => {
    SessionManager.removeSession(userId);
    setSavedSessions(SessionManager.getSavedSessions());
    if (user?.id === userId) {
      supabase.auth.signOut().then(() => {
        window.location.href = "/login";
      });
    }
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

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        isAdmin,
        isSuperadmin,
        loading,
        signOut,
        savedSessions,
        switchAccount,
        addAccount,
        removeSavedAccount,
        lastActivity,
        refreshSession,
        mfaEnabled,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  return useContext(AuthContext);
};
