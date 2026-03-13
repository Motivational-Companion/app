"use client";

import { useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";

type Props = {
  onAuthenticated: () => void;
  onSkip?: () => void;
};

export default function AuthGate({ onAuthenticated, onSkip }: Props) {
  const [mode, setMode] = useState<"signin" | "signup" | "magic">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  const supabase = useMemo(() => createClient(), []);

  // If Supabase isn't configured, skip auth
  if (!supabase) {
    onAuthenticated();
    return null;
  }

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode === "magic") {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: `${window.location.origin}/api/auth/callback` },
        });
        if (error) throw error;
        setMagicLinkSent(true);
      } else if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/api/auth/callback` },
        });
        if (error) throw error;
        onAuthenticated();
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        onAuthenticated();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  if (magicLinkSent) {
    return (
      <div className="min-h-[100dvh] bg-bg flex justify-center items-start md:items-center md:py-12 md:px-4">
        <div className="w-full max-w-[480px] flex flex-col items-center text-center px-6 pb-8 pt-12 md:rounded-3xl md:shadow-xl md:border md:border-border">
          <div className="w-16 h-16 rounded-full bg-accent-soft flex items-center justify-center mb-6">
            <span className="text-primary-dark text-2xl">&#9993;</span>
          </div>
          <h2 className="font-display text-2xl font-semibold text-text mb-3">Check your email</h2>
          <p className="text-text-soft text-sm max-w-xs mb-6">
            We sent a sign-in link to <strong>{email}</strong>. Click the link to continue.
          </p>
          <button
            onClick={() => setMagicLinkSent(false)}
            className="text-sm text-primary hover:text-primary-dark transition-colors"
          >
            Use a different email
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-bg flex justify-center items-start md:items-center md:py-12 md:px-4">
      <div className="w-full max-w-[480px] flex flex-col px-6 pb-8 pt-8 md:rounded-3xl md:shadow-xl md:border md:border-border">
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-full bg-accent-soft flex items-center justify-center mx-auto mb-4">
            <span className="text-primary-dark font-display text-2xl">S</span>
          </div>
          <h2 className="font-display text-2xl font-semibold text-text mb-1">
            {mode === "signup" ? "Create your account" : "Welcome back"}
          </h2>
          <p className="text-text-soft text-sm">
            {mode === "signup"
              ? "Save your progress and get daily check-ins"
              : "Sign in to continue where you left off"}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <form onSubmit={handleEmailAuth} className="space-y-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
            required
            className="w-full px-4 py-3 rounded-xl border border-border bg-bg text-sm text-text
                       placeholder:text-text-muted focus:outline-none focus:border-primary transition-colors"
          />

          {mode !== "magic" && (
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              required
              minLength={6}
              className="w-full px-4 py-3 rounded-xl border border-border bg-bg text-sm text-text
                         placeholder:text-text-muted focus:outline-none focus:border-primary transition-colors"
            />
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-14 bg-primary text-white rounded-xl text-base font-semibold
                       hover:bg-primary-dark active:scale-[0.98] transition-all
                       disabled:opacity-60 disabled:cursor-default"
          >
            {loading
              ? "Loading..."
              : mode === "magic"
              ? "Send magic link"
              : mode === "signup"
              ? "Create account"
              : "Sign in"}
          </button>
        </form>

        <div className="flex flex-col items-center gap-2 mt-4">
          {mode === "signup" ? (
            <>
              <button
                onClick={() => setMode("signin")}
                className="text-sm text-primary hover:text-primary-dark transition-colors"
              >
                Already have an account? Sign in
              </button>
              <button
                onClick={() => setMode("magic")}
                className="text-sm text-text-muted hover:text-text-soft transition-colors"
              >
                Sign in with magic link instead
              </button>
            </>
          ) : mode === "signin" ? (
            <>
              <button
                onClick={() => setMode("signup")}
                className="text-sm text-primary hover:text-primary-dark transition-colors"
              >
                Need an account? Sign up
              </button>
              <button
                onClick={() => setMode("magic")}
                className="text-sm text-text-muted hover:text-text-soft transition-colors"
              >
                Forgot password? Use magic link
              </button>
            </>
          ) : (
            <button
              onClick={() => setMode("signin")}
              className="text-sm text-primary hover:text-primary-dark transition-colors"
            >
              Sign in with password instead
            </button>
          )}
        </div>

        {onSkip && (
          <button
            onClick={onSkip}
            className="mt-6 text-sm text-text-muted hover:text-text-soft transition-colors text-center w-full"
          >
            Skip for now
          </button>
        )}
      </div>
    </div>
  );
}
