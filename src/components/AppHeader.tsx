"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/supabase/useAuth";

type Props = {
  variant?: "landing" | "app";
};

export default function AppHeader({ variant = "app" }: Props) {
  const { user, supabase } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [menuOpen]);

  const handleSignOut = async () => {
    if (supabase) await supabase.auth.signOut();
    window.location.href = "/";
  };

  const emailInitial = user?.email?.[0]?.toUpperCase() ?? "?";
  const maskedEmail = (() => {
    const email = user?.email;
    if (!email) return "";
    const [local, domain] = email.split("@");
    if (!domain) return "Signed in";
    const visible = local.slice(0, 1);
    return `${visible}${"*".repeat(Math.max(3, local.length - 1))}@${domain}`;
  })();

  return (
    <header
      className={
        variant === "landing"
          ? "w-full bg-bg/80 backdrop-blur border-b border-border/60 sticky top-0 z-30"
          : "w-full bg-card border-b border-border sticky top-0 z-30"
      }
    >
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 h-14 md:h-16 flex items-center justify-between">
        <Link href={user ? "/chat" : "/"} className="flex items-center gap-2.5 group">
          <span className="w-8 h-8 rounded-full bg-gradient-to-br from-accent to-primary flex items-center justify-center">
            <span className="text-white text-sm font-semibold">MC</span>
          </span>
          <span className="font-display text-base font-semibold text-text hidden sm:inline">
            Motivation Companion
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          {user ? (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="h-9 w-9 rounded-full bg-accent-soft text-primary text-sm font-semibold flex items-center justify-center hover:bg-accent-soft/70 transition-colors"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                aria-label="Account menu"
              >
                {emailInitial}
              </button>
              {menuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-56 bg-card border border-border rounded-2xl shadow-lg py-1.5 overflow-hidden"
                >
                  <div className="px-3 py-2 border-b border-border mb-1">
                    <p className="text-xs text-text-muted">Signed in as</p>
                    <p className="text-sm text-text truncate">{maskedEmail}</p>
                  </div>
                  <Link
                    href="/account"
                    onClick={() => setMenuOpen(false)}
                    className="block px-3 py-2 text-sm text-text hover:bg-bg transition-colors"
                    role="menuitem"
                  >
                    Account settings
                  </Link>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="block w-full text-left px-3 py-2 text-sm text-text hover:bg-bg transition-colors"
                    role="menuitem"
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/signin"
              className="text-sm font-medium text-primary hover:text-primary-dark transition-colors px-3 py-2"
            >
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
