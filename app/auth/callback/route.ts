import { NextResponse } from "next/server";
// The client you created from the Server-Side Auth instructions
import { createClient } from "@/utils/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // if "next" is in param, use it as the redirect URL
  const next = searchParams.get("next") ?? "/";
  const forwardedHost = request.headers.get("x-forwarded-host"); // original origin before load balancer
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";
  const appOrigin = forwardedHost ? `${forwardedProto}://${forwardedHost}` : origin;
  const loginErrorUrl = `${appOrigin}/login?error=${encodeURIComponent("Please use your UP email account to sign in.")}`;

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();
      const emailDomain = user?.email?.split("@")[1]?.toLowerCase() ?? "";

      if (!user || emailDomain !== "up.edu.ph") {
        await supabase.auth.signOut();
        return NextResponse.redirect(loginErrorUrl);
      }

      const isLocalEnv = process.env.NODE_ENV === "development";
      if (isLocalEnv) {
        // we can be sure that there is no load balancer in between, so no need to watch for X-Forwarded-Host
        return NextResponse.redirect(`${origin}${next}`);
      } else if (forwardedHost) {
        return NextResponse.redirect(`${appOrigin}${next}`);
      } else {
        return NextResponse.redirect(`${appOrigin}${next}`);
      }
    }
  }

  // return the user to an error page with instructions
  // this is a generic error page, you can customize it or remove it
  // if you want to handle the error in a different way
  return NextResponse.redirect(`${appOrigin}/auth/auth-code-error`);
}
