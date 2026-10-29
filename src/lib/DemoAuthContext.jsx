import React, { createContext, useCallback, useContext, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { signOutOfDatabase } from "@/lib/supabaseClient";

const KEY = "ireme_demo_user";
const DemoAuthContext = createContext(null);

export const DemoAuthProvider = ({ children }) => {
  const [demoUser, setDemoUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(KEY));
    } catch {
      return null;
    }
  });

  const loginAs = useCallback((account) => {
    localStorage.setItem(KEY, JSON.stringify(account));
    setDemoUser(account);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(KEY);
    setDemoUser(null);
    signOutOfDatabase().finally(() => { window.location.href = "/login"; });
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
  const { isAuthenticated } = useAuth();
  return demoUser?.role ?? (isAuthenticated ? "nisr_analyst" : null);
};