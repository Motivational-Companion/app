"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

type Variant = "signin" | "post-purchase";

type Props = {
  onAuthenticated: () => void;
  onSkip?: () => void;
  variant?: Variant;
  /**
   * If provided, AuthGate automatically sends an OTP to this email on mount
   * and starts the user on the code entry step. Used post-purchase where
   * we already have the email from Stripe checkout.
   */
  prefilledEmail?: string;
};

const RESEND_COOLDOWN_SECONDS = 30;

const COPY: Record<Variant, {
  heading: string;
  subheading: string;
  emailCta: string;
  emailPlaceholder: string;
  codeHeading: string;
  codeSubheading: string;
  codeCta: string;
}> = {
  "signin": {
    heading: "Welcome back",
    subheading: "Sign in to continue where you left off",
    emailCta: "Send sign-in link",
    emailPlaceholder: "Your email address",
    codeHeading: "Check your email",
    codeSubheading: "We just sent a 6-digit code to",
    codeCta: "Sign in",
  },
  "post-purchase": {
    heading: "You're in. One last step.",
    subheading: "Save your progress and unlock daily check-ins with Sam.",
    emailCta: "Create my account",
    emailPlaceholder: "Your email",
    codeHeading: "Almost there",
    codeSubheading: "We just sent a 6-digit code to",
    codeCta: "Unlock Sam",
  },
};

