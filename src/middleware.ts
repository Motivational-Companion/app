import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isProtectedRoute } from "@/lib/routes";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // If Supabase is not configured, allow all requests (pre-setup)
  if (!supabaseUrl || !supabaseAnonKey) {
    return supabaseResponse;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // Refresh the session (important for Server Components)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isProtected = isProtectedRoute(pathname);
  // Routes we send already-authed users away FROM. Avoids the "authed user
  // sees marketing or signin page" footgun. Keep the list tight — only
  // surfaces where an authed user should clearly be redirected into the app.
  const redirectAwayFromIfAuthed =
    pathname === "/" || pathname === "/signin";

  // Only query the profile when we actually need the subscription status
  // — saves one roundtrip on most requests.
  const needsSubscriptionCheck =
    isProtected || (redirectAwayFromIfAuthed && user);

  let subscriptionStatus: string | null = null;
  if (needsSubscriptionCheck && user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("subscription_status")
      .eq("id", user.id)
      .single();
    subscriptionStatus = profile?.subscription_status ?? null;
  }

  const hasActiveSubscription =
    subscriptionStatus === "active" || subscriptionStatus === "trialing";

  // Protected routes (e.g. /chat): require auth AND active subscription.
  if (isProtected) {
    if (!user || !hasActiveSubscription) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  // Marketing and signin pages: if the user is already paid + authed, send
  // them straight into the app instead of the funnel / sign-in form.
  if (redirectAwayFromIfAuthed && user && hasActiveSubscription) {
    return NextResponse.redirect(new URL("/chat", request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    // Match all request paths except static files and images
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
