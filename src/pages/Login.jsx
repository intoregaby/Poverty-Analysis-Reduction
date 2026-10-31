import React, { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { supabase, supabaseConfigured } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Github, LogIn, Smartphone } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import GoogleIcon from "@/components/GoogleIcon";
import { appAbsoluteUrl, safeReturnTo } from "@/lib/authReturnTo";
import { useDemoAuth } from "@/lib/DemoAuthContext";
import { DEMO_PASSWORD, ROLES, findDemoAccount, publicAccount, roleHome } from "@/lib/roles";
import { findCooperativeAccount } from "@/lib/cooperatives";
import { signInToDatabase } from "@/lib/supabaseClient";

const googleOAuthConfigured = import.meta.env.VITE_SUPABASE_GOOGLE_ENABLED === "true";
const githubOAuthConfigured = import.meta.env.VITE_SUPABASE_GITHUB_ENABLED === "true";

// Hackathon panel identities are real Supabase accounts. The shortcut uses the
// shared hackathon password, then still loads the protected profile role.
const SUPABASE_PANEL_SHORTCUTS = [
  { label: "Platform Admin", email: "admin@platform.demo" },
  { label: "NISR Analyst", email: "analyst@nisr.demo" },
  { label: "Programme Account", email: "vup@programmes.demo" },
  { label: "Cooperative", email: "twiyubake-cooperative@coops.demo" },
  { label: "District Officer", email: "district@gov.demo" },
  { label: "Sector Leader", email: "sector@gov.demo" },
  { label: "Cell Leader", email: "cell@gov.demo" },
  { label: "Field Agent", email: "agent@field.demo" },
  { label: "Program Member", email: "beneficiary@people.demo" },
  { label: "Job Applicant", email: "applicant@people.demo" },
];

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

  const finishDatabaseLogin = async (emailAddress, passwordValue) => {
    if (!supabase) throw new Error("Sign-in is not configured.");
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: emailAddress,
      password: passwordValue,
    });
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
  };

  const handlePanelShortcut = async (account) => {
    setError("");
    setLoading(true);
    try {
      await finishDatabaseLogin(account.email, DEMO_PASSWORD);
    } catch (err) {
      setError(err.message || "Panel access could not be started.");
    } finally {
      setLoading(false);
    }
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
      await finishDatabaseLogin(email, password);
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
      icon={LogIn}
      title="Sign in"
      subtitle="Use your Ireme Insight account"
      footer={
        <>
          Don't have an account?{" "}
          <Link to={"/register" + (returnTo !== "/" ? "?returnTo=" + encodeURIComponent(returnTo) : "")} className="text-primary font-medium hover:underline">
            Create account
          </Link>
        </>
      }
    >
      <div className="mb-5 rounded-lg border border-[#dcefe0] bg-[#f5fbf3] px-3.5 py-3">
        <p className="text-[12.5px] font-semibold text-ink">Sign in with your account</p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-sub">Use your registered email and password.</p>
      </div>
      <Link to="/ussd-sim" className="mb-5 flex items-center gap-3 rounded-lg border border-[#D9D6FE] bg-[#F5F3FF] px-3.5 py-3 transition-colors hover:bg-[#F0EEFF]">
        <span className="grid h-8 w-8 place-items-center rounded-md bg-white text-brand"><Smartphone className="h-4 w-4" aria-hidden="true" /></span>
        <span><span className="block text-[12px] font-semibold text-ink">Test the USSD mobile simulator</span><span className="mt-0.5 block text-[11px] text-sub">Open the basic-phone demo without signing in.</span></span>
      </Link>
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

      {supabaseConfigured && <div className="mt-5 border-t border-border pt-4">
        <p className="mb-1 text-xs font-medium text-muted-foreground">Hackathon panel access</p>
        <p className="mb-2 text-[11px] leading-relaxed text-muted-foreground">Choose a live Supabase panel account to continue.</p>
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {SUPABASE_PANEL_SHORTCUTS.map((account) => (
            <button
              key={account.email}
              type="button"
              onClick={() => handlePanelShortcut(account)}
              disabled={loading}
              className="rounded-md border border-border px-2.5 py-2 text-left transition-colors hover:border-brand hover:bg-brand-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              <span className="block text-[11.5px] font-medium text-foreground">{account.label}</span>
            </button>
          ))}
        </div>
      </div>}
    </AuthLayout>
  );
}
