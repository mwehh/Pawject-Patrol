// Server action: create animal profile (temporary implementation)
"use server";

// Import necessary modules
import { createClient } from "@/utils/supabase/server";
import { notifyAllAdmins } from "@/actions/notifications/internal";

function formatChangeValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "empty";
  return String(value);
}

function areComparableValuesEqual(field: string, oldValue: unknown, newValue: unknown): boolean {
  if (field === "date_seen") {
    const oldTime = oldValue ? Date.parse(String(oldValue)) : NaN;
    const newTime = newValue ? Date.parse(String(newValue)) : NaN;
    if (!Number.isNaN(oldTime) && !Number.isNaN(newTime)) return oldTime === newTime;
  }
  return (oldValue ?? null) === (newValue ?? null);
}

function buildStatusChangeMessage(
  entityLabel: string,
  entityName: string | null | undefined,
  oldStatus: string | null,
  newStatus: string | null,
) {
  const namePart = entityName ? `: ${entityName}` : "";
  return `${entityLabel}${namePart} status changed from ${oldStatus ?? "Unknown"} to ${newStatus ?? "Unknown"}.`;
}

function buildAnimalUpdateMessage(animalName: string | null | undefined, before: any, updateData: Record<string, unknown>) {
  const labels: Record<string, string> = {
    animal_name: "name",
    animal_species: "species",
    animal_breed: "breed",
    animal_description: "description",
    animal_status: "status",
    animal_gender: "gender",
    vaccination_status: "vaccination status",
    recorder_name: "recorder",
    animal_theme: "theme",
    date_seen: "date seen",
    area: "area",
    landmark: "landmark",
    road: "road",
    latitude: "latitude",
    longitude: "longitude",
    health_issues: "health issues",
    animal_collar: "collar",
    other_information: "other information",
  };

  const orderedFields = [
    "animal_name",
    "animal_species",
    "animal_breed",
    "animal_description",
    "animal_status",
    "animal_gender",
    "vaccination_status",
    "recorder_name",
    "animal_theme",
    "date_seen",
    "area",
    "landmark",
    "road",
    "latitude",
    "longitude",
    "health_issues",
    "animal_collar",
    "other_information",
  ];

  const changes: string[] = [];
  for (const field of orderedFields) {
    if (!(field in updateData)) continue;
    const oldValue = before?.[field] ?? null;
    const newValue = (updateData as any)[field] ?? null;
    if (areComparableValuesEqual(field, oldValue, newValue)) continue;
    changes.push(`${labels[field]} changed from ${formatChangeValue(oldValue)} to ${formatChangeValue(newValue)}`);
  }

  const namePart = animalName ? `: ${animalName}` : "";
  if (changes.length === 0) return `Animal profile${namePart} was updated.`;
  return `Animal profile${namePart} was updated. ${changes.join("; ")}.`;
}

// Helper: upload a photo (File | base64 | Buffer) and return public URL or null
async function uploadProfilePhoto(
  supabase: any,
  bucketName: string,
  source: File | string | Buffer | null | undefined,
  folder = "animal-reports",
  filenamePrefix?: string | number
): Promise<string | null> {
  if (!source) return null;
  try {
    // If it's a local blob URL, can't fetch on server
    if (typeof source === "string") {
      if (source.startsWith("blob:")) {
        console.warn("Cannot upload local blob URL on server");
        return null;
      }
      if (source.startsWith("data:")) {
        // base64 data URL
        const parts = source.split(",");
        const meta = parts[0];
        const b64 = parts[1];
        const buffer = Buffer.from(b64, "base64");
        const contentType = meta.split(":")[1].split(";")[0] ?? "image/jpeg";
        const prefix = filenamePrefix ? `${filenamePrefix}_` : "";
        const filename = `${folder}/${prefix}${Date.now()}.jpg`;
        const { data: upData, error: upErr } = await supabase.storage
          .from(bucketName)
          .upload(filename, buffer, { contentType, upsert: false });
        if (upErr || !upData) {
          console.error("Storage upload error (base64):", upErr, upData);
          console.error("Upload details (base64):", { bucketName, filename, contentType, bufferSize: buffer.length });
          return null;
        }
        const { data: urlData, error: urlErr } = await supabase.storage
          .from(bucketName)
          .getPublicUrl(filename);
        if (urlErr) {
          console.error("getPublicUrl error:", urlErr, urlData);
          return null;
        }
        return (urlData as any)?.publicUrl ?? null;
      }
      // If it's already a remote URL, return it as-is
      return source;
    }

    // File or Buffer
    const f: any = source as any;
    const originalName = f.name || `${Date.now()}.jpg`;
    const ext = originalName.split(".").pop() || "jpg";
    const prefix = filenamePrefix ? `${filenamePrefix}_` : "";
    const filename = `${folder}/${prefix}${Date.now()}_${originalName}`;
    const { data: upData, error: upErr } = await supabase.storage
      .from(bucketName)
      .upload(filename, f, { upsert: false });
    if (upErr || !upData) {
      console.error("Storage upload error:", upErr, upData);
      console.error("Upload details:", { bucketName, filename, fileSize: (f as any).size || (f as Buffer).length });
      return null;
    }
    const { data: urlData, error: urlErr } = await supabase.storage
      .from(bucketName)
      .getPublicUrl(filename);
    if (urlErr) {
      console.error("getPublicUrl error:", urlErr, urlData);
      return null;
    }
    return (urlData as any)?.publicUrl ?? null;
  } catch (e) {
    console.error("uploadProfilePhoto failed:", e);
    return null;
  }
}

