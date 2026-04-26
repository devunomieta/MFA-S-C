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
        const { data: existing, error: fetchError } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", authUser.id)
          .maybeSingle();

        if (fetchError) throw fetchError;

        if (!existing) {
          const { error: insertError } = await supabase.from("profiles").insert({
            id: authUser.id,
            email: authUser.email,
            full_name:
              authUser.user_metadata?.full_name || "User " + authUser.id.substring(0, 4),
          });
          if (insertError) console.error("Profile auto-creation failed:", insertError.message);
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

        if (error) throw error;

        if (data) {
          if (mounted) {
            setIsAdmin(data.is_admin || false);
            setIsSuperadmin(data.is_superadmin || false);
          }

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
      } catch (e) {
        console.error("Error fetching role status:", e);
      }
    }

    async function init() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (mounted) {
          setSession(session);
          setUser(session?.user ?? null);

          if (session?.user) {
            await ensureProfileExists(session.user);
            await fetchRoleStatus(session.user.id, session.user.email);

            SessionManager.saveSession(session);
            setSavedSessions(SessionManager.getSavedSessions());

            // Mark this user ID as already initialized.
            // onAuthStateChange SIGNED_IN for the same ID = session restore, not new login.
            initializedUserId.current = session.user.id;
          }
        }
      } catch (err) {
        console.error("Auth init failed:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    init();

    // ── Inactivity Timer (4 hours) ─────────────────────────────────────────
    let inactivityTimer: NodeJS.Timeout;
    const AUTO_LOGOUT_TIMEOUT = 4 * 60 * 60 * 1000;

    const resetTimer = () => {
      if (mounted) setLastActivity(Date.now());
      if (inactivityTimer) clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(() => {
        console.debug("Auto-logout timeout reached. Signing out.");
        signOut();
      }, AUTO_LOGOUT_TIMEOUT);
    };

    const activityEvents = ["mousedown", "mousemove", "keydown", "scroll", "touchstart"];
    activityEvents.forEach((e) => window.addEventListener(e, resetTimer));
    resetTimer();

    // ── Auth State Listener ────────────────────────────────────────────────
    // KEY RULES:
    //  • INITIAL_SESSION  — skip entirely (init() already handled it).
    //  • SIGNED_IN        — Supabase fires this BOTH for genuine new logins AND
    //                       for session restores (tab focus, page reload from storage).
    //                       Use initializedUserId to tell them apart.
    //  • TOKEN_REFRESHED  — silent background refresh; update session only.
    //  • USER_UPDATED     — re-fetch role silently, no spinner.
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
          // ✅ Genuine new login — run full cycle with loading spinner
          initializedUserId.current = newSession.user.id;
          setLoading(true);
          try {
            await ensureProfileExists(newSession.user);
            await fetchRoleStatus(newSession.user.id, newSession.user.email);
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
          // 🔕 Same user — tab restore / page reload. NO loading spinner.
          SessionManager.saveSession(newSession);
          setSavedSessions(SessionManager.getSavedSessions());
        } else if (event === "USER_UPDATED") {
          // Silent role refresh — no spinner
          try {
            await fetchRoleStatus(newSession.user.id, newSession.user.email);
            SessionManager.saveSession(newSession);
            setSavedSessions(SessionManager.getSavedSessions());
          } catch (err) {
            console.error("Silent role refresh failed:", err);
          }
        } else if (event === "TOKEN_REFRESHED") {
          // Silent session token update only — NEVER show a loading spinner here
          SessionManager.saveSession(newSession);
          setSavedSessions(SessionManager.getSavedSessions());
        }
      } else {
        // Signed out — reset everything
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
