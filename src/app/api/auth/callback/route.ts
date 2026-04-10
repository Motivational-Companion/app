import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Default landing page after a successful magic link exchange. Can be
// overridden by passing `?next=/some/path` in the redirect URL. Must be
// a same-origin relative path to avoid open redirects.
export const DEFAULT_NEXT = "/chat";

export function safeNextPath(raw: string | null): string {
  if (!raw) return DEFAULT_NEXT;
  // Only accept same-origin relative paths (no protocol, no double slash).
  if (raw.startsWith("/") && !raw.startsWith("//")) return raw;
  return DEFAULT_NEXT;
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));

  if (code) {
    const response = NextResponse.redirect(`${origin}${next}`);

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return response;
    }
  }

  // Auth code exchange failed — redirect to marketing landing
  return NextResponse.redirect(`${origin}/`);
}
