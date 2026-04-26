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

  useEffect(() => {
    let mounted = true;

    async function ensureProfileExists(authUser: User) {
      try {
        const metadata = authUser.user_metadata || {};
        const fullName = metadata.full_name || metadata.name || "User " + authUser.id.substring(0, 4);
        const avatarUrl = metadata.avatar_url || metadata.picture || null;

        const { error: upsertError } = await supabase.from("profiles").upsert({
          id: authUser.id,
          email: authUser.email,
          full_name: fullName,
          avatar_url: avatarUrl,
        }, { onConflict: 'id' });

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
            // Profile missing — might be a race condition or invalid session
            console.warn("Profile not found during role check");
            return false;
          }
          throw error;
        }

        if (data && mounted) {
          setIsAdmin(data.is_admin || false);
          setIsSuperadmin(data.is_superadmin || false);

          // Secondary RPC check — failsafe if profiles.is_admin not yet set
          if (!data.is_admin) {
            const checkEmail = data.email || userEmail;
            if (checkEmail) {
              const { data: isRpcAdmin, error: rpcError } = await supabase.rpc("is_admin_check", {
                p_email: checkEmail,
              });
              if (!rpcError && isRpcAdmin && mounted) {
                setIsAdmin(true);
                setIsSuperadmin(true);
              }
            }
          }
        }
        return true;
      } catch (e: any) {
        console.error("Error fetching role status:", e);
        // If it's an auth error (401/403/JWT expired), we should probably sign out
        if (e.status === 401 || e.status === 403 || e.message?.includes("JWT")) {
          return false;
        }
        return true; // Keep session for other errors
      }
    }

    async function init() {
      try {
        const {
          data: { session },
          error: sessionError
        } = await supabase.auth.getSession();

        if (sessionError) {
          console.error("Session fetch error during init:", sessionError);
        }

        if (mounted) {
          setSession(session);
          setUser(session?.user ?? null);

          if (session?.user) {
            try {
              await ensureProfileExists(session.user);
              const success = await fetchRoleStatus(session.user.id, session.user.email);
              
              if (!success) {
                console.warn("Session validation failed during init, signing out...");
                await signOut();
                return;
              }
            } catch (innerErr) {
              console.error("Secondary init tasks failed:", innerErr);
            }

            SessionManager.saveSession(session);
            setSavedSessions(SessionManager.getSavedSessions());
            initializedUserId.current = session.user.id;
          }
        }
      } catch (err) {
        console.error("Auth init critical failure:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }


    init();

    // ── Inactivity Timer ──────────────────────────────────────────────────
    let inactivityTimer: NodeJS.Timeout;
    const activityEvents = ["mousedown", "mousemove", "keypress", "scroll", "touchstart"];

    const resetTimer = () => {
      setLastActivity(Date.now());
      if (inactivityTimer) clearTimeout(inactivityTimer);
      // Optional: auto-logout after 30 mins of total inactivity
      // inactivityTimer = setTimeout(signOut, 30 * 60 * 1000);
    };

    activityEvents.forEach((e) => window.addEventListener(e, resetTimer));
    resetTimer();


    // ── Auth State Listener ────────────────────────────────────────────────
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!mounted) return;
      if (event === "INITIAL_SESSION") return;

      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (newSession?.user) {
        const isNewUser = initializedUserId.current !== newSession.user.id;

        if (event === "SIGNED_IN" && isNewUser) {
          initializedUserId.current = newSession.user.id;
          setLoading(true);
          try {
            await ensureProfileExists(newSession.user);
            const success = await fetchRoleStatus(newSession.user.id, newSession.user.email);
            
            if (!success) {
              console.warn("Session validation failed during auth change, signing out...");
              await signOut();
              return;
            }

            SessionManager.saveSession(newSession);

            setSavedSessions(SessionManager.getSavedSessions());
            const { data: mfaData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
            if (mounted) setMfaEnabled(mfaData?.currentLevel === "aal2");
          } catch (err) {
            console.error("Auth change tasks failed:", err);
          } finally {
            if (mounted) setLoading(false);
          }
        } else if (event === "SIGNED_IN" && !isNewUser) {
          SessionManager.saveSession(newSession);
          setSavedSessions(SessionManager.getSavedSessions());
        } else if (event === "USER_UPDATED" || event === "PASSWORD_RECOVERY") {
          try {
            await fetchRoleStatus(newSession.user.id, newSession.user.email);
            SessionManager.saveSession(newSession);
            setSavedSessions(SessionManager.getSavedSessions());
          } catch (err) {
            console.error("Silent profile refresh failed:", err);
          }
        } else if (event === "TOKEN_REFRESHED") {
          SessionManager.saveSession(newSession);
          setSavedSessions(SessionManager.getSavedSessions());
        }
      } else {
        initializedUserId.current = null;
        setIsAdmin(false);
        setIsSuperadmin(false);
        setMfaEnabled(false);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
      activityEvents.forEach((e) => window.removeEventListener(e, resetTimer));
      if (inactivityTimer) clearTimeout(inactivityTimer);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
