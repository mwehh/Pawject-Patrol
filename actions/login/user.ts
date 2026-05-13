"use server";

import { createClient } from "@/utils/supabase/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

// Action to initiate Google OAuth sign-in
export const signInWithGoogle = async () => {
  const supabase = await createClient();

  // Get the origin URL from request headers
  const originUrl = (await headers()).get("origin");

  // Initiate sign-in with Google OAuth provider
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      // Use the SSR callback route to exchange the code for a session server-side.
      // IMPORTANT: Add this URL to Supabase Auth Redirect URLs for local dev.
      redirectTo: `${originUrl}/auth/callback?next=/`,
    },
  });

  // Handle potential error during sign-in
  if (error) {
    return { success: false, message: error.message };
  }

  // Redirect to the OAuth provider's URL
  if (data.url) {
    redirect(data.url);
  }
};