// Report theme type definition
export type ReportTheme = "blue" | "green" | "orange" | "pink";

// Manage animal profiles in the database
type CreateAnimalInput = {
  name?: string;
  species?: string;
  breed?: string;
  description?: string;
  status?: string;
  gender?: string;
  location?: string;
  vaccinationStatus?: string;
  photoUrl?: string;
  dateSeen?: string | null;
  date_seen?: string | null;
  area?: string | null;
  landmark?: string | null;
  road?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  healthIssues?: string | null;
  health_issues?: string | null;
  animalCollar?: string | null;
  animal_collar?: string | null;
  otherInformation?: string | null;
  other_information?: string | null;
  // optional compatibility with snake_case payloads
  animal_name?: string;
  animal_species?: string;
  animal_breed?: string;
  animal_description?: string;
  animal_status?: string;
  animal_gender?: string;
  vaccination_status?: string;
  photo?: File | string;
  // support animal_type from the form
  animal_type?: string;
  animalType?: string;
  // new fields
  recorderName?: string;
  recorder_name?: string;
  animalTheme?: string;
  animal_theme?: string;
  [key: string]: any;
};

// Function to update an existing animal profile
type UpdateAnimalInput = {
  id: string;
  name?: string;
  species?: string;
  breed?: string;
  description?: string;
  status?: string;
  gender?: string;
  location?: string;
  vaccinationStatus?: string;
  photoUrl?: string;
  dateSeen?: string | null;
  date_seen?: string | null;
  area?: string | null;
  landmark?: string | null;
  road?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  healthIssues?: string | null;
  health_issues?: string | null;
  animalCollar?: string | null;
  animal_collar?: string | null;
  otherInformation?: string | null;
  other_information?: string | null;
  // optional snake_case compatibility
  animal_name?: string;
  animal_species?: string;
  animal_breed?: string;
  animal_description?: string;
  animal_status?: string;
  animal_gender?: string;
  vaccination_status?: string;
  // new fields
  recorderName?: string;
  recorder_name?: string;
  animalTheme?: string;
  animal_theme?: string;
  // support animal_type from the form
  animal_type?: string;
  animalType?: string;
  [key: string]: any;
};

