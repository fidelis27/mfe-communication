import { useEffect, useState } from "react";
import { initializeAuth, login, logout, subscribeToAuthState } from "@mfe/shared";

export function useHostAuth(supabaseUrl: string, supabaseAnonKey: string) {
  const [authReady, setAuthReady] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [authError, setAuthError] = useState("");
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    if (!supabaseUrl || !supabaseAnonKey) {
      setAuthReady(true);
      return;
    }

    let active = true;
    let unsubscribe = () => {};
    void initializeAuth({ url: supabaseUrl, anonKey: supabaseAnonKey })
      .then((hasSession) => {
        if (!active) return;
        setAuthenticated(hasSession);
        setAuthReady(true);
        unsubscribe = subscribeToAuthState(setAuthenticated);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setAuthError(error instanceof Error ? error.message : "Não foi possível iniciar a sessão.");
        setAuthReady(true);
      });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [supabaseAnonKey, supabaseUrl]);

  async function signIn(email: string, password: string) {
    setAuthError("");
    setSigningIn(true);
    try {
      await login(email, password);
      setAuthenticated(true);
      return true;
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Não foi possível entrar.");
      return false;
    } finally {
      setSigningIn(false);
    }
  }

  async function signOut() {
    setAuthError("");
    try {
      await logout();
      setAuthenticated(false);
      return true;
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Não foi possível encerrar a sessão.");
      return false;
    }
  }

  return {
    configured: Boolean(supabaseUrl && supabaseAnonKey),
    authReady,
    authenticated,
    authError,
    signingIn,
    signIn,
    signOut,
  };
}
