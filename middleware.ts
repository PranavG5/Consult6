import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  // If Supabase sends the OAuth/magic-link code to any page other than
  // /auth/callback, redirect it there so the session can be exchanged.
  const code = request.nextUrl.searchParams.get("code");
  if (code && !request.nextUrl.pathname.startsWith("/auth/callback")) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/callback";
    url.searchParams.set("code", code);
    return NextResponse.redirect(url);
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Never let a slow/unreachable Supabase Auth call hang the request long
  // enough to trip Vercel's MIDDLEWARE_INVOCATION_TIMEOUT (which would 504 the
  // whole site, including public pages). Fail open by treating the visitor as
  // logged-out if the auth lookup doesn't resolve quickly.
  const user = await Promise.race([
    supabase.auth
      .getUser()
      .then(({ data }) => data.user)
      .catch(() => null),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000)),
  ]);

  const isAuthPage = request.nextUrl.pathname.startsWith("/auth");
  const isApiPage = request.nextUrl.pathname.startsWith("/api");
  const isLandingPage = request.nextUrl.pathname === "/";
  const isGuestPage = request.nextUrl.pathname.startsWith("/try");
  const isPublicInfoPage = ["/about", "/privacy", "/terms", "/contact"].includes(request.nextUrl.pathname);

  if (!user && !isAuthPage && !isApiPage && !isLandingPage && !isGuestPage && !isPublicInfoPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    return NextResponse.redirect(url);
  }

  // Password-recovery sessions count as logged in, so /auth/update-password
  // must stay reachable for authenticated users.
  const isUpdatePasswordPage = request.nextUrl.pathname.startsWith("/auth/update-password");
  if (user && (isAuthPage || isLandingPage) && !isUpdatePasswordPage) {
    const url = request.nextUrl.clone();
    // Respect a safe ?next= destination (e.g. password-recovery flows)
    // so the user lands there rather than the dashboard.
    const next = request.nextUrl.searchParams.get("next");
    url.search = "";
    if (next && next.startsWith("/") && !next.startsWith("//")) {
      url.pathname = next;
    } else {
      url.pathname = "/dashboard";
    }
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|ads\\.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