// Function to create a new animal profile
export async function createAnimalProfile(input: CreateAnimalInput) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const name = (input.name ?? input.animal_name ?? "").toString().trim();
    if (!name) {
      return { success: false, error: "Name is required" };
    }

    // Use Animal Profile Photos bucket for admin uploads
    const bucketName = "Animal Profile Photos";

    const species = ((input.species ?? input.animal_species ?? input.animal_type ?? input.animalType) || "").toString().trim();
    const breed = ((input.breed ?? input.animal_breed) || "").toString().trim();
    const description = ((input.description ?? input.animal_description) || "").toString().trim();
    let status = ((input.status ?? input.animal_status) || "").toString().trim();
    if (!status) status = "Unknown";
    const gender = ((input.gender ?? input.animal_gender) || "").toString().trim();
    const vaccination = ((input.vaccinationStatus ?? input.vaccination_status) || "").toString().trim();
    let photo = ((input.photo as any) ?? input.photoBase64 ?? input.photoUrl ?? null) as string | null | File;
    if (typeof photo === "string" && photo.startsWith("blob:")) {
      // local blob/object URLs can't be fetched server-side; treat as no photo so upload won't save the blob URL
      console.warn("Ignoring local blob URL for photo; expecting File or base64 instead.");
      photo = null;
    }
    const recorder = (input.recorderName ?? input.recorder_name) ?? null;
    const theme = (input.animalTheme ?? input.animal_theme) ?? null;
    const dateSeenVal = (input.dateSeen ?? input.date_seen) ?? null;
    const areaVal = input.area ?? null;
    const landmarkVal = input.landmark ?? null;
    const roadVal = input.road ?? null;
    const latVal = input.latitude ?? input.lat ?? null;
    const lngVal = input.longitude ?? input.lng ?? null;
    const healthVal = input.healthIssues ?? input.health_issues ?? null;
    const collarVal = input.animalCollar ?? input.animal_collar ?? null;
    const otherVal = input.otherInformation ?? input.other_information ?? null;

    const insertPayload: any = {
      animal_name: name,
      animal_species: species || null,
      animal_breed: breed || null,
      animal_description: description || null,
      animal_status: status || null,
      animal_gender: gender || null,
      vaccination_status: vaccination || null,
      animal_photo: null,
      recorder_name: recorder || null,
      animal_theme: theme || null,
      date_seen: dateSeenVal,
      area: areaVal,
      landmark: landmarkVal,
      road: roadVal,
      latitude: latVal !== null ? Number(latVal as any) : null,
      longitude: lngVal !== null ? Number(lngVal as any) : null,
      health_issues: healthVal,
      animal_collar: collarVal,
      other_information: otherVal,
    };

    // Insert first to obtain an animal_id for filename prefix
    const { data: insertedData, error: insertErr } = await supabase.from("animal").insert(insertPayload).select().single();
    if (insertErr) {
      console.error("Database insert error:", insertErr);
      return { success: false, error: insertErr.message };
    }

    const insertedId = (insertedData as any)?.animal_id;

    // Notify admins (best-effort)
    try {
      if (insertedId) {
        await notifyAllAdmins({
          sender_id: user?.id ?? null,
          event_type: 'animal.created',
          priority: 'normal',
          title: 'New animal profile created',
          message: `A new animal profile was created${name ? `: ${name}` : '.'}`,
          entity_type: 'animal',
          entity_id: String(insertedId),
        });
      }
    } catch (e) {
      console.error('Failed to notify admins (animal.created):', e);
    }

    if (photo) {
      const uploaded = await uploadProfilePhoto(supabase, bucketName, photo, "animal-reports", insertedId ?? undefined);
      if (uploaded) {
        // update the inserted row with the photo URL
        const { error: updErr } = await supabase
          .from("animal")
          .update({ animal_photo: uploaded })
          .eq("animal_id", insertedId);
        if (updErr) console.error("Failed to update animal with photo URL:", updErr);
      }
    }
    return { success: true };
    
  } catch (e: any) {
    return { success: false, error: e?.message || "Unexpected error" };
  }
}

