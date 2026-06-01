// Server-side code for managing volunteer calls in the admin interface
"use server";

// Server action to uncomplete a volunteer call by updating status to Active
export async function uncompleteAction(formData: FormData): Promise<void> {
  try {
    const id = String(formData.get("id") || "");
    if (!id) {
      console.error("uncompleteAction missing id");
      return;
    }
    const supabase = await getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    const { data: before } = await supabase
      .from("volunteer_call")
      .select("call_status, call_title")
      .eq("call_id", id)
      .maybeSingle();
    const oldStatus = (before as any)?.call_status ?? null;
    const callTitle = (before as any)?.call_title ?? null;

    // Use service client to bypass RLS for status update
    const serviceClient = getServiceClient();
    const { error } = await serviceClient
      .from("volunteer_call")
      .update({ call_status: "Active" })
      .eq("call_id", id);
    if (error) {
      console.error("uncompleteAction error:", error);
    } else {
      try {
        const newStatus = 'Active';
        if ((oldStatus ?? null) !== newStatus) {
          await notifyAllAdmins({
            sender_id: user?.id ?? null,
            event_type: 'volunteer_call.status_changed',
            priority: 'high',
            title: 'Volunteer call status changed',
            message: buildStatusChangeMessage('Volunteer call', callTitle, oldStatus, newStatus),
            entity_type: 'volunteer_call',
            entity_id: String(id),
          });
        }
      } catch (e) {
        console.error('Failed to notify admins (volunteer_call.status_changed):', e);
      }
      try {
        revalidatePath('/admin/volunteer');
        revalidatePath(`/admin/volunteer/${id}`);
      } catch (_) {}
    }
    redirect(`/admin/volunteer/${id}`);
  } catch (e: any) {
    if (e && typeof e === 'object' && (String((e as any).digest || '').startsWith('NEXT_REDIRECT') || String((e as any).message || '').includes('NEXT_REDIRECT'))) {
      throw e;
    }
    console.error(e?.message || "Unexpected error");
    return;
  }
}

// Import necessary modules
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { notifyAllAdmins, notifyUsers } from "@/actions/notifications/internal";

// Define the VolunteerCall type
type VolunteerCall = {
  call_id?: string;
  call_title?: string | null;
  call_details?: string | null;
  call_starttime?: string | null;
  call_endtime?: string | null;
  call_location?: string | null;
  capacity?: number | null;
  call_status?: string | null;
  created_at?: string | null;
};

function getServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL not configured",
    );
  }

  return createSupabaseClient(supabaseUrl, serviceRoleKey);
}

function formatChangeValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "empty";
  return String(value);
}

