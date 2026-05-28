import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/server";
import { notifyAllAdmins, notifyUser } from "@/actions/notifications/internal";
import {
  getAdminSmsNumbersFromEnv,
  publishAdminAdoptionApplicationStatusChangedExternal,
  publishUserAdoptionApplicationStatusChangedExternal,
  sendSmsExternal,
} from "@/utils/aws/sns";

export const runtime = "nodejs";

type PatchBody = {
  status?: string | null;
  notes?: string | null;
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

async function resolveApplicantUserId(params: {
  supabase: ReturnType<typeof getServiceClient>;
  applicationId: string;
  applicantEmail?: string | null;
}): Promise<string | null> {
  const tableName = process.env.NOTIFICATION_TABLE_NAME || "notifications";

  // 1) Prefer mapping from the original submission notification (reliable when user was logged in).
  try {
    const { data } = await params.supabase
      .from(tableName)
      .select("recipient_id")
      .eq("entity_type", "adoption_application")
      .eq("entity_id", params.applicationId)
      .eq("event_type", "adoption_application.created")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    const recipientId = (data as any)?.recipient_id;
    if (typeof recipientId === "string" && recipientId.trim()) return recipientId.trim();
  } catch {
    // Ignore and fall back.
  }

  // 2) Fallback: match applicant email to auth.users (can fail if they entered a different email).
  const normalizedEmail = params.applicantEmail?.trim().toLowerCase();
  if (!normalizedEmail) return null;

  try {
    const perPage = 1000;
    for (let page = 1; page <= 20; page += 1) {
      const { data: usersData, error } = await params.supabase.auth.admin.listUsers({ page, perPage });
      if (error) break;
      const users = usersData?.users ?? [];

      const matched = users.find(
        (candidate: { id: string; email?: string | null }) => candidate.email?.trim().toLowerCase() === normalizedEmail,
      );
      if (matched?.id) return matched.id;

      if (users.length < perPage) break;
    }
  } catch {
    // Ignore.
  }

  return null;
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const applicationId = String(resolvedParams?.id || "").trim();
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

    const notesRaw = body.notes;
    const notes = typeof notesRaw === "string" ? notesRaw.trim() : null;
    if (notes && notes.length > 2000) {
      return json(400, { ok: false, error: "`notes` is too long (max 2000 chars)" });
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
      .select("id, animal_id, applicant_name, applicant_email, applicant_phone, status")
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

    const reviewedAt = new Date().toISOString();
    const updatePayload: Record<string, unknown> = {
      status,
      reviewed_at: reviewedAt,
    };

    if (notesRaw !== undefined) {
      updatePayload.notes = notes || null;
    }

    const { error: updateError } = await supabase
      .from("adoption_applications")
      .update(updatePayload)
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
      const applicantUserId = await resolveApplicantUserId({
		supabase,
		applicationId,
		applicantEmail: application.applicant_email,
	});

      const notesLine = notes ? `\n\nAdmin notes: ${notes}` : "";

      if (applicantUserId) {
        await notifyUser(applicantUserId, {
          sender_id: user.id,
          event_type: "adoption_application.status_changed",
          priority: "high",
          title: "Adoption application status changed",
          message: `Your adoption application for ${animalLabel} changed from ${oldStatus ?? "Pending"} to ${status}.${notesLine}`,
          entity_type: "adoption_application",
          entity_id: applicationId,
        });

        await publishUserAdoptionApplicationStatusChangedExternal({
			recipientId: applicantUserId,
			applicationId,
			animalId: String(application.animal_id),
			animalName,
			oldStatus,
			newStatus: status,
			notes,
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

    return json(200, { ok: true, id: applicationId, status, reviewed_at: reviewedAt, notes: updatePayload.notes ?? null });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return json(500, { ok: false, error: message });
  }
}