// Function to update an existing animal profile
export async function updateAnimalProfile(input: UpdateAnimalInput) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const name = (input.name ?? input.animal_name ?? "").toString().trim();
    if (!name) {
      return { success: false, error: "Name is required" };
    }

    // Fetch existing values so we can detect status changes
    const { data: existing } = await supabase
      .from("animal")
      .select("animal_name, animal_species, animal_breed, animal_description, animal_status, animal_gender, vaccination_status, recorder_name, animal_theme, date_seen, area, landmark, road, latitude, longitude, health_issues, animal_collar, other_information")
      .eq("animal_id", input.id)
      .maybeSingle();
    const oldStatus = (existing as any)?.animal_status ?? null;
    const bucketName = "Animal Profile Photos";
    const species = ((input.species ?? input.animal_species ?? input.animal_type ?? input.animalType) || "").toString().trim();
    const breed = ((input.breed ?? input.animal_breed) || "").toString().trim();
    const description = ((input.description ?? input.animal_description) || "").toString().trim();
    let status = ((input.status ?? input.animal_status) || "").toString().trim();
    if (!status) status = "Unknown";
    const gender = ((input.gender ?? input.animal_gender) || "").toString().trim();
    const vaccination = ((input.vaccinationStatus ?? input.vaccination_status) || "").toString().trim();
    const recorder = (input.recorderName ?? input.recorder_name) ?? null;
    const theme = (input.animalTheme ?? input.animal_theme) ?? null;

    const updateData: any = {
      animal_name: name,
      animal_species: species || null,
      animal_breed: breed || null,
      animal_description: description || null,
      animal_status: status || null,
      animal_gender: gender || null,
      vaccination_status: vaccination || null,
      recorder_name: recorder || null,
      animal_theme: theme || null,
      date_seen: (input.dateSeen ?? input.date_seen) ?? null,
      area: input.area ?? null,
      landmark: input.landmark ?? null,
      road: input.road ?? null,
      latitude: (input.latitude ?? input.lat ?? null) !== null ? Number((input.latitude ?? input.lat ?? null) as any) : null,
      longitude: (input.longitude ?? input.lng ?? null) !== null ? Number((input.longitude ?? input.lng ?? null) as any) : null,
      health_issues: (input.healthIssues ?? input.health_issues) ?? null,
      animal_collar: (input.animalCollar ?? input.animal_collar) ?? null,
      other_information: (input.otherInformation ?? input.other_information) ?? null,
    };
    // Handle photo upload for updates as well
    // Prefer an actual File or base64 payload over a preview URL; ignore local blob: URLs
    let photoVal = ((input as any).photo ?? (input as any).photoBase64 ?? input.photoUrl ?? null) as string | null | File | undefined;
    if (photoVal && typeof photoVal === "string" && photoVal.startsWith("blob:")) {
      photoVal = null;
    }
    if (photoVal) {
      const uploaded = await uploadProfilePhoto(supabase, bucketName, photoVal, "animal-reports", input.id);
      if (uploaded) updateData.animal_photo = uploaded;
    }
    const { data, error } = await supabase
      .from("animal")
      .update(updateData)
      .eq("animal_id", input.id)
      .select();
    if (error) {
      console.error("Database update error:", error);
      return { success: false, error: error.message };
    }

    const newStatus = status || null;
    const statusChanged = (oldStatus ?? null) !== (newStatus ?? null);

    // Notify admins (best-effort)
    try {
      if (statusChanged) {
        await notifyAllAdmins({
          sender_id: user?.id ?? null,
          event_type: 'animal.status_changed',
          priority: 'high',
          title: 'Animal status changed',
          message: buildAnimalUpdateMessage(name, existing, updateData),
          entity_type: 'animal',
          entity_id: String(input.id),
        });
      } else {
        await notifyAllAdmins({
          sender_id: user?.id ?? null,
          event_type: 'animal.updated',
          priority: 'normal',
          title: 'Animal profile updated',
          message: buildAnimalUpdateMessage(name, existing, updateData),
          entity_type: 'animal',
          entity_id: String(input.id),
        });
      }
    } catch (e) {
      console.error('Failed to notify admins (animal update notifications):', e);
    }

    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message || "Unexpected error" };
  }
}

// Function to delete an animal profile by ID
export async function deleteAnimalProfile(id: string) {
  try {
    // Create Supabase client with proper auth context
    const supabase = await createClient();

    // Capture name (best-effort) for notification message
    const { data: before } = await supabase
      .from("animal")
      .select("animal_name")
      .eq("animal_id", id)
      .maybeSingle();
    const animalName = (before as any)?.animal_name ?? null;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Delete the animal profile from the database
    const { error } = await supabase
      .from("animal")
      .delete()
      .eq("animal_id", id);

    // Handle potential errors
    if (error) {
      console.error("Database delete error:", error);
      return { success: false, error: error.message };
    }

    // Notify admins (best-effort)
    try {
      await notifyAllAdmins({
        sender_id: user?.id ?? null,
        event_type: 'animal.deleted',
        priority: 'normal',
        title: 'Animal profile deleted',
        message: `An animal profile was deleted${animalName ? `: ${animalName}` : '.'}`,
        entity_type: 'animal',
        entity_id: String(id),
      });
    } catch (e) {
      console.error('Failed to notify admins (animal.deleted):', e);
    }
    
    return { success: true };
  } catch (e: any) {
    // Handle unexpected errors
    return { success: false, error: e?.message || "Unexpected error" };
  }
}