function areComparableValuesEqual(field: string, oldValue: unknown, newValue: unknown): boolean {
  if (field === "call_starttime" || field === "call_endtime") {
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

function buildVolunteerUpdateMessage(
  callTitle: string | null | undefined,
  before: any,
  updateData: Record<string, unknown>,
) {
  const labels: Record<string, string> = {
    call_title: "title",
    call_details: "details",
    call_location: "location",
    call_starttime: "start time",
    call_endtime: "end time",
    capacity: "capacity",
    call_status: "status",
  };
  const orderedFields = [
    "call_title",
    "call_details",
    "call_location",
    "call_starttime",
    "call_endtime",
    "capacity",
    "call_status",
  ];

  const changes: string[] = [];
  for (const field of orderedFields) {
    if (!(field in updateData)) continue;
    const oldValue = before?.[field] ?? null;
    const newValue = (updateData as any)[field] ?? null;
    if (areComparableValuesEqual(field, oldValue, newValue)) continue;
    changes.push(
      `${labels[field]} changed from ${formatChangeValue(oldValue)} to ${formatChangeValue(newValue)}`,
    );
  }

  const titlePart = callTitle ? `: ${callTitle}` : "";
  if (changes.length === 0) return `Volunteer call${titlePart} was updated.`;
  return `Volunteer call${titlePart} was updated. ${changes.join("; ")}.`;
}

type VolunteerReminderWindow = {
  eventType: string;
  title: string;
  message: (callTitle: string | null | undefined) => string;
  minAge: number;
  maxAge: number;
};

const VOLUNTEER_REMINDER_WINDOWS: VolunteerReminderWindow[] = [
  {
    eventType: 'volunteer_call.upcoming_reminder',
    title: 'Upcoming volunteer call',
    message: (callTitle) => `Reminder: "${callTitle || 'Volunteer call'}" starts in about 24 hours.`,
    minAge: 15 * 60 * 1000,
    maxAge: 24 * 60 * 60 * 1000,
  },
  {
    eventType: 'volunteer_call.starting_soon',
    title: 'Volunteer call starts soon',
    message: (callTitle) => `Reminder: "${callTitle || 'Volunteer call'}" starts in about 15 minutes.`,
    minAge: 0,
    maxAge: 15 * 60 * 1000,
  },
];

async function getAdminRecipientIds(): Promise<string[]> {
  try {
    const serviceClient = getServiceClient();
    const { data, error } = await serviceClient
      .from('admin')
      .select('auth_id')
      .not('auth_id', 'is', null);

    if (error) {
      console.error('[getAdminRecipientIds] error:', error);
      return [];
    }

    return (data || [])
      .map((row: { auth_id: string | null }) => row.auth_id)
      .filter((authId): authId is string => Boolean(authId));
  } catch (e) {
    console.error('[getAdminRecipientIds] exception:', e);
    return [];
  }
}

async function notifyRecipientsIfMissing(
  recipientIds: string[],
  input: {
    sender_id?: string | null;
    event_type: string;
    priority?: string | null;
    title: string;
    message: string;
    entity_type: string;
    entity_id: string;
  },
) {
  if (recipientIds.length === 0) {
    return 0;
  }

  const table = process.env.NOTIFICATION_TABLE_NAME || 'notifications';
  const serviceClient = getServiceClient();

  const { data: existing, error } = await serviceClient
    .from(table)
    .select('recipient_id')
    .eq('entity_type', input.entity_type)
    .eq('entity_id', input.entity_id)
    .eq('event_type', input.event_type)
    .in('recipient_id', recipientIds);

  if (error) {
    throw new Error(`Failed to check existing notifications: ${error.message}`);
  }

  const existingRecipientIds = new Set(
    (existing || [])
      .map((row: { recipient_id: string | null }) => row.recipient_id)
      .filter((recipientId): recipientId is string => Boolean(recipientId)),
  );

  const targetRecipientIds = recipientIds.filter((recipientId) => !existingRecipientIds.has(recipientId));

  if (targetRecipientIds.length === 0) {
    return 0;
  }

  await notifyUsers(targetRecipientIds, input);
  return targetRecipientIds.length;
}

async function sendVolunteerCallRemindersForCall(callId: string): Promise<number> {
  try {
    const serviceClient = getServiceClient();
    const { data: call, error } = await serviceClient
      .from('volunteer_call')
      .select('call_id, call_title, call_starttime, call_status')
      .eq('call_id', callId)
      .maybeSingle();

    if (error || !call || !call.call_starttime) {
      return 0;
    }

    const status = String(call.call_status || '').toLowerCase();
    if (status === 'cancelled' || status === 'completed' || status === 'deleted') {
      return 0;
    }

    const startTime = new Date(call.call_starttime);
    const timeUntilStart = startTime.getTime() - Date.now();
    if (timeUntilStart <= 0) {
      return 0;
    }

    let notificationsSent = 0;
    const joinedUserIds = await getUsersJoinedCall(callId);
    const adminRecipientIds = await getAdminRecipientIds();

    for (const window of VOLUNTEER_REMINDER_WINDOWS) {
      if (timeUntilStart > window.maxAge || timeUntilStart <= window.minAge) {
        continue;
      }

      const payload = {
        sender_id: null,
        event_type: window.eventType,
        priority: 'high',
        title: window.title,
        message: window.message(call.call_title),
        entity_type: 'volunteer_call',
        entity_id: String(call.call_id),
      };

      notificationsSent += await notifyRecipientsIfMissing(joinedUserIds, payload);
      notificationsSent += await notifyRecipientsIfMissing(adminRecipientIds, payload);
    }

    return notificationsSent;
  } catch (e) {
    console.error('[sendVolunteerCallRemindersForCall] error:', e);
    return 0;
  }
}

// Helper function to get Supabase client
async function getSupabase() {
  return await createClient();
}


// Helper function to get signup count for a volunteer call (uses regular client)
export async function getSignupCount(callId: string): Promise<number> {
  try {
    const supabase = await getSupabase();
    const { count, error } = await supabase
      .from('volunteer_response')
      .select('*', { count: 'exact', head: true })
      .eq('call_id', callId);
    if (error) {
      console.error('[getSignupCount] error:', error);
      return 0;
    }
    return count || 0;
  } catch (e) {
    console.error('[getSignupCount] Exception:', e);
    return 0;
  }
}

// Function to get volunteer responses for a specific call (uses regular client, no user details)
export async function getVolunteerResponses(callId: string) {
  if (!callId) return [];
  try {
    const supabase = await getSupabase();
    const { data: responses, error } = await supabase
      .from('volunteer_response')
      .select('response_id, call_id, user_id, name, email, response_status, created_at')
      .eq('call_id', callId)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('getVolunteerResponses error:', error);
      return [];
    }
    return responses || [];
  } catch (e) {
    console.error('getVolunteerResponses exception:', e);
    return [];
  }
}

// Helper function to get user IDs who joined a volunteer call
export async function getUsersJoinedCall(callId: string): Promise<string[]> {
  try {
    const serviceClient = getServiceClient();
    
    const { data: responses, error } = await serviceClient
      .from('volunteer_response')
      .select('user_id')
      .eq('call_id', callId);
    
    if (error) {
      console.error("getUsersJoinedCall error:", error);
      return [];
    }
    
    return (responses || [])
      .map((r: { user_id: string | null }) => r.user_id)
      .filter((userId): userId is string => Boolean(userId));
  } catch (e) {
    console.error("getUsersJoinedCall exception:", e);
    return [];
  }
}

// Function to automatically update volunteer call status based on capacity and time (uses regular client)
export async function syncVolunteerCallStatus(callId: string) {
  try {
    const supabase = await getSupabase();
    // Get the volunteer call
    const { data: call, error } = await supabase
      .from('volunteer_call')
      .select('*')
      .eq('call_id', callId)
      .single();
    if (error || !call) return;
    const currentStatus = (call.call_status || '').toLowerCase();
    // Don't override Cancelled or Completed status (admin decision)
    if (currentStatus === 'cancelled' || currentStatus === 'completed') return;
    const now = new Date();
    const startTime = call.call_starttime ? new Date(call.call_starttime) : null;
    const endTime = call.call_endtime ? new Date(call.call_endtime) : null;
    // Completed status overrides all except Cancelled
    if (endTime && now >= endTime) {
      if (currentStatus !== 'completed') {
        await supabase
          .from('volunteer_call')
          .update({ call_status: 'Completed' })
          .eq('call_id', callId);
      }
      return;
    }
    // Check if the event is currently ongoing (started)
    const isOngoing = startTime && now >= startTime;
    // For ongoing events, set status to Ongoing
    if (isOngoing) {
      if (currentStatus !== 'ongoing') {
        await supabase
          .from('volunteer_call')
          .update({ call_status: 'Ongoing' })
          .eq('call_id', callId);

        try {
          const joinedUserIds = await getUsersJoinedCall(callId);
          if (joinedUserIds.length > 0) {
            await notifyUsers(joinedUserIds, {
              sender_id: null,
              event_type: 'volunteer_call.ongoing',
              priority: 'high',
              title: 'Volunteer call started',
              message: 'Your joined volunteer call is now ongoing.',
              entity_type: 'volunteer_call',
              entity_id: String(callId),
            });
          }
          await notifyAllAdmins({
            sender_id: null,
            event_type: 'volunteer_call.ongoing',
            priority: 'high',
            title: 'Volunteer call started',
            message: `Volunteer call${call.call_title ? `: ${call.call_title}` : ''} is now ongoing.`,
            entity_type: 'volunteer_call',
            entity_id: String(callId),
          });
        } catch (e) {
          console.error('Failed to notify ongoing volunteer call status:', e);
        }
      }
      return;
    }
    // For future events, check capacity
    if (call.capacity) {
      const signupCount = await getSignupCount(callId);
      if (signupCount >= call.capacity) {
        // Full capacity -> mark as Filled
        if (currentStatus !== 'filled') {
          await supabase
            .from('volunteer_call')
            .update({ call_status: 'Filled' })
            .eq('call_id', callId);

          try {
            const joinedUserIds = await getUsersJoinedCall(callId);
            if (joinedUserIds.length > 0) {
              await notifyUsers(joinedUserIds, {
                sender_id: null,
                event_type: 'volunteer_call.filled',
                priority: 'high',
                title: 'Volunteer call filled',
                message: 'Your joined volunteer call has reached full capacity.',
                entity_type: 'volunteer_call',
                entity_id: String(callId),
              });
            }
            await notifyAllAdmins({
              sender_id: null,
              event_type: 'volunteer_call.filled',
              priority: 'high',
              title: 'Volunteer call filled',
              message: `Volunteer call${call.call_title ? `: ${call.call_title}` : ''} reached full capacity.`,
              entity_type: 'volunteer_call',
              entity_id: String(callId),
            });
          } catch (e) {
            console.error('Failed to notify filled volunteer call status:', e);
          }
        }
      } else {
        // Has available spots -> mark as Active
        if (currentStatus !== 'active') {
          await supabase
            .from('volunteer_call')
            .update({ call_status: 'Active' })
            .eq('call_id', callId);
        }
      }
    } else {
      // No capacity limit -> keep as Active if not already
      if (currentStatus !== 'active') {
        await supabase
          .from('volunteer_call')
          .update({ call_status: 'Active' })
          .eq('call_id', callId);
      }
    }
  } catch (e) {
    console.error('syncVolunteerCallStatus error:', e);
  }

  await sendVolunteerCallRemindersForCall(callId);
}

// Function to sync all volunteer call statuses
export async function syncAllVolunteerCallStatuses() {
  try {
    const supabase = await getSupabase();
    
    // Get all volunteer calls
    const { data: calls, error } = await supabase
      .from('volunteer_call')
      .select('call_id');
    
    if (error || !calls) return;
    
    // Update each call's status
    await Promise.all(
      calls.map(call => syncVolunteerCallStatus(call.call_id))
    );
  } catch (e) {
    console.error('syncAllVolunteerCallStatuses error:', e);
  }
}

// Function to list volunteer calls with optional search and limit
export async function listVolunteerCalls(opts?: { search?: string; limit?: number; sortBy?: string; sortOrder?: 'asc' | 'desc' }) {

  try {
    const supabase = await getSupabase();
    let q: any = supabase.from("volunteer_call").select("*");
    if (opts?.search) {
      const s = opts.search;
      q = q.or(`call_title.ilike.%${s}%,call_details.ilike.%${s}%,call_location.ilike.%${s}%`);
    }
    const sortColumn = opts?.sortBy || "created_at";
    const sortAsc = opts?.sortOrder === 'asc';
    q = q.order(sortColumn, { ascending: sortAsc });
    if (opts?.limit) q = q.limit(opts.limit);
    const { data, error } = await q;
    if (error) {
      console.error("listVolunteerCalls error:", error);
      return [];
    }

    await Promise.all((data || []).map((call: any) => call?.call_id ? sendVolunteerCallRemindersForCall(String(call.call_id)) : Promise.resolve()));
    // Optionally, you can still add joined_count if needed, but without service role:
    // If you want to remove all extra logic, just return data;
    return data || [];
  } catch (e) {
    console.error(e);
    return [];
  }
}

// Function to get a single volunteer call by ID
export async function getVolunteerCall(id?: string) {
  // Check for valid ID
  if (!id) return null;

  // Fetch the volunteer call from the database
  try {
    // Sync status for this call first
    await syncVolunteerCallStatus(id);
    
    // Create Supabase client
    const supabase = await getSupabase();

    const { data: { user } } = await supabase.auth.getUser();

    // Query the volunteer_call table for the specified ID
    const { data, error } = await supabase.from("volunteer_call").select("*").eq("call_id", id).single();
    
    // Handle any errors
    if (error) {
      console.error("getVolunteerCall error:", error);
      return null;
    }

    // Return the volunteer call data
    await sendVolunteerCallRemindersForCall(id);
    return data as VolunteerCall;
  } 
  // Catch unexpected errors
  catch (e) {
    // Log the error
    console.error(e);

    // Return null on error
    return null;
  }
}

// Server action to create a new volunteer call
export async function createAction(formData: FormData): Promise<void> {
  try {
    // Log incoming form data for debugging
    try {} catch (e) {}

    const payload: any = {
      call_title: String(formData.get("call_title") || "").trim() || null,
      call_details: String(formData.get("call_details") || "").trim() || null,
      call_location: String(formData.get("call_location") || "").trim() || null,
      call_starttime: formData.get("call_starttime") ? String(formData.get("call_starttime")) : null,
      call_endtime: formData.get("call_endtime") ? String(formData.get("call_endtime")) : null,
      capacity: formData.get("capacity") ? Number(String(formData.get("capacity"))) : null,
      call_status: String(formData.get("call_status") || "Active") || "Active",
    };

    // Check for service role key to use elevated privileges
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        // Get current user for sender_id
        const supabase = await getSupabase();
        const { data: { user } } = await supabase.auth.getUser();

        // Create Supabase client with service role
        const svc = createSupabaseClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
        );

        // Insert the new volunteer call into the database
        const res = await svc.from("volunteer_call").insert(payload).select();

        // Handle any errors
        if (res.error) {
          console.error("createAction (service) error:", res.error);
          return;
        }

        // Notify admins (best-effort)
        try {
          const inserted = Array.isArray(res.data) ? res.data[0] : null;
          const callId = (inserted as any)?.call_id;
          if (callId) {
            await notifyAllAdmins({
              sender_id: user?.id ?? null,
              event_type: 'volunteer_call.created',
              priority: 'normal',
              title: 'New volunteer call created',
              message: payload.call_title ? `New volunteer call: ${payload.call_title}` : 'A new volunteer call was created.',
              entity_type: 'volunteer_call',
              entity_id: String(callId),
            });
          }
        } catch (e) {
          console.error('Failed to notify admins (volunteer_call.created):', e);
        }

        // Revalidate the admin volunteer list so the UI updates immediately
        try { revalidatePath('/admin/volunteer'); } catch (_) {}

        // Perform redirect outside of catch handling below by throwing through
        redirect("/admin/volunteer");

        // Successful completion
        return;
      } catch (e: any) {
        // Check if Next's redirect throws, rethrow so the runtime can handle navigation
        if (e && typeof e === 'object' && (String((e as any).digest || '').startsWith('NEXT_REDIRECT') || String((e as any).message || '').includes('NEXT_REDIRECT'))) {
          throw e;
        }

        // Log unexpected errors
        console.error("createAction service client error:", e);
        return;
      }
    }

    // Create Supabase client
    const supabase = await getSupabase();

    const { data: { user } } = await supabase.auth.getUser();

    // Insert the new volunteer call into the database
    const { data, error } = await supabase.from("volunteer_call").insert(payload).select();

    // Handle any errors
    if (error) {
      console.error("createAction error:", error);
      return;
    }

    // Notify admins (best-effort)
    try {
      const inserted = Array.isArray(data) ? data[0] : null;
      const callId = (inserted as any)?.call_id;
      if (callId) {
        await notifyAllAdmins({
          sender_id: user?.id ?? null,
          event_type: 'volunteer_call.created',
          priority: 'normal',
          title: 'New volunteer call created',
          message: payload.call_title ? `New volunteer call: ${payload.call_title}` : 'A new volunteer call was created.',
          entity_type: 'volunteer_call',
          entity_id: String(callId),
        });
      }
    } catch (e) {
      console.error('Failed to notify admins (volunteer_call.created):', e);
    }

    // After creating, revalidate the admin list and redirect back
    try { revalidatePath('/admin/volunteer'); } catch (_) {}
    redirect("/admin/volunteer");

    // Successful completion
    return;
  } catch (e: any) {
    // If Next's redirect throws, rethrow so the runtime can handle navigation
    if (e && typeof e === 'object' && (String((e as any).digest || '').startsWith('NEXT_REDIRECT') || String((e as any).message || '').includes('NEXT_REDIRECT'))) {
      throw e;
    }
    // Log unexpected errors
    console.error(e?.message || "Unexpected error");
    // End function
    return;
  }
}

