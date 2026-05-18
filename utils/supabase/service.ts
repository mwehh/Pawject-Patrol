import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export function createServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL not configured"
    );
  }

  return createSupabaseClient(supabaseUrl, serviceRoleKey);
}

export async function getUserEmailById(
  userId: string
): Promise<string | null> {
  if (!userId) return null;

  try {
    const serviceClient = createServiceClient();
    const { data, error } = await serviceClient.auth.admin.getUserById(userId);
    if (error) {
      // eslint-disable-next-line no-console
      console.error("[supabase-service] getUserById error:", error);
      return null;
    }
    return data.user?.email ?? null;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("[supabase-service] getUserEmailById exception:", e);
    return null;
  }
}
