"use client";

import { useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";

type Variant = "signin" | "post-purchase";

type Props = {
  onAuthenticated: () => void;
  onSkip?: () => void;
  variant?: Variant;
};

const COPY: Record<Variant, {
  heading: string;
  subheading: string;
  emailCta: string;
  emailPlaceholder: string;
  emailSentInfo: string;
  codeHeading: string;
  codeSubheading: string;
  codeCta: string;
}> = {
  "signin": {
    heading: "Welcome back",
    subheading: "Sign in to continue where you left off",
    emailCta: "Send sign-in link",
    emailPlaceholder: "Your email address",
    emailSentInfo: "We sent you an email with a 6-digit code and a sign-in link.",
    codeHeading: "Check your email",
    codeSubheading: "Enter the 6-digit code we sent you",
    codeCta: "Sign in",
  },
  "post-purchase": {
    heading: "You're in. One last step.",
    subheading:
      "Save your progress and unlock daily check-ins with Sam. Your 7-day free trial has started.",
    emailCta: "Create my account",
    emailPlaceholder: "Your email",
    emailSentInfo:
      "We sent a 6-digit code to your email. Enter it below to unlock Sam.",
    codeHeading: "Almost there",
    codeSubheading:
      "Enter the 6-digit code we just sent to your email to access Sam.",
    codeCta: "Unlock Sam",
  },
};

export default function AuthGate({
  onAuthenticated,
  onSkip,
  variant = "signin",
}: Props) {
  const copy = COPY[variant];
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const supabase = useMemo(() => createClient(), []);

  if (!supabase) {
    // Supabase not configured — skip auth (dev/preview fallback)
    onAuthenticated();
    return null;
  }

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: `${window.location.origin}/api/auth/callback`,
        },
      });

      if (error) {
        setError(error.message);
        return;
      }

      setInfo(copy.emailSentInfo);
      setStep("code");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);

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

  const handleBackToEmail = () => {
    setStep("email");
    setCode("");
    setError(null);
    setInfo(null);
  };

  return (
    <div className="min-h-[100dvh] bg-bg flex justify-center items-start md:items-center md:py-12 md:px-4">
      <div className="w-full max-w-[480px] flex flex-col px-6 pb-8 pt-8 md:rounded-3xl md:shadow-xl md:border md:border-border">
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-full bg-accent-soft flex items-center justify-center mx-auto mb-4">
            <span className="text-primary-dark font-display text-2xl">
              {step === "code" ? "\u2709" : "S"}
            </span>
          </div>
          <h2 className="font-display text-2xl font-semibold text-text mb-1">
            {step === "code" ? copy.codeHeading : copy.heading}
          </h2>
          <p className="text-text-soft text-sm">
            {step === "code" ? copy.codeSubheading : copy.subheading}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {info && !error && step === "code" && (
          <div className="bg-accent-soft/50 border border-accent/20 rounded-xl px-4 py-3 mb-4">
            <p className="text-sm text-primary-dark">{info}</p>
          </div>
        )}

        {step === "email" ? (
          <form onSubmit={handleSendCode} className="space-y-3">
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
              We&apos;ll email you a link and a 6-digit code. No password
              needed.
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

            <button
              type="button"
              onClick={handleBackToEmail}
              className="w-full text-sm text-text-muted hover:text-text-soft transition-colors pt-2"
            >
              Use a different email
            </button>
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
