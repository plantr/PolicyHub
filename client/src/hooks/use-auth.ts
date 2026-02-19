import { useState, useEffect } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { queryClient } from "@/lib/queryClient";

interface AuthState {
  session: Session | null;
  user: User | null;
  loading: boolean;
  sessionExpired: boolean;
}

export function useAuth(): AuthState {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);

  useEffect(() => {
    // Load initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Track whether we had an authenticated session before sign-out
    let wasAuthenticated = false;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);

      if (event === "SIGNED_OUT" && wasAuthenticated) {
        setSessionExpired(true);
        // Use setTimeout to avoid deadlock inside auth callback
        setTimeout(() => queryClient.clear(), 0);
      }

      if (session) {
        wasAuthenticated = true;
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return {
    session,
    user: session?.user ?? null,
    loading,
    sessionExpired,
  };
}