export default function AuthGate({
  onAuthenticated,
  onSkip,
  variant = "signin",
  prefilledEmail,
}: Props) {
  const copy = COPY[variant];
  const [step, setStep] = useState<"email" | "code">(
    prefilledEmail ? "code" : "email"
  );
  const [email, setEmail] = useState(prefilledEmail ?? "");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [autoSendState, setAutoSendState] = useState<
    "idle" | "sending" | "sent" | "failed"
  >(prefilledEmail ? "sending" : "idle");

  const supabase = useMemo(() => createClient(), []);
  const autoSendStarted = useRef(false);

  const sendCode = useCallback(
    async (targetEmail: string): Promise<{ ok: boolean; error?: string }> => {
      if (!supabase) return { ok: false, error: "Auth not configured" };

      // Magic link recipients should land directly inside the product at
      // /chat, not on the marketing landing. The callback reads `next` from
      // the query string and redirects there after exchanging the code.
      const { error } = await supabase.auth.signInWithOtp({
        email: targetEmail,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: `${window.location.origin}/api/auth/callback?next=/chat`,
        },
      });

      if (error) return { ok: false, error: error.message };
      return { ok: true };
    },
    [supabase]
  );

  // Skip auth entirely if Supabase is not configured (dev/preview fallback)
  useEffect(() => {
    if (!supabase) onAuthenticated();
  }, [supabase, onAuthenticated]);

  // Auto-send OTP on mount when prefilledEmail is provided
  useEffect(() => {
    if (!prefilledEmail || !supabase || autoSendStarted.current) return;
    autoSendStarted.current = true;

    let cancelled = false;
    sendCode(prefilledEmail).then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setAutoSendState("sent");
        setResendCooldown(RESEND_COOLDOWN_SECONDS);
      } else {
        setAutoSendState("failed");
        setError(result.error ?? "Failed to send code");
      }
    });

    return () => {
      cancelled = true;
    };
  }, [prefilledEmail, supabase, sendCode]);

  // Resend cooldown countdown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  if (!supabase) return null;

  const handleSendFromEmailStep = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await sendCode(email);
    setLoading(false);

    if (!result.ok) {
      setError(result.error ?? "Something went wrong");
      return;
    }

    setStep("code");
    setAutoSendState("sent");
    setResendCooldown(RESEND_COOLDOWN_SECONDS);
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: code.trim(),
        type: "email",
      });

      if (error) {
        setError(error.message);
        return;
      }

      onAuthenticated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || loading || autoSendState === "sending") return;
    setLoading(true);
    setError(null);

    const result = await sendCode(email);
    setLoading(false);

    if (result.ok) {
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
    } else {
      setError(result.error ?? "Failed to resend code");
    }
  };

  const handleUseDifferentEmail = () => {
    setStep("email");
    setCode("");
    setEmail("");
    setError(null);
    setAutoSendState("idle");
    setResendCooldown(0);
    // Intentionally do NOT reset autoSendStarted.current — the auto-send is a
    // one-time behavior per mount. Resetting could cause a second send if the
    // parent re-renders with the same prefilledEmail.
  };

  return (
    <div className="min-h-[100dvh] bg-bg flex justify-center items-start md:items-center md:py-12 md:px-4">
      <div className="w-full max-w-[480px] flex flex-col px-6 pb-8 pt-8 md:rounded-3xl md:shadow-xl md:border md:border-border">
        {variant === "post-purchase" && (
          <div className="mb-5 flex justify-center">
            <span className="inline-flex items-center gap-1.5 bg-success/10 text-success px-3 py-1.5 rounded-full text-xs font-semibold">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Your 7-day free trial has started
            </span>
          </div>
        )}

        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-full bg-accent-soft flex items-center justify-center mx-auto mb-4">
            <span
              className="text-primary-dark font-display text-2xl"
              aria-hidden="true"
            >
              {step === "code" ? "\u2709" : "S"}
            </span>
          </div>
          <h2 className="font-display text-2xl font-semibold text-text mb-1">
            {step === "code" ? copy.codeHeading : copy.heading}
          </h2>
          <p className="text-text-soft text-sm">
            {step === "code" ? copy.codeSubheading : copy.subheading}
          </p>
          {step === "code" && email && (
            <p className="text-primary font-semibold text-sm mt-1 break-all">
              {email}
            </p>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4" role="alert">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {step === "code" && autoSendState === "sending" && (
          <div className="flex items-center justify-center gap-2 mb-4 text-text-muted text-sm">
            <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            Sending code...
          </div>
        )}

        {step === "email" ? (
          <form onSubmit={handleSendFromEmailStep} className="space-y-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={copy.emailPlaceholder}
              required
              autoFocus
              autoComplete="email"
              inputMode="email"
              className="w-full px-4 py-3 rounded-xl border border-border bg-bg text-sm text-text
                         placeholder:text-text-muted focus:outline-none focus:border-primary transition-colors"
            />

            <button
              type="submit"
              disabled={loading || !email}
              className="w-full h-14 bg-primary text-white rounded-xl text-base font-semibold
                         hover:bg-primary-dark active:scale-[0.98] transition-all
                         disabled:opacity-60 disabled:cursor-default"
            >
              {loading ? "Sending..." : copy.emailCta}
            </button>

            <p className="text-xs text-text-muted text-center pt-2">
              We&apos;ll email you a 6-digit code. No password needed.
            </p>
          </form>
        ) : (
          <form onSubmit={handleVerifyCode} className="space-y-3">
            <input
              type="text"
              value={code}
              onChange={(e) =>
                setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              placeholder="000000"
              required
              autoFocus
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              aria-label="6-digit verification code"
              className="w-full px-4 py-4 rounded-xl border border-border bg-bg text-2xl text-text text-center tracking-[0.4em] font-mono
                         placeholder:text-text-muted focus:outline-none focus:border-primary transition-colors"
            />

            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="w-full h-14 bg-primary text-white rounded-xl text-base font-semibold
                         hover:bg-primary-dark active:scale-[0.98] transition-all
                         disabled:opacity-60 disabled:cursor-default"
            >
              {loading ? "Verifying..." : copy.codeCta}
            </button>

            <div className="flex items-center justify-between pt-3">
              <button
                type="button"
                onClick={handleUseDifferentEmail}
                className="text-sm text-text-muted hover:text-text-soft transition-colors"
              >
                Use a different email
              </button>
              <button
                type="button"
                onClick={handleResend}
                disabled={resendCooldown > 0 || loading}
                className="text-sm text-primary hover:text-primary-dark transition-colors disabled:text-text-muted disabled:cursor-default"
              >
                {resendCooldown > 0
                  ? `Resend in ${resendCooldown}s`
                  : "Resend code"}
              </button>
            </div>
          </form>
        )}

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
