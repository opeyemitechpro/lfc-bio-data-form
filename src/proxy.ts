import { NextResponse, type NextRequest } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/clients";

/**
 * Request proxy.
 *
 * Next.js 16 renamed the `middleware` convention to `proxy`. It refreshes
 * the Supabase auth session on every request so that server components
 * always see a valid session, and it keeps unauthenticated visitors out of
 * the dashboard.
 */
export async function proxy(request: NextRequest) {
  const response = NextResponse.next({ request });

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  const isDashboard = pathname.startsWith("/dashboard");
  const isAccountArea =
    pathname.startsWith("/account/change-password") ||
    pathname.startsWith("/account/reset-password");
  const isLogin = pathname === "/login";

  // Signed-in users should not see the login page.
  if (user && isLogin && !isAccountArea) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // Unauthenticated visitors cannot reach the dashboard.
  if (!user && isDashboard) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/login",
    "/account/:path*",
  ],
};
