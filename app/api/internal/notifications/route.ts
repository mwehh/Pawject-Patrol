import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

type NotificationRecord = Record<string, unknown>;

type NotificationInsert = {
  notification_id?: string;
  created_at?: string;
  updated_at?: string;
  sender_id?: string | null;
  recipient_id?: string | null;
  event_type?: string | null;
  priority?: string | null;
  title?: string | null;
  message?: string | null;
  entity_type?: string | null;
  entity_id?: string | null;
};

type PostBody = {
  record?: NotificationRecord;
  records?: NotificationRecord[];

  // Convenience fields (optional) so callers don't have to wrap in `record`.
  sender_id?: string | null;
  recipient_id?: string | null;
  event_type?: string | null;
  priority?: string | null;
  title?: string | null;
  message?: string | null;
  entity_type?: string | null;
  entity_id?: string | null;
};

function json(status: number, body: unknown) {
  return NextResponse.json(body, { status });
}

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

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const ALLOWED_NOTIFICATION_COLUMNS = new Set([
  'notification_id',
  'created_at',
  'updated_at',
  'sender_id',
  'recipient_id',
  'event_type',
  'priority',
  'title',
  'message',
  'entity_type',
  'entity_id',
]);

function isStringOrNull(value: unknown): value is string | null | undefined {
  return value === null || value === undefined || typeof value === 'string';
}

function normalizeRecord(input: NotificationRecord): NotificationInsert {
  const unknownKeys = Object.keys(input).filter(
    (k) => !ALLOWED_NOTIFICATION_COLUMNS.has(k),
  );
  if (unknownKeys.length > 0) {
    throw new Error(`Unknown columns: ${unknownKeys.join(', ')}`);
  }

  const out: NotificationInsert = {};

  if (!isStringOrNull(input.notification_id)) throw new Error('notification_id must be a string');
  if (!isStringOrNull(input.created_at)) throw new Error('created_at must be a string');
  if (!isStringOrNull(input.updated_at)) throw new Error('updated_at must be a string');
  if (!isStringOrNull(input.sender_id)) throw new Error('sender_id must be a string or null');
  if (!isStringOrNull(input.recipient_id)) throw new Error('recipient_id must be a string or null');
  if (!isStringOrNull(input.event_type)) throw new Error('event_type must be a string or null');
  if (!isStringOrNull(input.priority)) throw new Error('priority must be a string or null');
  if (!isStringOrNull(input.title)) throw new Error('title must be a string or null');
  if (!isStringOrNull(input.message)) throw new Error('message must be a string or null');
  if (!isStringOrNull(input.entity_type)) throw new Error('entity_type must be a string or null');
  if (!isStringOrNull(input.entity_id)) throw new Error('entity_id must be a string or null');

  if (input.notification_id !== undefined) out.notification_id = input.notification_id as string;
  if (input.created_at !== undefined) out.created_at = input.created_at as string;
  if (input.updated_at !== undefined) out.updated_at = input.updated_at as string;
  if (input.sender_id !== undefined) out.sender_id = input.sender_id as string | null;
  if (input.recipient_id !== undefined) out.recipient_id = input.recipient_id as string | null;
  if (input.event_type !== undefined) out.event_type = input.event_type as string | null;
  if (input.priority !== undefined) out.priority = input.priority as string | null;
  if (input.title !== undefined) out.title = input.title as string | null;
  if (input.message !== undefined) out.message = input.message as string | null;
  if (input.entity_type !== undefined) out.entity_type = input.entity_type as string | null;
  if (input.entity_id !== undefined) out.entity_id = input.entity_id as string | null;

  // Practical minimum for a useful notification
  if (!out.title && !out.message) {
    throw new Error('Provide at least `title` or `message`');
  }
  if (!out.recipient_id) {
    throw new Error('`recipient_id` is required');
  }

  return out;
}

export async function POST(request: NextRequest) {
  try {
    const expectedApiKey = process.env.INTERNAL_NOTIFICATION_API_KEY;
    if (!expectedApiKey) {
      return json(500, {
        ok: false,
        error: 'INTERNAL_NOTIFICATION_API_KEY not configured',
      });
    }

    const providedApiKey = request.headers.get('x-internal-api-key');
    if (!providedApiKey || providedApiKey !== expectedApiKey) {
      return json(401, { ok: false, error: 'Unauthorized' });
    }

    let body: PostBody;
    try {
      body = (await request.json()) as PostBody;
    } catch {
      return json(400, { ok: false, error: 'Invalid JSON body' });
    }

    const table = process.env.NOTIFICATION_TABLE_NAME || 'notifications';

    // Prefer explicit `record`/`records` so schema is caller-defined.
    let payload: NotificationInsert | NotificationInsert[] | null = null;

    if (Array.isArray(body.records)) {
      if (body.records.length === 0) {
        return json(400, { ok: false, error: '`records` must not be empty' });
      }
      if (!body.records.every(isPlainObject)) {
        return json(400, { ok: false, error: '`records` must be an array of objects' });
      }
      try {
        payload = body.records.map((r) => normalizeRecord(r));
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Invalid record';
        return json(400, { ok: false, error: message });
      }
    } else if (isPlainObject(body.record)) {
      try {
        payload = normalizeRecord(body.record);
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Invalid record';
        return json(400, { ok: false, error: message });
      }
    } else {
      // Convenience mapping: {sender_id,recipient_id,event_type,priority,title,message,entity_type,entity_id} -> record
      const record: NotificationRecord = {};
      if (typeof body.sender_id === 'string' || body.sender_id === null) record.sender_id = body.sender_id;
      if (typeof body.recipient_id === 'string' || body.recipient_id === null) record.recipient_id = body.recipient_id;
      if (typeof body.event_type === 'string' || body.event_type === null) record.event_type = body.event_type;
      if (typeof body.priority === 'string' || body.priority === null) record.priority = body.priority;
      if (typeof body.title === 'string' || body.title === null) record.title = body.title;
      if (typeof body.message === 'string' || body.message === null) record.message = body.message;
      if (typeof body.entity_type === 'string' || body.entity_type === null) record.entity_type = body.entity_type;
      if (typeof body.entity_id === 'string' || body.entity_id === null) record.entity_id = body.entity_id;

      if (Object.keys(record).length === 0) {
        return json(400, {
          ok: false,
          error: 'Provide `record`, `records`, or at least `recipient_id` + (`title` or `message`)',
        });
      }

      try {
        payload = normalizeRecord(record);
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Invalid record';
        return json(400, { ok: false, error: message });
      }
    }

    const supabase = getServiceClient();

    const { data, error } = await supabase.from(table).insert(payload).select('*');

    if (error) {
      return json(400, { ok: false, error: error.message, details: error.details });
    }

    return json(200, { ok: true, data });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unexpected error';
    return json(500, { ok: false, error: message });
  }
}
