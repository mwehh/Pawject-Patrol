"use client";

import { useCallback, useState } from "react";
import Link from "next/link";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { supabase } from "@/utils/supabase/client";

type NotificationPreview = {
  notification_id: string;
  created_at: string | null;
  title?: string | null;
  message?: string | null;
  event_type?: string | null;
  priority?: string | null;
};

function toTitleCase(input: string) {
  return input
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => {
      if (/\d/.test(word) || word === word.toUpperCase()) return word;
      const lower = word.toLowerCase();
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
}

function formatTitle(n: Pick<NotificationPreview, "title" | "event_type">) {
  const raw = (n.title || n.event_type || "Notification").trim();
  const normalized = raw.replace(/[._]+/g, " ").replace(/\s+/g, " ").trim();
  return toTitleCase(normalized);
}

function priorityDotClass(priority?: string | null) {
  const p = (priority || "").toLowerCase();
  if (p === "high") return "bg-[#8D52A7]";
  if (p === "normal") return "bg-[#C2C876]";
  return "bg-gray-300";
}

function formatDateTime(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;

  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const month = months[d.getMonth()];
  const day = d.getDate().toString().padStart(2, "0");
  const year = d.getFullYear();

  let hour = d.getHours();
  const minute = d.getMinutes().toString().padStart(2, "0");
  const ampm = hour >= 12 ? "PM" : "AM";
  hour = hour % 12;
  if (hour === 0) hour = 12;
  const hourStr = hour.toString().padStart(2, "0");

  return `${month} ${day}, ${year}, ${hourStr}:${minute} ${ampm}`;
}

function formatMessageText(message: string) {
  return message.replace(
    /\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?(?:\.\d+)?(?:Z)?\b/g,
    (match) => formatDateTime(match) || match
  );
}

export default function UserNotificationsBell() {
  const [recentNotifications, setRecentNotifications] = useState<
    NotificationPreview[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLatest = useCallback(async () => {
    setLoading(true);
    setError(null);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      setRecentNotifications([]);
      setError("Unauthenticated");
      setLoading(false);
      return;
    }

    const { data, error: notifError } = await supabase
      .from("notifications")
      .select("notification_id, created_at, title, message, event_type, priority")
      .eq("recipient_id", user.id)
      .order("created_at", { ascending: false })
      .limit(3);

    if (notifError) {
      setRecentNotifications([]);
      setError(notifError.message ?? String(notifError));
    } else {
      setRecentNotifications((data as NotificationPreview[]) || []);
    }

    setLoading(false);
  }, []);

  return (
    <Popover
      onOpenChange={(open) => {
        if (open) fetchLatest();
      }}
    >
      <PopoverTrigger asChild>
        <button
          className="p-2 hover:bg-gray-200 rounded-full transition"
          aria-label="Notifications"
          type="button"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-gray-800"
          >
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        className="w-80 p-0 overflow-hidden"
        style={{ fontFamily: '"Genty Sans", sans-serif' }}
      >
        <div className="px-4 py-3 border-b bg-[#8D52A7]">
          <div className="text-sm font-medium text-center text-white">
            Recent Notifications
          </div>
        </div>

        <div className="max-h-72 overflow-auto">
          {loading ? (
            <div className="px-4 py-3 text-sm text-gray-600">Loading…</div>
          ) : error ? (
            <div className="px-4 py-3 text-sm text-gray-600">
              Failed to load notifications.
            </div>
          ) : recentNotifications.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-600">
              No notifications yet.
            </div>
          ) : (
            <ul className="divide-y">
              {recentNotifications.map((n) => (
                <li key={n.notification_id} className="px-4 py-3">
                  <div className="text-sm font-medium" style={{ color: "#3C3333" }}>
                    <span className="inline-flex items-center gap-2">
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${priorityDotClass(n.priority)}`}
                        aria-hidden="true"
                      />
                      <span className="truncate">{formatTitle(n)}</span>
                    </span>
                  </div>
                  {n.message ? (
                    <div className="mt-1 text-xs text-gray-600">
                      {formatMessageText(n.message)}
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t px-4 py-3 flex items-center justify-center">
          <Link
            href="/notifications"
            className="text-sm underline"
            style={{ color: "#3C3333" }}
          >
            View All Notifications
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