// Server action to update an existing volunteer call
export async function updateAction(formData: FormData): Promise<void> {
  
  // Try to update the volunteer call
  try {
    // Get the ID from the form data
    const id = String(formData.get("id") || "");

    // Check for missing ID
    if (!id) {
      // Log error and exit
      console.error("updateAction missing id");
      return;
    }

    // Create Supabase client
    const supabase = await getSupabase();

    // Capture previous values (best-effort) to describe the update
    const { data: before } = await supabase
      .from("volunteer_call")
      .select("call_title, call_details, call_location, call_starttime, call_endtime, capacity, call_status")
      .eq("call_id", id)
      .maybeSingle();
    const oldTitle = (before as any)?.call_title ?? null;
    const oldStatus = (before as any)?.call_status ?? null;

    const { data: { user } } = await supabase.auth.getUser();

    // Build the update data object from form data
    const updateData: any = {};

    // Populate updateData with provided fields
    if (formData.has("call_title")) updateData.call_title = String(formData.get("call_title") || "").trim() || null;
    if (formData.has("call_details")) updateData.call_details = String(formData.get("call_details") || "").trim() || null;
    if (formData.has("call_location")) updateData.call_location = String(formData.get("call_location") || "").trim() || null;
    if (formData.has("call_starttime")) {
      const val = formData.get("call_starttime");
      updateData.call_starttime = val ? String(val) : null;
    }
    if (formData.has("call_endtime")) {
      const val = formData.get("call_endtime");
      updateData.call_endtime = val ? String(val) : null;
    }
    if (formData.has("capacity")) updateData.capacity = formData.get("capacity") ? Number(String(formData.get("capacity"))) : null;
    if (formData.has("call_status")) updateData.call_status = String(formData.get("call_status") || "") || null;

    // Perform the update in the database
    const { error } = await supabase.from("volunteer_call").update(updateData).eq("call_id", id).select();
    
    // Handle any errors
    if (error) console.error("updateAction error:", error);
    
    // Revalidate the admin volunteer list and detail page so the UI updates immediately
    else {
      try { 
        revalidatePath('/admin/volunteer'); 
        revalidatePath(`/admin/volunteer/${id}`);
      } catch (_) {}

      // Notify admins (best-effort)
      try {
        const newTitle = updateData.call_title ?? oldTitle;
        const newStatus = updateData.call_status ?? oldStatus;
        const statusChanged = (oldStatus ?? null) !== (newStatus ?? null);

        await notifyAllAdmins({
          sender_id: user?.id ?? null,
          event_type: 'volunteer_call.updated',
          priority: statusChanged ? 'high' : 'normal',
          title: 'Volunteer call updated',
          message: buildVolunteerUpdateMessage(newTitle, before, updateData),
          entity_type: 'volunteer_call',
          entity_id: String(id),
        });
      } catch (e) {
        console.error('Failed to notify admins (volunteer_call.updated):', e);
      }
    }

    // Successful completion: redirect back to the volunteer detail page
    redirect(`/admin/volunteer/${id}`);
  } 
  // Catch unexpected errors
  catch (e: any) {
    // If Next's redirect throws, rethrow so the runtime can handle navigation
    if (e && typeof e === 'object' && (String((e as any).digest || '').startsWith('NEXT_REDIRECT') || String((e as any).message || '').includes('NEXT_REDIRECT'))) {
      throw e;
    }

    // Log unexpected errors
    console.error(e?.message || "Unexpected error");

    // End function
    return;
  }
}

