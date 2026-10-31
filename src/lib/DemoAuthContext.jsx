import React, { createContext, useCallback, useContext, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { signOutOfDatabase, supabaseConfigured } from "@/lib/supabaseClient";

const KEY = "ireme_demo_user";
const DemoAuthContext = createContext(null);

export const DemoAuthProvider = ({ children }) => {
  const [demoUser, setDemoUser] = useState(() => {
    if (supabaseConfigured) return null;
    try {
      return JSON.parse(localStorage.getItem(KEY));
    } catch {
      return null;
    }
  });

  const loginAs = useCallback((account) => {
    if (supabaseConfigured) return;
    localStorage.setItem(KEY, JSON.stringify(account));
    setDemoUser(account);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(KEY);
    setDemoUser(null);
    signOutOfDatabase().finally(() => { window.location.href = `${import.meta.env.BASE_URL}login`; });
  }, []);

  return (
    <DemoAuthContext.Provider value={{ demoUser, loginAs, logout }}>{children}</DemoAuthContext.Provider>
  );
};

export const useDemoAuth = () => {
  const ctx = useContext(DemoAuthContext);
  if (!ctx) throw new Error("useDemoAuth must be used within DemoAuthProvider");
  return ctx;
};

export const useRole = () => {
  const { demoUser } = useDemoAuth();
  const { profile } = useAuth();
  return supabaseConfigured ? profile?.role ?? null : demoUser?.role ?? null;
};
