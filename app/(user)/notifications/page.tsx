"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Menu, LogIn } from "lucide-react";
import { useRouter } from "next/navigation";

import Sidebar from "@/components/Sidebar";
import UserNotificationsBell from "@/components/UserNotificationsBell";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { supabase } from "@/utils/supabase/client";

type NotificationRow = {
  notification_id: string;
  created_at: string | null;
  updated_at?: string | null;
  sender_id?: string | null;
  recipient_id?: string | null;
  event_type?: string | null;
  priority?: string | null;
  title?: string | null;
  message?: string | null;
  entity_type?: string | null;
  entity_id?: string | null;
};

function formatDateTime(
  value?: string | null,
  options?: {
    includeSeconds?: boolean;
  }
) {
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
  const second = d.getSeconds().toString().padStart(2, "0");
  const ampm = hour >= 12 ? "PM" : "AM";
  hour = hour % 12;
  if (hour === 0) hour = 12;
  const hourStr = hour.toString().padStart(2, "0");

  const time = options?.includeSeconds
    ? `${hourStr}:${minute}:${second} ${ampm}`
    : `${hourStr}:${minute} ${ampm}`;

  return `${month} ${day}, ${year}, ${time}`;
}

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

function formatTitle(n: Pick<NotificationRow, "title" | "event_type">) {
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

function formatMessageText(message: string) {
  return message.replace(
    /\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?(?:\.\d+)?(?:Z)?\b/g,
    (match) => formatDateTime(match, { includeSeconds: false }) || match
  );
}

function getEntityHref(n: NotificationRow): string | null {
  if (!n.entity_type || !n.entity_id) return null;

  switch (n.entity_type) {
    case "animal_report":
      return `/form/confirm/${n.entity_id}`;
    case "volunteer_call":
      return `/volunteer/${n.entity_id}`;
    default:
      return null;
  }
}

export default function UserNotificationsPage() {
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  const PAGE_SIZE = 10;
  const MAX_UI_PAGES = 10;

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sortBy, setSortBy] = useState<'priority' | 'created_at'>('priority');

  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");

  const formattedDates = useMemo(() => {
    const out: Record<string, string> = {};
    for (const n of notifications) {
      out[n.notification_id] = formatDateTime(n.created_at, {
        includeSeconds: true,
      });
    }
    return out;
  }, [notifications]);

  useEffect(() => {
    let mounted = true;

    let inFlight = 0;

    const run = async () => {
      const requestId = ++inFlight;
      setLoading(true);
      setFetchError(null);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!mounted || requestId !== inFlight) return;

      if (!user) {
        router.replace("/login");
        return;
      }

      setUserEmail(user.email || "");
      const nameFromMeta =
        user.user_metadata?.full_name || user.user_metadata?.name || "";
      setUserName(nameFromMeta || user.email?.split("@")[0] || "");

      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query: any = supabase
        .from("notifications")
        .select(
          "notification_id, created_at, updated_at, sender_id, recipient_id, event_type, priority, title, message, entity_type, entity_id",
          { count: "exact" }
        )
        .eq("recipient_id", user.id);

      // Apply ordering according to user selection
      if (sortBy === 'priority') {
        // Primary: priority (alphabetical ascending typically places 'high' before 'normal'),
        // Secondary: created_at descending so newest items within same priority appear first.
        query = query.order('priority', { ascending: true }).order('created_at', { ascending: false });
      } else {
        // Primary: created_at descending, Secondary: priority ascending so higher-priority labels like 'high' appear first.
        query = query.order('created_at', { ascending: false }).order('priority', { ascending: true });
      }

      const { data, error, count } = await query.range(from, to);

      if (!mounted || requestId !== inFlight) return;

      if (error) {
        setFetchError(error.message ?? String(error));
      } else {
        setNotifications((data as NotificationRow[]) || []);

        const rawTotalPages = Math.max(
          1,
          Math.ceil(((count ?? 0) as number) / PAGE_SIZE)
        );
        const clampedTotalPages = Math.min(MAX_UI_PAGES, rawTotalPages);
        setTotalPages(clampedTotalPages);

        if (page > clampedTotalPages) {
          setPage(clampedTotalPages);
          // Let the next effect run refetch the correct page.
        }
      }

      setLoading(false);
    };

    const onFocus = () => {
      // When user returns to the tab/window, refresh.
      run();
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") run();
    };

    run();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      mounted = false;
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [router, page, sortBy]);

  // Re-run when sort preference changes
  useEffect(() => {
    setPage(1);
  }, [sortBy]);

  return (
    <>
      <Sidebar
        variant="user"
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        userName={userName}
        userEmail={userEmail}
        router={router}
      />

      <main className="min-h-screen bg-[#E6E6E6]">
        {/* Navigation Header */}
        <div className="flex items-center justify-between px-2 sm:px-4 w-full h-[52px] bg-[#E6E6E6] mx-auto z-10">
          <div className="w-full max-w-[1200px] mx-auto flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <Menu className="w-6 h-6 text-gray-800" />
            </button>
            <div className="flex-1 flex justify-center items-center h-full">
              <Image
                src="/Moodboard2.png"
                alt="Pawject Patrol Logo"
                width={77}
                height={36}
                className="w-16 h-auto sm:w-[77px]"
              />
            </div>
            <div className="flex items-center gap-2">
              <UserNotificationsBell />
              <button
                onClick={handleLogout}
                className="hidden md:flex items-center gap-2 bg-[#8D52A7] hover:bg-[#7B4692] text-white px-4 py-2 rounded-lg transition-colors font-medium text-sm"
                style={{ fontFamily: '"Genty Sans", sans-serif' }}
              >
                <span>Logout</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </button>

              <button
                onClick={handleLogout}
                className="md:hidden p-2 hover:bg-gray-100 rounded-lg transition"
                aria-label="Sign out"
              >
                <LogIn className="w-6 h-6 text-gray-800" />
              </button>
            </div>
          </div>
        </div>

        {/* Page Header */}
        <div className="py-6 sm:py-8 bg-[#E6E6E6]">
          <div className="max-w-5xl mx-auto px-2 sm:px-6">
            <h2
              className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl mb-1 font-bold"
              style={{
                color: "#C2C876",
                WebkitTextStrokeWidth: ".5px",
                WebkitTextStrokeColor: "#3C3333",
                fontFamily: '"Kawaii RT", sans-serif',
                fontStyle: "normal",
                fontWeight: 400,
                lineHeight: "normal",
                outlineColor: "#3C3333",
              }}
            >
              Notifications
            </h2>
            <p
              className="text-xs sm:text-sm md:text-base"
              style={{
                color: "#3C3333",
                fontFamily: '"Genty Sans", sans-serif',
              }}
            >
              Recent updates related to animal reports, profiles, and volunteer calls
            </p>
            <div className="mt-3 flex flex-wrap items-center justify-start sm:justify-end gap-2 sm:gap-3">
              <label className="text-sm" style={{ color: "#3C3333", fontFamily: '"Genty Sans", sans-serif' }}>
                Sort by:
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'priority' | 'created_at')}
                className="text-sm rounded-lg border border-gray-300 bg-white px-3 py-2 shadow-sm"
                style={{ color: '#3C3333', fontFamily: '"Genty Sans", sans-serif' }}
              >
                <option value="priority">Priority</option>
                <option value="created_at">Created At</option>
              </select>
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-2 sm:px-6 pb-6">
          {loading ? (
            <div
              className="text-center py-8"
              style={{ color: "#3C3333", fontFamily: '"Genty Sans"' }}
            >
              Loading notifications…
            </div>
          ) : fetchError ? (
            <div
              className="text-center py-8"
              style={{ color: "#3C3333", fontFamily: '"Genty Sans"' }}
            >
              Failed to load notifications: {fetchError}
            </div>
          ) : notifications.length === 0 ? (
            <div
              className="text-center py-8"
              style={{ color: "#3C3333", fontFamily: '"Genty Sans"' }}
            >
              No notifications yet.
            </div>
          ) : (
            <>
              <ul className="divide-y divide-gray-200 bg-white rounded-2xl border shadow-lg">
                {notifications.map((n) => {
                  const dateLabel = formattedDates[n.notification_id] || "";
                  const href = getEntityHref(n);
                  const titleLabel = formatTitle(n);

                  return (
                    <li key={n.notification_id} className="p-4 sm:p-5">
                      <div className="flex flex-col gap-1">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 sm:gap-3">
                          <div className="min-w-0 flex-1">
                            <div
                              className="text-sm sm:text-base font-semibold"
                              style={{
                                color: "#3C3333",
                                fontFamily: '"Genty Sans", sans-serif',
                              }}
                            >
                              <span className="inline-flex items-center gap-2 min-w-0">
                                <span
                                  className={`h-2.5 w-2.5 rounded-full ${priorityDotClass(n.priority)}`}
                                  aria-hidden="true"
                                />
                                <span className="truncate">{titleLabel}</span>
                              </span>
                            </div>
                          </div>

                          {dateLabel ? (
                            <div
                              className="text-[11px] sm:text-xs whitespace-nowrap self-start sm:self-auto"
                              style={{
                                color: "#3C3333",
                                fontFamily: '"Genty Sans", sans-serif',
                              }}
                            >
                              {dateLabel}
                            </div>
                          ) : null}
                        </div>

                        {n.message ? (
                          <div
                            className="text-xs sm:text-sm mt-2"
                            style={{
                              color: "#3C3333",
                              fontFamily: '"Genty Sans", sans-serif',
                            }}
                          >
                            {formatMessageText(n.message)}
                          </div>
                        ) : null}

                        {href ? (
                          <div className="mt-3">
                            <Link
                              href={href}
                              className="inline-flex items-center text-xs sm:text-sm underline"
                              style={{
                                color: "#3C3333",
                                fontFamily: '"Genty Sans", sans-serif',
                              }}
                            >
                              View related item
                            </Link>
                          </div>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>

              {totalPages > 1 ? (
                <div className="mt-4">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            setPage((p) => Math.max(1, p - 1));
                          }}
                          aria-disabled={page === 1}
                          className={page === 1 ? "pointer-events-none opacity-50" : undefined}
                        />
                      </PaginationItem>

                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                        (p) => (
                          <PaginationItem key={p}>
                            <PaginationLink
                              href="#"
                              isActive={p === page}
                              onClick={(e) => {
                                e.preventDefault();
                                setPage(p);
                              }}
                            >
                              {p}
                            </PaginationLink>
                          </PaginationItem>
                        )
                      )}

                      <PaginationItem>
                        <PaginationNext
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            setPage((p) => Math.min(totalPages, p + 1));
                          }}
                          aria-disabled={page === totalPages}
                          className={page === totalPages ? "pointer-events-none opacity-50" : undefined}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              ) : null}
            </>
          )}
        </div>
      </main>
    </>
  );
}