// Server action to complete a volunteer call by updating status to Completed
export async function completeAction(formData: FormData): Promise<void> {
  try {
    const id = String(formData.get("id") || "");

    if (!id) {
      console.error("completeAction missing id");
      return;
    }

    const supabase = await getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    const { data: before } = await supabase
      .from("volunteer_call")
      .select("call_status, call_title")
      .eq("call_id", id)
      .maybeSingle();
    const oldStatus = (before as any)?.call_status ?? null;
    const callTitle = (before as any)?.call_title ?? null;

    // Use service client to bypass RLS for status update
    const serviceClient = getServiceClient();
    const { error } = await serviceClient
      .from("volunteer_call")
      .update({ call_status: "Completed" })
      .eq("call_id", id);

    if (error) {
      console.error("completeAction error:", error);
    } else {
      try {
        const newStatus = 'Completed';
        if ((oldStatus ?? null) !== newStatus) {
          await notifyAllAdmins({
            sender_id: user?.id ?? null,
            event_type: 'volunteer_call.status_changed',
            priority: 'high',
            title: 'Volunteer call status changed',
            message: buildStatusChangeMessage('Volunteer call', callTitle, oldStatus, newStatus),
            entity_type: 'volunteer_call',
            entity_id: String(id),
          });

          // Notify joined users (best-effort)
          try {
            const joinedUserIds = await getUsersJoinedCall(id);
            if (joinedUserIds.length > 0) {
              await notifyUsers(joinedUserIds, {
                sender_id: user?.id ?? null,
                event_type: 'volunteer_call.completed',
                priority: 'high',
                title: 'Volunteer call completed',
                message: `The volunteer call${callTitle ? ` "${callTitle}"` : ''} has been completed.`,
                entity_type: 'volunteer_call',
                entity_id: String(id),
              });
            }
          } catch (e) {
            console.error('Failed to notify users (volunteer_call.completed):', e);
          }
        }
      } catch (e) {
        console.error('Failed to notify admins (volunteer_call.status_changed):', e);
      }
      try {
        revalidatePath('/admin/volunteer');
        revalidatePath(`/admin/volunteer/${id}`);
      } catch (_) {}
    }

    redirect(`/admin/volunteer/${id}`);
  } catch (e: any) {
    if (e && typeof e === 'object' && (String((e as any).digest || '').startsWith('NEXT_REDIRECT') || String((e as any).message || '').includes('NEXT_REDIRECT'))) {
      throw e;
    }

    console.error(e?.message || "Unexpected error");
    return;
  }
}

