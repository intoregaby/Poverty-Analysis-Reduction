import React, { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { supabase, supabaseConfigured } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Github } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import GoogleIcon from "@/components/GoogleIcon";
import { appAbsoluteUrl, safeReturnTo } from "@/lib/authReturnTo";
import { useDemoAuth } from "@/lib/DemoAuthContext";
import { DEMO_ACCOUNTS, DEMO_PASSWORD, ROLES, findDemoAccount, publicAccount, roleHome } from "@/lib/roles";
import { cooperativeAccounts, findCooperativeAccount } from "@/lib/cooperatives";
import { signInToDatabase } from "@/lib/supabaseClient";

const googleOAuthConfigured = import.meta.env.VITE_SUPABASE_GOOGLE_ENABLED === "true";
const githubOAuthConfigured = import.meta.env.VITE_SUPABASE_GITHUB_ENABLED === "true";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  // Post-login destination (e.g. the MCP OAuth consent page sends users here
  // with returnTo so the grant flow can resume). Same-origin paths only.
  const returnTo = safeReturnTo();
  const { demoUser, loginAs } = useDemoAuth();

  if (!supabaseConfigured && demoUser) {
    return <Navigate to={roleHome(demoUser.role)} replace />;
  }

  const handleDemo = async (account) => {
    if (supabaseConfigured) return;
    await signInToDatabase(account.email, DEMO_PASSWORD);
    loginAs(publicAccount(account));
    navigate(roleHome(account.role), { replace: true });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    // Browser-stored demo roles are available only in an unconfigured local preview.
    const demo = supabaseConfigured ? null : findDemoAccount(email, password) || findCooperativeAccount(email, password);
    if (demo) {
      await signInToDatabase(demo.email, password);
      loginAs(publicAccount(demo));
      navigate(roleHome(demo.role), { replace: true });
      setLoading(false);
      return;
    }
    try {
      if (!supabase) throw new Error("Sign-in is not configured.");
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", signInData.user.id)
        .maybeSingle();
      if (profileError || !profile?.role || !ROLES[profile.role]) {
        await supabase.auth.signOut();
        throw new Error(profileError
          ? "We could not load access for this account. Please try again or contact the platform administrator."
          : "This account does not have an approved platform role yet. Contact the platform administrator.");
      }
      const hasRequestedDestination = new URLSearchParams(window.location.search).has("returnTo");
      const destination = hasRequestedDestination && returnTo !== "/" ? returnTo : roleHome(profile.role);
      navigate(destination, { replace: true });
    } catch (err) {
      setError(err.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider) => {
    setError("");
    if (!supabase) {
      setError("Connect Supabase to enable Google and GitHub sign-in.");
      return;
    }
    setLoading(true);
    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: appAbsoluteUrl(returnTo) },
      });
      if (oauthError) throw oauthError;
    } catch (err) {
      const providerName = provider === "github" ? "GitHub" : "Google";
      setError(err.message || `${providerName} sign-in could not start. Check its Supabase OAuth configuration.`);
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Sign in"
      subtitle="Use your Ireme Insight account"
      footer={
        <>
          Don't have an account?{" "}
          <Link
            to={"/register" + (returnTo !== "/" ? "?returnTo=" + encodeURIComponent(returnTo) : "")}
            className="text-primary font-medium hover:underline"
          >
            Sign up
          </Link>
        </>
      }
    >
      {supabaseConfigured && googleOAuthConfigured && <Button
        variant="outline"
        className="mb-3 h-10 w-full border-[#e2e4e1] bg-[#f4f5f3] text-sm font-normal text-ink hover:bg-[#eceeeb]"
        onClick={() => handleOAuth("google")}
        disabled={loading}
      >
        <GoogleIcon className="mr-2 h-4 w-4" />
        Sign in with Google
      </Button>}

      {supabaseConfigured && githubOAuthConfigured && <Button
        variant="outline"
        className="h-10 w-full border-[#e2e4e1] bg-[#f4f5f3] text-sm font-normal text-ink hover:bg-[#eceeeb]"
        onClick={() => handleOAuth("github")}
        disabled={loading}
      >
        <Github className="mr-2 h-4 w-4 text-[#414750]" />
        Sign in with GitHub
      </Button>}

      {supabaseConfigured && (googleOAuthConfigured || githubOAuthConfigured) && <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[#e2e4e1]" /></div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white px-3 text-sub">OR</span>
        </div>
      </div>}

      {error && (
        <div role="alert" className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-[13px] font-normal text-ink"><span aria-hidden="true" className="text-[#dc5248]">*</span> Email</Label>
          <div>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              autoFocus
              placeholder="Enter your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-10 rounded-md border-[#dfe2df] bg-[#f4f5f3] pl-3 text-[13px] shadow-none placeholder:text-[#8b918d] focus-visible:ring-brand"
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-[13px] font-normal text-ink"><span aria-hidden="true" className="text-[#dc5248]">*</span> Password</Label>
            <Link to="/forgot-password" className="text-xs text-primary hover:underline">
              Forgot password?
            </Link>
          </div>
          <div>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-10 rounded-md border-[#dfe2df] bg-[#f4f5f3] pl-3 text-[13px] shadow-none placeholder:text-[#8b918d] focus-visible:ring-brand"
              required
            />
          </div>
        </div>
        <Button type="submit" className="mt-1 h-10 w-full bg-[#78c66b] font-medium text-white hover:bg-[#69b95d]" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Logging in...
            </>
          ) : (
            supabaseConfigured ? "Continue" : "Log in"
          )}
        </Button>
      </form>

      {!supabaseConfigured && <div className="mt-6 border-t border-border pt-4">
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
      </div>}
    </AuthLayout>
  );
}
