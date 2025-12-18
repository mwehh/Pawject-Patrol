import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser();
  // Allow OAuth callback requests (they include code or access_token in the query)
  // to pass through so the client page can finish processing the session.
  const search = request.nextUrl.search;

  if (!user) {
    if (search.includes("code=") || search.includes("access_token=")) {
      // Let the request continue so the client can call getSessionFromUrl.
      return supabaseResponse;
    }

    // Redirect non-logged-in users trying to access /admin to /admin/login
    if (request.nextUrl.pathname.startsWith("/admin") && !request.nextUrl.pathname.startsWith("/admin/login")) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      return NextResponse.redirect(url);
    }

    // Redirect non-logged-in users trying to access user pages to /login
    if (request.nextUrl.pathname.startsWith("/form") && !request.nextUrl.pathname.startsWith("/login")) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }

    // Allow public pages to pass through (including the root path).
    // Avoid redirecting the root path to itself which causes an infinite
    // redirect loop when there's no user.
    if (
      !request.nextUrl.pathname.startsWith("/login") &&
      !request.nextUrl.pathname.startsWith("/auth") &&
      !request.nextUrl.pathname.startsWith("/admin/login") &&
      !request.nextUrl.pathname.startsWith("/catalog") &&
      request.nextUrl.pathname !== "/" &&
      request.nextUrl.pathname !== "/about-us"
    ) {
      // no user, potentially respond by redirecting the user to the home page
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
  }

  if (
    user &&
    (request.nextUrl.pathname.startsWith("/login"))
  ) {
    // user is logged in, potentially respond by redirecting the user to the home page
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  const { data: isAdmin } = await supabase
    .from("admin")
    .select("auth_id")
    .eq("auth_id", user?.id)
    .single();

  if (user && !isAdmin && request.nextUrl.pathname.startsWith("/admin")) {
    // user is logged in, potentially respond by redirecting the user to the home page
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }
  // If user is logged in and on /admin/login without an error, redirect to /admin.
  // Allow staying on /admin/login when there's an error query (e.g., unauthorized, server_misconfig)
  // if (user && request.nextUrl.pathname === "/admin/login") {
  //   const hasError = request.nextUrl.searchParams.has("error");
  //   if (!hasError) {
  //     const url = request.nextUrl.clone();
  //     url.pathname = "/admin";
  //     return NextResponse.redirect(url);
  //   }
    // pass through to show the error on the login page
  //   return supabaseResponse;
  // }

  // IMPORTANT: You *must* return the supabaseResponse object as it is. If you're
  // creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

  return supabaseResponse;
}