// Server action to cancel a volunteer call by updating status to Cancelled
export async function cancelAction(formData: FormData): Promise<void> {
  // Try to cancel the volunteer call
  try {
    // Get the ID from the form data
    const id = String(formData.get("id") || "");

    // Check for missing ID
    if (!id) {
      console.error("cancelAction missing id");
      return;
    }

    // Create Supabase client
    const supabase = await getSupabase();

    // Capture previous status/title for notification
    const { data: before } = await supabase
      .from("volunteer_call")
      .select("call_status, call_title")
      .eq("call_id", id)
      .maybeSingle();
    const oldStatus = (before as any)?.call_status ?? null;
    const callTitle = (before as any)?.call_title ?? null;

    const { data: { user } } = await supabase.auth.getUser();

    // Update the status to Cancelled
    const { error } = await supabase
      .from("volunteer_call")
      .update({ call_status: "Cancelled" })
      .eq("call_id", id);

    // Handle any errors
    if (error) console.error("cancelAction error:", error);

    // Revalidate paths
    else {
      try {
        revalidatePath('/admin/volunteer');
        revalidatePath(`/admin/volunteer/${id}`);
      } catch (_) {}

      // Notify admins (best-effort)
      try {
        const newStatus = 'Cancelled';
        if ((oldStatus ?? null) !== newStatus) {
          await notifyAllAdmins({
            sender_id: user?.id ?? null,
            event_type: 'volunteer_call.cancelled',
            priority: 'high',
            title: 'Volunteer call status changed',
            message: buildStatusChangeMessage('Volunteer call', callTitle, oldStatus, newStatus),
            entity_type: 'volunteer_call',
            entity_id: String(id),
          });

          // Notify joined users (best-effort)
          try {
            const joinedUserIds = await getUsersJoinedCall(id);
            if (joinedUserIds.length > 0) {
              await notifyUsers(joinedUserIds, {
                sender_id: user?.id ?? null,
                event_type: 'volunteer_call.cancelled',
                priority: 'high',
                title: 'Volunteer call cancelled',
                message: `The volunteer call${callTitle ? ` "${callTitle}"` : ''} has been cancelled.`,
                entity_type: 'volunteer_call',
                entity_id: String(id),
              });
            }
          } catch (e) {
            console.error('Failed to notify users (volunteer_call.cancelled):', e);
          }
        }
      } catch (e) {
        console.error('Failed to notify admins (volunteer_call.cancelled):', e);
      }
    }

    // Redirect back to the volunteer detail page
    redirect(`/admin/volunteer/${id}`);
  } catch (e: any) {
    // If Next's redirect throws, rethrow so the runtime can handle navigation
    if (e && typeof e === 'object' && (String((e as any).digest || '').startsWith('NEXT_REDIRECT') || String((e as any).message || '').includes('NEXT_REDIRECT'))) {
      throw e;
    }

    // Log unexpected errors
    console.error(e?.message || "Unexpected error");
    return;
  }
}

