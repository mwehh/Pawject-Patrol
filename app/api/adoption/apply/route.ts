import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/server";
import { notifyAllAdmins } from "@/actions/notifications/internal";
import { notifyUser } from "@/actions/notifications/internal";
import {
  getAdminSmsNumbersFromEnv,
  publishAdminAdoptionApplicationSubmittedExternal,
  sendSmsExternal,
} from "@/utils/aws/sns";

export const runtime = "nodejs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const animalId = body?.animal_id;
    if (animalId === null || animalId === undefined || String(animalId).trim() === "") {
      return NextResponse.json({ message: "Missing animal_id" }, { status: 400 });
    }

    const supabase = createSupabaseClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const authClient = await createClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();
    const senderId = user?.id ?? null;

    const { data: animalRow } = await supabase
      .from("animal")
      .select("animal_name, animal_status")
      .eq("animal_id", animalId)
      .maybeSingle();

    if (!animalRow) {
      return NextResponse.json({ message: "Animal not found" }, { status: 404 });
    }

    const animalStatus = (animalRow as any)?.animal_status?.toString().trim() || null;
    const normalizedStatus = animalStatus?.toLowerCase() ?? null;

    if (normalizedStatus !== "available for adoption") {
      if (normalizedStatus === "adopted") {
        return NextResponse.json({ message: "This animal has already been adopted" }, { status: 409 });
      }
      return NextResponse.json(
        {
          message: "This animal is not available for adoption",
          animal_status: animalStatus,
        },
        { status: 409 },
      );
    }

    const animalName = animalRow?.animal_name?.trim() || null;
    const animalLabel = animalName || `Animal ${animalId}`;

    const insert = {
      animal_id: animalId,
      applicant_name: body.applicant_name,
      applicant_email: body.applicant_email,
      applicant_phone: body.applicant_phone,
      applicant_address: body.applicant_address ?? null,
      housing_type: body.housing_type ?? null,
      pet_experience: body.pet_experience ?? null,
      reason: body.reason ?? body.why_adopt ?? null,
      status: "Pending",
    };

    const { data: inserted, error } = await supabase
      .from("adoption_applications")
      .insert([insert])
      .select("id")
      .single();

    if (error) {
      console.error("adoption apply insert error", error);
      return NextResponse.json({ message: "Failed to save application" }, { status: 500 });
    }

    try {
      const applicationId = String(inserted.id);
      const applicantName = body.applicant_name ?? null;

      try {
        if (user) {
          await notifyUser(user.id, {
            sender_id: senderId,
            event_type: "adoption_application.created",
            priority: "high",
            title: "Adoption application submitted",
            message: `Your adoption application for ${animalLabel} was submitted successfully.`,
            entity_type: "adoption_application",
            entity_id: applicationId,
          });
        }
      } catch (userNotificationError) {
        console.error("Failed to send adoption submit user notification:", userNotificationError);
      }

      await notifyAllAdmins({
        sender_id: senderId,
        event_type: "adoption_application.created",
        priority: "high",
        title: "New adoption application submitted",
        message: `${applicantName ? `${applicantName} submitted` : "A user submitted"} an adoption application for ${animalLabel}.`,
        entity_type: "adoption_application",
        entity_id: applicationId,
      });

      await publishAdminAdoptionApplicationSubmittedExternal({
        applicationId,
        animalId: String(animalId),
        animalName,
        applicantName,
      });

      const adminSmsNumbers = getAdminSmsNumbersFromEnv();
      for (const phoneNumber of adminSmsNumbers) {
        await sendSmsExternal({
          phoneNumber,
          message: `Pawject Patrol: New adoption application submitted${applicantName ? ` by ${applicantName}` : ""}. ${animalLabel}. Application ID: ${applicationId}`,
        });
      }
    } catch (notificationError) {
      console.error("Failed to send adoption submitted notifications:", notificationError);
    }

    return NextResponse.json({ message: "Application submitted" });
  } catch (err) {
    console.error("apply route error", err);
    return NextResponse.json({ message: "Failed to submit application" }, { status: 500 });
  }
}
