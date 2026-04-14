"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/supabase/useAuth";

type Profile = {
  stripe_customer_id: string | null;
  subscription_status: string | null;
  plan: string | null;
};

export default function AccountPage() {
  const router = useRouter();
  const { user, loading, supabase } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalError, setPortalError] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/signin");
      return;
    }
    if (!supabase) return;
    supabase
      .from("profiles")
      .select("stripe_customer_id, subscription_status, plan")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data) setProfile(data as Profile);
      });
  }, [loading, user, supabase, router]);

  const openPortal = async () => {
    if (!profile?.stripe_customer_id) return;
    setPortalLoading(true);
    setPortalError(null);
    try {
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId: profile.stripe_customer_id }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error || "Could not open billing portal.");
      }
      window.location.href = data.url;
    } catch (err) {
      setPortalError(err instanceof Error ? err.message : String(err));
      setPortalLoading(false);
    }
  };

  const signOut = async () => {
    if (supabase) await supabase.auth.signOut();
    window.location.href = "/";
  };

  if (loading || !user) {
    return (
      <div className="flex justify-center items-center py-24">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  const statusLabel = profile?.subscription_status
    ? profile.subscription_status[0].toUpperCase() + profile.subscription_status.slice(1)
    : "Unknown";

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 py-10 md:py-14">
      <h1 className="font-display text-3xl font-semibold text-text mb-1">
        Account
      </h1>
      <p className="text-sm text-text-muted mb-8">Your profile and subscription.</p>

      <section className="bg-card border border-border rounded-2xl p-6 mb-4">
        <h2 className="font-semibold text-text mb-4">Profile</h2>
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-text-muted">Email</dt>
            <dd className="text-text truncate">{user.email}</dd>
          </div>
        </dl>
      </section>

      <section className="bg-card border border-border rounded-2xl p-6 mb-4">
        <h2 className="font-semibold text-text mb-4">Subscription</h2>
        <dl className="space-y-3 text-sm mb-5">
          <div className="flex justify-between gap-4">
            <dt className="text-text-muted">Status</dt>
            <dd className="text-text">{statusLabel}</dd>
          </div>
          {profile?.plan && (
            <div className="flex justify-between gap-4">
              <dt className="text-text-muted">Plan</dt>
              <dd className="text-text capitalize">{profile.plan}</dd>
            </div>
          )}
        </dl>
        {profile?.stripe_customer_id ? (
          <>
            <button
              type="button"
              onClick={openPortal}
              disabled={portalLoading}
              className="h-11 px-5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary-dark disabled:opacity-50 transition-colors"
            >
              {portalLoading ? "Opening…" : "Manage billing"}
            </button>
            {portalError && (
              <p className="text-sm text-red-600 mt-3">{portalError}</p>
            )}
          </>
        ) : (
          <p className="text-sm text-text-muted">
            No billing account on file yet.{" "}
            <Link href="/" className="text-primary hover:text-primary-dark">
              Start your trial
            </Link>
            .
          </p>
        )}
      </section>

      <section className="bg-card border border-border rounded-2xl p-6">
        <h2 className="font-semibold text-text mb-3">Sign out</h2>
        <p className="text-sm text-text-muted mb-4">
          Sign out on this device. Your data stays saved.
        </p>
        <button
          type="button"
          onClick={signOut}
          className="h-11 px-5 border border-border text-text rounded-xl text-sm font-semibold hover:bg-bg transition-colors"
        >
          Sign out
        </button>
      </section>
    </div>
  );
}
