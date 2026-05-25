"use server";

import { createClient } from "@/utils/supabase/server";
import { headers } from "next/headers";

// Action to initiate Google OAuth sign-in
export const signInWithGoogle = async () => {
  const supabase = await createClient();

  // Determine origin for redirect; fall back to Host or env when Origin header missing
  const hdrs = await headers();
  const rawOrigin = hdrs.get("origin");
  const host = hdrs.get("host");
  const forwardedProto = hdrs.get("x-forwarded-proto");
  const originUrl = rawOrigin || (host ? `${forwardedProto || "http"}://${host}` : process.env.NEXT_PUBLIC_APP_URL || "");

  if (!originUrl) {
    return { success: false, message: "Unable to determine origin for OAuth redirect. Set NEXT_PUBLIC_APP_URL or ensure Origin/Host headers are present." };
  }

  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        // Use the SSR callback route to exchange the code for a session server-side.
        // IMPORTANT: Add this URL to Supabase Auth Redirect URLs for local dev.
        redirectTo: `${originUrl}/auth/callback?next=/`,
      },
    });

    if (error) return { success: false, message: error.message };

    if (data?.url) {
      // Return the provider URL to the client so the client can navigate directly.
      return { success: true, url: data.url };
    }

    return { success: false, message: "No redirect URL returned from OAuth provider." };
  } catch (e: any) {
    return { success: false, message: e?.message || String(e) };
  }
};