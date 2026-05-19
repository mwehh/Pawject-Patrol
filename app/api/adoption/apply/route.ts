import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const supabase = createSupabaseClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const insert = {
      animal_id: body.animal_id,
      applicant_name: body.applicant_name,
      applicant_email: body.applicant_email,
      applicant_phone: body.applicant_phone,
      applicant_address: body.applicant_address ?? null,
      housing_type: body.housing_type ?? null,
      pet_experience: body.pet_experience ?? null,
      reason: body.reason ?? body.why_adopt ?? null,
      status: "Pending",
    };

    const { error } = await supabase.from("adoption_applications").insert([insert]);

    if (error) {
      console.error("adoption apply insert error", error);
      return NextResponse.json({ message: "Failed to save application" }, { status: 500 });
    }

    return NextResponse.json({ message: "Application submitted" });
  } catch (err) {
    console.error("apply route error", err);
    return NextResponse.json({ message: "Failed to submit application" }, { status: 500 });
  }
}
