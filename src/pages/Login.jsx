import React, { useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogIn, Mail, Lock, Loader2, Smartphone } from "lucide-react";
import { useTranslation } from "react-i18next";
import AuthLayout from "@/components/AuthLayout";
import GoogleIcon from "@/components/GoogleIcon";
import { safeReturnTo } from "@/lib/authReturnTo";
import { useDemoAuth } from "@/lib/DemoAuthContext";
import { DEMO_ACCOUNTS, DEMO_PASSWORD, ROLES, findDemoAccount, publicAccount, roleHome } from "@/lib/roles";
import { cooperativeAccounts, findCooperativeAccount } from "@/lib/cooperatives";
import { Navigate } from "react-router-dom";
import { signInToDatabase } from "@/lib/supabaseClient";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  // Post-login destination (e.g. the MCP OAuth consent page sends users here
  // with returnTo so the grant flow can resume). Same-origin paths only.
  const returnTo = safeReturnTo();
  const { demoUser, loginAs } = useDemoAuth();

  if (demoUser) {
    return <Navigate to={roleHome(demoUser.role)} replace />;
  }

  const handleDemo = async (account) => {
    await signInToDatabase(account.email, DEMO_PASSWORD);
    loginAs(publicAccount(account));
    window.location.href = roleHome(account.role);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    // Demo accounts are checked first, so each programme can sign in with its own email and password.
    const demo = findDemoAccount(email, password) || findCooperativeAccount(email, password);
    if (demo) {
      await signInToDatabase(demo.email, password);
      loginAs(publicAccount(demo));
      window.location.href = roleHome(demo.role);
      return;
    }
    try {
      await base44.auth.loginViaEmailPassword(email, password);
      window.location.href = returnTo;
    } catch (err) {
      setError(err.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = () => {
    base44.auth.loginWithProvider("google", returnTo);
  };

  return (
    <AuthLayout
      icon={LogIn}
      title="Welcome back"
      subtitle="Log in to your account"
      footer={
        <>
          Don't have an account?{" "}
          <Link
            to={"/register" + (returnTo !== "/" ? "?returnTo=" + encodeURIComponent(returnTo) : "")}
            className="text-primary font-medium hover:underline"
          >
            Create one
          </Link>
        </>
      }
    >
      <Link to="/ussd-sim" data-tour="login-ussd-banner" className="mb-6 flex items-start gap-3 rounded-lg border border-brand/30 bg-brand-soft px-3.5 py-3 transition-colors hover:border-brand">
        <Smartphone className="mt-0.5 h-5 w-5 shrink-0 text-brand" aria-hidden="true" />
        <span className="min-w-0">
          <span className="block text-[13px] font-semibold text-foreground">{t("login.ussd.title")}</span>
          <span className="block text-[11.5px] leading-snug text-muted-foreground">{t("login.ussd.text", { code: "*384#", phone: "+250788000001" })}</span>
          <span className="mt-1 block text-[12px] font-medium text-brand">{t("login.ussd.open")} →</span>
        </span>
      </Link>
      <p className="-mt-3 mb-6 text-[11px] text-muted-foreground">{t("login.ussd.admin")}</p>

      <Button
        variant="outline"
        className="w-full h-12 text-sm font-medium mb-6"
        onClick={handleGoogle}
      >
        <GoogleIcon className="w-5 h-5 mr-2" />
        Continue with Google
      </Button>

      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-3 text-muted-foreground">or</span>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="email"
              type="email"
              autoComplete="email"
              autoFocus
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link to="/forgot-password" className="text-xs text-primary hover:underline">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>
        <Button type="submit" className="w-full h-12 font-medium" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Logging in...
            </>
          ) : (
            "Log in"
          )}
        </Button>
      </form>

      <div className="mt-6 border-t border-border pt-4">
        <p className="mb-1 text-xs font-medium text-muted-foreground">Demo accounts: pick one, or type its email</p>
        <p className="mb-2 text-[11px] text-muted-foreground">Password for every demo account: <span className="font-mono text-foreground">{DEMO_PASSWORD}</span>. Each programme account sees only its own programme.</p>
        <div className="grid grid-cols-2 gap-2">
          {DEMO_ACCOUNTS.map((a) => (
            <button
              key={a.email}
              type="button"
              onClick={() => handleDemo(a)}
              className="rounded-lg border border-border px-3 py-2 text-left transition-colors hover:border-brand hover:bg-brand-soft"
            >
              <p className="text-[12px] font-medium text-foreground">{a.programme || ROLES[a.role].label}</p>
              <p className="truncate text-[10.5px] text-muted-foreground">{a.scope}</p>
              <p className="truncate font-mono text-[10px] text-muted-foreground">{a.email}</p>
            </button>
          ))}
        </div>
        <details className="mt-3 rounded-lg border border-border px-3 py-2">
          <summary className="cursor-pointer text-[12px] font-medium text-foreground">Cooperative accounts ({cooperativeAccounts().length})</summary>
          <p className="mt-1 text-[11px] text-muted-foreground">Each cooperative has its own account and accepts or declines its own members.</p>
          <div className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {cooperativeAccounts().map((a) => (
              <button key={a.email} type="button" onClick={() => handleDemo(a)} className="rounded-md border border-border px-2.5 py-1.5 text-left transition-colors hover:border-brand hover:bg-brand-soft">
                <p className="truncate text-[11.5px] font-medium text-foreground">{a.name}</p>
                <p className="truncate font-mono text-[10px] text-muted-foreground">{a.email}</p>
              </button>
            ))}
          </div>
        </details>
      </div>
    </AuthLayout>
  );
}