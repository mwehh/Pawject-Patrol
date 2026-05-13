-- Notifications retention policy (Supabase Postgres)
--
-- Goal: prevent the notifications table from growing forever.
-- Recommended: delete notifications older than 90 days.
--
-- Run this in Supabase Dashboard -> SQL Editor.

-- 1) Enable pg_cron (Supabase supports this extension on most projects)
create extension if not exists pg_cron;

-- 2) Create a cleanup function
create or replace function public.cleanup_notifications_older_than_90_days()
returns void
language plpgsql
as $$
begin
  delete from public.notifications
  where created_at < now() - interval '90 days';
end;
$$;

-- 3) Schedule it to run daily (03:00 UTC)
-- If you already scheduled a job with this name, you may need to unschedule first.
select cron.schedule(
  'cleanup-notifications-daily',
  '0 3 * * *',
  $$select public.cleanup_notifications_older_than_90_days();$$
);
