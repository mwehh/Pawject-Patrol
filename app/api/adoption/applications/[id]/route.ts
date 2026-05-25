import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/server";
import { notifyAllAdmins, notifyUser } from "@/actions/notifications/internal";
import {
  getAdminSmsNumbersFromEnv,
  publishAdminAdoptionApplicationStatusChangedExternal,
  sendSmsExternal,
} from "@/utils/aws/sns";

export const runtime = "nodejs";

type PatchBody = {
  status?: string | null;
};

function json(status: number, body: unknown) {
  return NextResponse.json(body, { status });
}

function getServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    },
  );
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const applicationId = String(params.id || "").trim();
    if (!applicationId) return json(400, { ok: false, error: "Missing application id in path" });

    let body: PatchBody;
    try {
      body = (await request.json()) as PatchBody;
    } catch {
      return json(400, { ok: false, error: "Invalid JSON body" });
    }

    const status = body.status?.trim();
    if (status !== "Accepted" && status !== "Rejected") {
      return json(400, { ok: false, error: "`status` must be `Accepted` or `Rejected`" });
    }

    const authClient = await createClient();
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) return json(401, { ok: false, error: "Unauthorized" });

    const supabase = getServiceClient();

    const { data: admin, error: adminError } = await supabase
      .from("admin")
      .select("auth_id")
      .eq("auth_id", user.id)
      .maybeSingle();

    if (adminError || !admin) return json(403, { ok: false, error: "Not authorized" });

    const { data: application, error: fetchError } = await supabase
      .from("adoption_applications")
      .select("id, animal_id, applicant_name, applicant_email, status")
      .eq("id", applicationId)
      .maybeSingle();

    if (fetchError) return json(400, { ok: false, error: fetchError.message });
    if (!application) return json(404, { ok: false, error: "Application not found" });

    const { data: animalRow } = await supabase
      .from("animal")
      .select("animal_name")
      .eq("animal_id", application.animal_id)
      .maybeSingle();

    const animalName = animalRow?.animal_name?.trim() || null;
    const animalLabel = animalName || `Animal ${application.animal_id}`;

    const oldStatus = application.status ?? null;

    const { error: updateError } = await supabase
      .from("adoption_applications")
      .update({ status, reviewed_at: new Date().toISOString() })
      .eq("id", applicationId);

    if (updateError) return json(400, { ok: false, error: updateError.message });

    if (status === "Accepted") {
      const { error: animalError } = await supabase
        .from("animal")
        .update({ animal_status: "Adopted" })
        .eq("animal_id", application.animal_id);

      if (animalError) return json(400, { ok: false, error: animalError.message });
    }

    try {
      const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
      let applicantUserId: string | null = null;

      if (!usersError) {
        const normalizedEmail = application.applicant_email?.trim().toLowerCase();
        const matchedUser = (usersData?.users ?? []).find(
          (candidate: { id: string; email?: string | null }) => candidate.email?.trim().toLowerCase() === normalizedEmail,
        );
        applicantUserId = matchedUser?.id ?? null;
      }

      if (applicantUserId) {
        await notifyUser(applicantUserId, {
          sender_id: user.id,
          event_type: "adoption_application.status_changed",
          priority: "high",
          title: "Adoption application status changed",
          message: `Your adoption application for ${animalLabel} changed from ${oldStatus ?? "Pending"} to ${status}.`,
          entity_type: "adoption_application",
          entity_id: applicationId,
        });
      }

      await notifyAllAdmins({
        sender_id: user.id,
        event_type: "adoption_application.status_changed",
        priority: "high",
        title: "Adoption application status changed",
        message: `${application.applicant_name ?? "An adoption application"} status changed for ${animalLabel} from ${oldStatus ?? "Pending"} to ${status}.`,
        entity_type: "adoption_application",
        entity_id: applicationId,
      });

      await publishAdminAdoptionApplicationStatusChangedExternal({
        applicationId,
        animalId: String(application.animal_id),
        animalName,
        applicantName: application.applicant_name ?? null,
        oldStatus,
        newStatus: status,
      });

      const adminSmsNumbers = getAdminSmsNumbersFromEnv();
      for (const phoneNumber of adminSmsNumbers) {
        await sendSmsExternal({
          phoneNumber,
          message: `Pawject Patrol: Adoption application status changed${application.applicant_name ? ` for ${application.applicant_name}` : ""}. ${animalLabel}. ${oldStatus ?? "Pending"} -> ${status}. Application ID: ${applicationId}`,
        });
      }
    } catch (notificationError) {
      console.error("Failed to send adoption status notifications:", notificationError);
    }

    return json(200, { ok: true, id: applicationId, status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return json(500, { ok: false, error: message });
  }
}
