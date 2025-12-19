'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { syncVolunteerCallStatus } from './admin';

// Helper to get Supabase client
async function getSupabase() {
  return await createClient();
}

// Join a volunteer opportunity
export async function joinVolunteerCall(callId: string) {
  try {
    const supabase = await getSupabase();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Check if already joined
    const { data: existing } = await supabase
      .from('volunteer_response')
      .select('response_id')
      .eq('call_id', callId)
      .eq('user_id', user.id)
      .single();

    if (existing) {
      return { success: false, error: 'Already joined this opportunity' };
    }

    // Check capacity
    const { data: call } = await supabase
      .from('volunteer_call')
      .select('capacity, call_status')
      .eq('call_id', callId)
      .single();

    if (!call) {
      return { success: false, error: 'Opportunity not found' };
    }

    if (call.call_status !== 'Active') {
      return { success: false, error: 'This opportunity is no longer active' };
    }

    // Count current responses
    const { count } = await supabase
      .from('volunteer_response')
      .select('*', { count: 'exact', head: true })
      .eq('call_id', callId);

    if (call.capacity && count !== null && count >= call.capacity) {
      return { success: false, error: 'This opportunity has reached full capacity' };
    }

    // Insert response (only user_id needed, email/name fetched from auth.users via join)
    const { error: insertError } = await supabase
      .from('volunteer_response')
      .insert({
        call_id: callId,
        user_id: user.id,
        response_status: 'Pending'
      });

    if (insertError) {
      return { success: false, error: insertError.message };
    }

    // Sync the volunteer call status (may change to Filled if capacity reached)
    await syncVolunteerCallStatus(callId);

    revalidatePath(`/volunteer/${callId}`);
    revalidatePath('/volunteer');
    
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message || 'Failed to join opportunity' };
  }
}

// Get user's response status for a volunteer call
export async function getUserResponseStatus(callId: string) {
  try {
    const supabase = await getSupabase();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data } = await supabase
      .from('volunteer_response')
      .select('response_status')
      .eq('call_id', callId)
      .eq('user_id', user.id)
      .single();

    return data?.response_status || null;
  } catch {
    return null;
  }
}

// Get current signup count
export async function getVolunteerSignupCount(callId: string) {
  try {
    const supabase = await getSupabase();
    
    const { count } = await supabase
      .from('volunteer_response')
      .select('*', { count: 'exact', head: true })
      .eq('call_id', callId);

    return count || 0;
  } catch {
    return 0;
  }
}

// Leave/cancel a volunteer opportunity
export async function leaveVolunteerCall(callId: string) {
  try {
    const supabase = await getSupabase();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Check if response exists before deleting
    const { data: existing, error: checkError } = await supabase
      .from('volunteer_response')
      .select('response_id')
      .eq('call_id', callId)
      .eq('user_id', user.id)
      .single();

    if (checkError || !existing) {
      return { success: false, error: 'You have not joined this opportunity' };
    }

    // Delete the response
    const { error: deleteError, count } = await supabase
      .from('volunteer_response')
      .delete({ count: 'exact' })
      .eq('call_id', callId)
      .eq('user_id', user.id);

    if (deleteError) {
      return { success: false, error: `Delete failed: ${deleteError.message}` };
    }

    if (count === 0) {
      return { success: false, error: 'No rows were deleted. Check RLS policies.' };
    }

    // Sync the volunteer call status (may change back to Active if spots freed up)
    await syncVolunteerCallStatus(callId);

    revalidatePath(`/volunteer/${callId}`);
    revalidatePath('/volunteer');
    
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message || 'Failed to leave opportunity' };
  }
}