// Server action to uncancel a volunteer call by updating status to Active
export async function uncancelAction(formData: FormData): Promise<void> {
  // Try to uncancel the volunteer call
  try {
    // Get the ID from the form data
    const id = String(formData.get("id") || "");

    // Check for missing ID
    if (!id) {
      console.error("uncancelAction missing id");
      return;
    }

    // Create Supabase client
    const supabase = await getSupabase();

    // Capture previous status/title for notification
    const { data: before } = await supabase
      .from("volunteer_call")
      .select("call_status, call_title")
      .eq("call_id", id)
      .maybeSingle();
    const oldStatus = (before as any)?.call_status ?? null;
    const callTitle = (before as any)?.call_title ?? null;

    const { data: { user } } = await supabase.auth.getUser();

    // Update the status to Active
    const { error } = await supabase
      .from("volunteer_call")
      .update({ call_status: "Active" })
      .eq("call_id", id);

    // Handle any errors
    if (error) console.error("uncancelAction error:", error);

    // Revalidate paths
    else {
      try {
        revalidatePath('/admin/volunteer');
        revalidatePath(`/admin/volunteer/${id}`);
      } catch (_) {}

      // Notify admins and joined users (best-effort)
      try {
        const newStatus = 'Active';
        if ((oldStatus ?? null) !== newStatus) {
          await notifyAllAdmins({
            sender_id: user?.id ?? null,
            event_type: 'volunteer_call.uncancelled',
            priority: 'high',
            title: 'Volunteer call reopened',
            message: buildStatusChangeMessage('Volunteer call', callTitle, oldStatus, newStatus),
            entity_type: 'volunteer_call',
            entity_id: String(id),
          });

          const joinedUserIds = await getUsersJoinedCall(id);
          if (joinedUserIds.length > 0) {
            await notifyUsers(joinedUserIds, {
              sender_id: user?.id ?? null,
              event_type: 'volunteer_call.uncancelled',
              priority: 'high',
              title: 'Volunteer call reopened',
              message: `The volunteer call${callTitle ? ` "${callTitle}"` : ''} has been reopened.`,
              entity_type: 'volunteer_call',
              entity_id: String(id),
            });
          }
        }
      } catch (e) {
        console.error('Failed to notify admins (volunteer_call.uncancelled):', e);
      }
    }

    // Redirect back to the volunteer detail page
    redirect(`/admin/volunteer/${id}`);
  } catch (e: any) {
    // If Next's redirect throws, rethrow so the runtime can handle navigation
    if (e && typeof e === 'object' && (String((e as any).digest || '').startsWith('NEXT_REDIRECT') || String((e as any).message || '').includes('NEXT_REDIRECT'))) {
      throw e;
    }

    // Log unexpected errors
    console.error(e?.message || "Unexpected error");
    return;
  }
}

