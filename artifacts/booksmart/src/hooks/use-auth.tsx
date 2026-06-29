import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { User, Session } from "@supabase/supabase-js";

export type UserProfile = {
  id: string;          // Supabase auth UUID
  numericId: number | null;  // public.users.id (bigint) — used in all FK columns
  email: string;
  full_name: string;
  role: "user" | "cpa" | "admin";
  token_balance: number;
  phone?: string;
};

type AuthContextType = {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  isLoading: true,
  signOut: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user || null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setIsLoading(false);
      }
    };

    fetchSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user || null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (authUuid: string) => {
    try {
      // 1. Try public.users (Flutter schema) — integer id + auth_id UUID
      const { data: appUser, error: appUserError } = await supabase
        .from("users")
        .select("id, email, full_name, role, token_balance, phone")
        .eq("auth_id", authUuid)
        .single();

      if (!appUserError && appUser) {
        setProfile({
          id: authUuid,
          numericId: appUser.id as number,
          email: appUser.email ?? "",
          full_name: appUser.full_name ?? "",
          role: (appUser.role as UserProfile["role"]) ?? "user",
          token_balance: appUser.token_balance ?? 0,
          phone: appUser.phone,
        });
        return;
      }

      // 2. Try profiles table (alternative schema)
      const { data: profileRow, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", authUuid)
        .single();

      if (!profileError && profileRow) {
        setProfile({
          ...(profileRow as Omit<UserProfile, "numericId">),
          numericId: null,
        });
        return;
      }

      // 3. Fall back to auth metadata
      const { data: { user: authUser } } = await supabase.auth.getUser();
      const meta = authUser?.user_metadata ?? {};
      setProfile({
        id: authUuid,
        numericId: null,
        email: authUser?.email ?? "",
        full_name: meta.full_name ?? meta.name ?? "",
        role: (meta.role as UserProfile["role"]) ?? "user",
        token_balance: meta.token_balance ?? 0,
        phone: meta.phone,
      });
    } catch (e) {
      console.error("fetchProfile error:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user, profile, isLoading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
