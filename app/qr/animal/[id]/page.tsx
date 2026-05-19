import { redirect } from "next/navigation";

import { createClient } from "@/utils/supabase/server";

const PUBLIC_BASE_URL = "https://pawject-patrol.d1bjfxqn6lx7l.amplifyapp.com";

export default async function QrAnimalRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const baseUrl = PUBLIC_BASE_URL;

  // Default: send public scanners to the catalog with the modal opened.
  let destination = `${baseUrl}/catalog?animal_id=${encodeURIComponent(id)}`;

  // If the scanner is an authenticated admin, redirect to the admin animal profile page.
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: admin } = await supabase
        .from("admin")
        .select("auth_id")
        .eq("auth_id", user.id)
        .maybeSingle();

      if (admin) {
        destination = `${baseUrl}/admin/profiles/animal/${encodeURIComponent(id)}`;
      }
    }
  } catch {
    // Best-effort: ignore and use public destination.
  }

  redirect(destination);
}