// Server action to delete a volunteer call by ID
export async function deleteAction(formData: FormData): Promise<void> {
  // Try to delete the volunteer call
  try {
    // Get the ID from the form data
    const id = String(formData.get("id") || "");

    // Check for missing ID
    if (!id) {
      // Log error and exit
      console.error("deleteAction missing id");
      return;
    }
    
    // Perform the deletion
    let error: any = null;

    // Get current user for sender_id
    const supabase = await getSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    // Use service role if available for elevated privileges
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        // Create Supabase client with service role
        const svc = createSupabaseClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
        );

        // Fetch the volunteer call before deletion for notification
        const { data: beforeData } = await svc.from("volunteer_call").select("call_title").eq("call_id", id).maybeSingle();
        const callTitle = (beforeData as any)?.call_title ?? null;
       
        // Delete the volunteer call from the database
        const res = await svc.from("volunteer_call").delete().eq("call_id", id).select();
        
        // Handle any errors
        error = res.error;

        // Log error if occurred
        if (error) console.error("deleteAction (service) error:", error);
        else {
          const joinedUserIds = await getUsersJoinedCall(id);

          // Notify admins and joined users (best-effort)
          try {
            await notifyAllAdmins({
              sender_id: user?.id ?? null,
              event_type: 'volunteer_call.deleted',
              priority: 'high',
              title: 'Volunteer call deleted',
              message: `Volunteer call${callTitle ? `: ${callTitle}` : ''} has been deleted.`,
              entity_type: 'volunteer_call',
              entity_id: String(id),
            });

            if (joinedUserIds.length > 0) {
              await notifyUsers(joinedUserIds, {
                sender_id: user?.id ?? null,
                event_type: 'volunteer_call.deleted',
                priority: 'high',
                title: 'Volunteer call deleted',
                message: `Volunteer call${callTitle ? `: ${callTitle}` : ''} has been deleted.`,
                entity_type: 'volunteer_call',
                entity_id: String(id),
              });
            }
          } catch (e) {
            console.error('Failed to notify admins (volunteer_call.deleted):', e);
          }
        }
      } catch (e) {
        // If Next's redirect throws, rethrow so the runtime can handle navigation
        if (e && typeof e === 'object' && (String((e as any).digest || '').startsWith('NEXT_REDIRECT') || String((e as any).message || '').includes('NEXT_REDIRECT'))) {
          throw e;
        }
        // Log unexpected errors
        console.error("deleteAction service client error:", e);

        // End function
        return;
      }
    } else {
      // Create Supabase client with regular auth
      const sbClient = await getSupabase();

      // Fetch the volunteer call before deletion for notification
      const { data: beforeData } = await sbClient.from("volunteer_call").select("call_title").eq("call_id", id).maybeSingle();
      const callTitle = (beforeData as any)?.call_title ?? null;
      
      // Delete the volunteer call from the database
      const res = await sbClient.from("volunteer_call").delete().eq("call_id", id).select();
      
      // Handle any errors
      error = res.error;

      // Log error if occurred
      if (error) console.error("deleteAction error:", error);
      else {
        const joinedUserIds = await getUsersJoinedCall(id);

        // Notify admins and joined users (best-effort)
        try {
          await notifyAllAdmins({
            sender_id: user?.id ?? null,
            event_type: 'volunteer_call.deleted',
            priority: 'high',
            title: 'Volunteer call deleted',
            message: `Volunteer call${callTitle ? `: ${callTitle}` : ''} has been deleted.`,
            entity_type: 'volunteer_call',
            entity_id: String(id),
          });

          if (joinedUserIds.length > 0) {
            await notifyUsers(joinedUserIds, {
              sender_id: user?.id ?? null,
              event_type: 'volunteer_call.deleted',
              priority: 'high',
              title: 'Volunteer call deleted',
              message: `Volunteer call${callTitle ? `: ${callTitle}` : ''} has been deleted.`,
              entity_type: 'volunteer_call',
              entity_id: String(id),
            });
          }
        } catch (e) {
          console.error('Failed to notify admins (volunteer_call.deleted):', e);
        }
      }
    }

      // Revalidate the admin volunteer list so the UI updates immediately
      try { revalidatePath('/admin/volunteer'); } catch (_) {}
      // Do not redirect; let client handle UI update
  } catch (e: any) {
    // If Next's redirect throws, rethrow so the runtime can handle navigation
    if (e && typeof e === 'object' && (String((e as any).digest || '').startsWith('NEXT_REDIRECT') || String((e as any).message || '').includes('NEXT_REDIRECT'))) {
      throw e;
    }
    
    // End function
    return;
  }
}

