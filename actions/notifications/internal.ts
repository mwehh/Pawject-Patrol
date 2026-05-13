'use server';

import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export type NotifyAllAdminsInput = {
  sender_id?: string | null;
  event_type: string;
  priority?: string | null;
  title: string;
  message: string;
  entity_type: string;
  entity_id: string;
};

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} not configured`);
  return value;
}

function getServiceClient() {
  const url = getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL');
  const key = getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY');

  return createSupabaseClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

export async function notifyAllAdmins(input: NotifyAllAdminsInput) {
  const supabase = getServiceClient();

  const { data: admins, error: adminsError } = await supabase
    .from('admin')
    .select('auth_id')
    .not('auth_id', 'is', null);

  if (adminsError) {
    throw new Error(`Failed to fetch admins: ${adminsError.message}`);
  }

  const recipientIds = (admins ?? [])
    .map((a: any) => a.auth_id as string | null)
    .filter(Boolean);

  if (recipientIds.length === 0) {
    console.warn('[notifyAllAdmins] No admin recipients found; notification skipped.', {
      event_type: input.event_type,
      entity_type: input.entity_type,
      entity_id: input.entity_id,
    });
    return { ok: true, inserted: 0 } as const;
  }

  const table = process.env.NOTIFICATION_TABLE_NAME || 'notifications';

  if (table !== 'notifications') {
    console.warn('[notifyAllAdmins] Using NOTIFICATION_TABLE_NAME override.', {
      table,
      event_type: input.event_type,
    });
  }

  const records = recipientIds.map((recipient_id) => ({
    recipient_id,
    sender_id: input.sender_id ?? null,
    event_type: input.event_type,
    priority: input.priority ?? null,
    title: input.title,
    message: input.message,
    entity_type: input.entity_type,
    entity_id: input.entity_id,
  }));

  const { error: insertError } = await supabase.from(table).insert(records);

  if (insertError) {
    throw new Error(`Failed to insert notifications: ${insertError.message}`);
  }

  console.info('[notifyAllAdmins] Inserted notifications.', {
    table,
    inserted: records.length,
    event_type: input.event_type,
    entity_type: input.entity_type,
    entity_id: input.entity_id,
  });

  return { ok: true, inserted: records.length } as const;
}

export async function notifyUser(userId: string, input: Omit<NotifyAllAdminsInput, 'sender_id'> & { sender_id?: string | null }) {
  const supabase = getServiceClient();

  const table = process.env.NOTIFICATION_TABLE_NAME || 'notifications';

  const record = {
    recipient_id: userId,
    sender_id: input.sender_id ?? null,
    event_type: input.event_type,
    priority: input.priority ?? null,
    title: input.title,
    message: input.message,
    entity_type: input.entity_type,
    entity_id: input.entity_id,
  };

  const { error: insertError } = await supabase.from(table).insert([record]);

  if (insertError) {
    throw new Error(`Failed to insert notification: ${insertError.message}`);
  }

  console.info('[notifyUser] Inserted notification.', {
    table,
    recipient_id: userId,
    event_type: input.event_type,
    entity_type: input.entity_type,
    entity_id: input.entity_id,
  });

  return { ok: true, inserted: 1 } as const;
}

export async function notifyUsers(userIds: string[], input: Omit<NotifyAllAdminsInput, 'sender_id'> & { sender_id?: string | null }) {
  if (userIds.length === 0) {
    return { ok: true, inserted: 0 } as const;
  }

  const supabase = getServiceClient();

  const table = process.env.NOTIFICATION_TABLE_NAME || 'notifications';

  const records = userIds.map((recipient_id) => ({
    recipient_id,
    sender_id: input.sender_id ?? null,
    event_type: input.event_type,
    priority: input.priority ?? null,
    title: input.title,
    message: input.message,
    entity_type: input.entity_type,
    entity_id: input.entity_id,
  }));

  const { error: insertError } = await supabase.from(table).insert(records);

  if (insertError) {
    throw new Error(`Failed to insert notifications: ${insertError.message}`);
  }

  console.info('[notifyUsers] Inserted notifications.', {
    table,
    inserted: records.length,
    event_type: input.event_type,
    entity_type: input.entity_type,
    entity_id: input.entity_id,
  });

  return { ok: true, inserted: records.length } as const;
}
