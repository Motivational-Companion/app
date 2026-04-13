"use client";

import { useRouter } from "next/navigation";
import AuthGate from "@/components/AuthGate";

/**
 * Sign-in page for returning users. Uses AuthGate in its "signin" variant
 * (magic link + 6-digit OTP, no password). On success, routes to /chat.
 *
 * Cold ad traffic enters via /, goes through the quiz and checkout, and
 * lands on /success for account creation. Returning users bypass all
 * of that — they come here directly.
 */
export default function SignInPage() {
  const router = useRouter();

  return (
    <AuthGate
      onAuthenticated={() => router.push("/chat")}
      variant="signin"
    />
  );
}
