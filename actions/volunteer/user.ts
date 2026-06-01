'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { syncVolunteerCallStatus } from './admin';
import { notifyAllAdmins, notifyUser } from '@/actions/notifications/internal';
import { publishAdminVolunteerCallJoinedExternal, publishAdminVolunteerCallLeftExternal } from '@/utils/aws/sns';

// Helper to get Supabase client
async function getSupabase() {
  return await createClient();
}

type VolunteerCallTiming = {
  call_status?: string | null;
  call_starttime?: string | null;
  call_endtime?: string | null;
};

function getVolunteerPhase(call: VolunteerCallTiming, now = new Date()) {
  const status = (call.call_status || '').toLowerCase();
  if (status === 'cancelled' || status === 'completed') {
    return call.call_status;
  }

  const endTime = call.call_endtime ? new Date(call.call_endtime) : null;
  if (endTime && now >= endTime) {
    return 'Completed';
  }

  const startTime = call.call_starttime ? new Date(call.call_starttime) : null;
  if (startTime && now >= startTime) {
    return 'Ongoing';
  }

  return call.call_status;
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
      .select('capacity, call_status, call_title, call_starttime, call_endtime')
      .eq('call_id', callId)
      .single();

    if (!call) {
      return { success: false, error: 'Opportunity not found' };
    }

    if ((getVolunteerPhase(call as VolunteerCallTiming) || '').toLowerCase() !== 'active') {
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

    // Notify admins (best-effort)
    try {
      const callTitle = (call as any)?.call_title ?? null;
      const userDisplayName =
        (user.user_metadata as any)?.full_name ||
        (user.user_metadata as any)?.name ||
        user.email ||
        'A user';

      await notifyAllAdmins({
        sender_id: user.id,
        event_type: 'volunteer_call.joined',
        priority: 'normal',
        title: 'New volunteer signup',
        message: `${userDisplayName} joined volunteer call${callTitle ? `: ${callTitle}` : '.'}`,
        entity_type: 'volunteer_call',
        entity_id: String(callId),
      });

      // External admin email via AWS SNS topic (best-effort)
      try {
        await publishAdminVolunteerCallJoinedExternal({
          callId: String(callId),
          callTitle,
          userDisplayName,
        });
      } catch (e) {
        console.error('Failed to publish external admin email (volunteer_call.joined):', e);
      }

      // Notify the user themselves (best-effort)
      try {
        await notifyUser(user.id, {
          sender_id: user.id,
          event_type: 'volunteer_call.joined',
          priority: 'normal',
          title: 'You joined a volunteer call',
          message: `You successfully joined${callTitle ? `: ${callTitle}` : ' a volunteer call'}.`,
          entity_type: 'volunteer_call',
          entity_id: String(callId),
        });
      } catch (e) {
        console.error('Failed to notify user (volunteer_call.joined):', e);
      }
    } catch (e) {
      console.error('Failed to notify admins (volunteer_call.joined):', e);
    }

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

    // Fetch call status as authoritative for 'ongoing' override
    const { data: callRow } = await supabase
      .from('volunteer_call')
      .select('call_status, call_starttime, call_endtime')
      .eq('call_id', callId)
      .maybeSingle();

    const callStatus = getVolunteerPhase(callRow as VolunteerCallTiming);
    if ((callStatus || '').toLowerCase() === 'ongoing') return 'Ongoing';

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

    // Prevent leaving if the call is already ongoing
    const { data: callStatusRow } = await supabase
      .from('volunteer_call')
      .select('call_status, call_starttime, call_endtime')
      .eq('call_id', callId)
      .maybeSingle();

    const callStatus = getVolunteerPhase(callStatusRow as VolunteerCallTiming);
    const normalizedStatus = (callStatus || '').toLowerCase();
    if (normalizedStatus !== 'active' && normalizedStatus !== 'filled' && normalizedStatus !== 'joined') {
      return { success: false, error: 'This opportunity is no longer open for leaving' };
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

    // Get call details for notification
    const { data: call } = await supabase
      .from('volunteer_call')
      .select('call_title')
      .eq('call_id', callId)
      .maybeSingle();
    const callTitle = (call as any)?.call_title ?? null;

    // Notify admins (best-effort)
    try {
      const userDisplayName =
        (user.user_metadata as any)?.full_name ||
        (user.user_metadata as any)?.name ||
        user.email ||
        'A user';

      await notifyAllAdmins({
        sender_id: user.id,
        event_type: 'volunteer_call.left',
        priority: 'normal',
        title: 'User left volunteer call',
        message: `${userDisplayName} left the volunteer call${callTitle ? `: ${callTitle}` : '.'}`,
        entity_type: 'volunteer_call',
        entity_id: String(callId),
      });

      // External admin email via AWS SNS topic (best-effort)
      try {
        await publishAdminVolunteerCallLeftExternal({
          callId: String(callId),
          callTitle,
          userDisplayName,
        });
      } catch (e) {
        console.error('Failed to publish external admin email (volunteer_call.left):', e);
      }
    } catch (e) {
      console.error('Failed to notify admins (volunteer_call.left):', e);
    }

    // Notify the user themselves (best-effort)
    try {
      await notifyUser(user.id, {
        sender_id: user.id,
        event_type: 'volunteer_call.left',
        priority: 'normal',
        title: 'You left a volunteer call',
        message: `You left the volunteer call${callTitle ? `: ${callTitle}` : '.'}`,
        entity_type: 'volunteer_call',
        entity_id: String(callId),
      });
    } catch (e) {
      console.error('Failed to notify user (volunteer_call.left):', e);
    }

    revalidatePath(`/volunteer/${callId}`);
    revalidatePath('/volunteer');
    
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message || 'Failed to leave opportunity' };
  }
}

