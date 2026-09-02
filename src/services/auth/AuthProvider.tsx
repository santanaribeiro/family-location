import type { Session, User } from '@supabase/supabase-js';
import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { isSupabaseConfigured, supabase } from '@/services/supabase';

// Necessário para o fluxo OAuth via navegador retornar ao app.
WebBrowser.maybeCompleteAuthSession();

export interface AuthContextValue {
  session: Session | null;
  user: User | null;
  /** Carregando a sessão inicial. */
  loading: boolean;
  /** `true` quando o Supabase está configurado (.env). */
  configured: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/** Extrai parâmetros da query (?a=b) e do fragmento (#a=b) de uma URL de redirect. */
function extractParams(url: string): Record<string, string> {
  const out: Record<string, string> = {};
  const query = url.split('?')[1]?.split('#')[0];
  const fragment = url.split('#')[1];
  for (const chunk of [query, fragment]) {
    if (!chunk) continue;
    for (const pair of chunk.split('&')) {
      const [key, value] = pair.split('=');
      if (key) out[decodeURIComponent(key)] = decodeURIComponent(value ?? '');
    }
  }
  return out;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    let mounted = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    async function signInWithGoogle() {
      if (!supabase) {
        throw new Error(
          'Supabase não configurado. Defina EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_ANON_KEY no .env.',
        );
      }
      // NOTA: a redirect URL abaixo precisa estar liberada em Supabase → Auth → URL Configuration.
      // Em Expo Go ela é uma URL exp://; em dev build usa o scheme "familylocation".
      const redirectTo = makeRedirectUri({ path: 'auth-callback' });

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo, skipBrowserRedirect: true },
      });
      if (error) throw error;
      if (!data?.url) return;

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      if (result.type !== 'success' || !result.url) return;

      const params = extractParams(result.url);
      if (params.error) throw new Error(params.error_description || params.error);

      if (params.access_token && params.refresh_token) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: params.access_token,
          refresh_token: params.refresh_token,
        });
        if (sessionError) throw sessionError;
      } else if (params.code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(params.code);
        if (exchangeError) throw exchangeError;
      }
    }

    async function signOut() {
      if (supabase) await supabase.auth.signOut();
      setSession(null);
    }

    return {
      session,
      user: session?.user ?? null,
      loading,
      configured: isSupabaseConfigured,
      signInWithGoogle,
      signOut,
    };
  }, [session, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>.');
  return ctx;
}