// Function to delete a volunteer call by ID, returning success status
export async function deleteVolunteerCall(id?: string) {
  // Check for valid ID
  if (!id) return { success: false, error: "missing id" };

  // Perform the deletion
  try {

    // Use regular Supabase client
    const supabase = await getSupabase();
    const { data: beforeData } = await supabase.from("volunteer_call").select("call_title").eq("call_id", id).maybeSingle();
    const callTitle = (beforeData as any)?.call_title ?? null;
    const joinedUserIds = await getUsersJoinedCall(id);

    // Delete the volunteer call from the database
    const { data, error } = await supabase.from("volunteer_call").delete().eq("call_id", id).select();
    // Handle any errors
    if (error) return { success: false, error: String((error as any).message || error) };
    if (joinedUserIds.length > 0) {
      await notifyUsers(joinedUserIds, {
        sender_id: null,
        event_type: 'volunteer_call.deleted',
        priority: 'high',
        title: 'Volunteer call deleted',
        message: `Volunteer call${callTitle ? `: ${callTitle}` : ''} has been deleted.`,
        entity_type: 'volunteer_call',
        entity_id: String(id),
      });
    }
    // Revalidate the admin volunteer list so the UI updates immediately
    try { revalidatePath('/admin/volunteer'); } catch (_) {}
    // Return success
    return { success: true };
  } catch (e: any) {
    // Log unexpected errors and return failure
    return { success: false, error: e?.message || String(e) };
  }
}