// Send reminders to users about joined volunteer calls before they start.
export async function sendUpcomingCallReminders() {
  try {
    const supabase = await getSupabase();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Get all volunteer calls the user has joined
    const { data: responses, error: responsesError } = await supabase
      .from('volunteer_response')
      .select('call_id')
      .eq('user_id', user.id);

    if (responsesError || !responses || responses.length === 0) {
      return { success: true, notificationsSent: 0 };
    }

    const callIds = responses.map(r => r.call_id);

    // Get details of all those calls
    const { data: calls, error: callsError } = await supabase
      .from('volunteer_call')
      .select('call_id, call_title, call_starttime, call_status')
      .in('call_id', callIds);

    if (callsError || !calls) {
      return { success: true, notificationsSent: 0 };
    }

    const now = new Date();
    const twentyFourHours = 24 * 60 * 60 * 1000;
    const fifteenMinutes = 15 * 60 * 1000;
    let notificationsSent = 0;

    // Check each joined call for the 24-hour and 15-minute reminder windows.
    for (const call of calls) {
      if (!call.call_starttime || call.call_status !== 'Active' && call.call_status !== 'Ongoing') {
        continue;
      }

      const startTime = new Date(call.call_starttime);
      const timeUntilStart = startTime.getTime() - now.getTime();

      if (timeUntilStart <= 0) {
        continue;
      }

      const reminderWindows = [
        {
          eventType: 'volunteer_call.upcoming_reminder',
          title: 'Upcoming volunteer call',
          message: `Reminder: "${call.call_title}" starts in about 24 hours.`,
          minAge: fifteenMinutes,
          maxAge: twentyFourHours,
        },
        {
          eventType: 'volunteer_call.starting_soon',
          title: 'Volunteer call starts soon',
          message: `Reminder: "${call.call_title}" starts in about 15 minutes.`,
          minAge: 0,
          maxAge: fifteenMinutes,
        },
      ];

      for (const window of reminderWindows) {
        if (timeUntilStart <= window.minAge || timeUntilStart > window.maxAge) {
          continue;
        }

        try {
          const { data: existingNotifications } = await supabase
            .from('notifications')
            .select('notification_id')
            .eq('recipient_id', user.id)
            .eq('entity_id', call.call_id)
            .eq('event_type', window.eventType)
            .maybeSingle();

          if (!existingNotifications) {
            await notifyUser(user.id, {
              sender_id: null,
              event_type: window.eventType,
              priority: 'high',
              title: window.title,
              message: window.message,
              entity_type: 'volunteer_call',
              entity_id: String(call.call_id),
            });
            
            notificationsSent++;
          }
        } catch (e) {
          console.error(`Failed to send ${window.eventType} reminder for call ${call.call_id}:`, e);
        }
      }
    }

    return { success: true, notificationsSent };
  } catch (e: any) {
    console.error('sendUpcomingCallReminders error:', e);
    return { success: false, error: e?.message || 'Failed to send reminders' };
  }
}