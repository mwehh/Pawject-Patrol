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
        // Use regular Supabase client
        const supabase = await getSupabase();
        const { error } = await supabase
          .from("volunteer_call")
          .update({ call_status: "Active" })
          .eq("call_id", id);
    if (error) {
      console.error("uncompleteAction error:", error);
    } else {
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
      .select('response_id, call_id, user_id, response_status, created_at')
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
    if (endTime && now > endTime) {
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

    // Query the volunteer_call table for the specified ID
    const { data, error } = await supabase.from("volunteer_call").select("*").eq("call_id", id).single();
    
    // Handle any errors
    if (error) {
      console.error("getVolunteerCall error:", error);
      return null;
    }

    // Return the volunteer call data
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

    // Insert the new volunteer call into the database
    const { data, error } = await supabase.from("volunteer_call").insert(payload).select();

    // Handle any errors
    if (error) {
      console.error("createAction error:", error);
      return;
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

    // Use regular Supabase client
    const supabase = await getSupabase();
    const { error } = await supabase
      .from("volunteer_call")
      .update({ call_status: "Completed" })
      .eq("call_id", id);

    if (error) {
      console.error("completeAction error:", error);
    } else {
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
    
    // Use regular Supabase client
    const supabase = await getSupabase();
    // Fetch the volunteer call before deletion for any necessary checks or logging
    const before = await supabase.from("volunteer_call").select("*").eq("call_id", id).maybeSingle();
    // Delete the volunteer call from the database
    const res = await supabase.from("volunteer_call").delete().eq("call_id", id).select();
    // Handle any errors
    if (res.error) console.error("deleteAction error:", res.error);
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
    // Delete the volunteer call from the database
    const { data, error } = await supabase.from("volunteer_call").delete().eq("call_id", id).select();
    // Handle any errors
    if (error) return { success: false, error: String((error as any).message || error) };
    // Revalidate the admin volunteer list so the UI updates immediately
    try { revalidatePath('/admin/volunteer'); } catch (_) {}
    // Return success
    return { success: true };
  } catch (e: any) {
    // Log unexpected errors and return failure
    return { success: false, error: e?.message || String(e) };
  }
}