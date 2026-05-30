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

function getCardStyle(entityType?: string | null, title?: string | null) {
  const type = (entityType || "").toLowerCase();
  const t = (title || "").toLowerCase();

  if (type === "animal_report" || t.includes("report")) {
    return {
      bgClass: "bg-[#BD2424]",
      borderColor: "border-[#A03535] border-r-black",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 57 78" fill="none" className="w-[124px] h-[124px] -ml-5 mt-5">
          <path d="M53.6363 63.4323L20.6363 5.68232C19.9167 4.41267 18.8733 3.3566 17.6123 2.62186C16.3514 1.88712 14.9181 1.5 13.4588 1.5C11.9994 1.5 10.5661 1.88712 9.3052 2.62186C8.04428 3.3566 7.00081 4.41267 6.28126 5.68232L-26.7187 63.4323C-27.446 64.6919 -27.8274 66.1214 -27.8242 67.5759C-27.821 69.0304 -27.4333 70.4582 -26.7004 71.7146C-25.9675 72.971 -24.9155 74.0112 -23.651 74.73C-22.3865 75.4487 -20.9544 75.8204 -19.5 75.8073H46.5C47.9475 75.8058 49.3691 75.4236 50.622 74.6989C51.875 73.9742 52.9153 72.9326 53.6384 71.6787C54.3615 70.4248 54.7419 69.0027 54.7416 67.5552C54.7412 66.1077 54.36 64.6859 53.6363 63.4323Z" stroke="black" strokeOpacity="0.4" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M13.5 25V47" stroke="black" strokeOpacity="0.4" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M13.5 56.5V57" stroke="black" strokeOpacity="0.4" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
    };
  }

  if (type === "volunteer_call" || t.includes("volunteer")) {
    return {
      bgClass: "bg-[#5E9BBA]",
      borderColor: "border-[#5E8EA5] border-r-black",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 59 93" fill="none" className="w-[124px] h-[124px] -ml-5 mt-5">
          <g opacity="0.6">
            <path d="M35.75 42.625V23.25C35.75 21.1946 34.9335 19.2233 33.4801 17.7699C32.0267 16.3165 30.0554 15.5 28 15.5C25.9446 15.5 23.9733 16.3165 22.5199 17.7699C21.0665 19.2233 20.25 21.1946 20.25 23.25" stroke="black" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M20.25 38.75V15.5C20.25 13.4446 19.4335 11.4733 17.9801 10.0199C16.5267 8.56652 14.5554 7.75 12.5 7.75C10.4446 7.75 8.47333 8.56652 7.01992 10.0199C5.56652 11.4733 4.75 13.4446 4.75 15.5V23.25" stroke="black" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M4.75 40.6875V23.25C4.75 21.1946 3.93348 19.2233 2.48008 17.7699C1.02667 16.3165 -0.944572 15.5 -3 15.5C-5.05543 15.5 -7.02667 16.3165 -8.48008 17.7699C-9.93348 19.2233 -10.75 21.1946 -10.75 23.25V54.25" stroke="black" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M35.7499 31C35.7499 28.9446 36.5664 26.9733 38.0198 25.5199C39.4732 24.0665 41.4445 23.25 43.4999 23.25C45.5553 23.25 47.5266 24.0665 48.98 25.5199C50.4334 26.9733 51.2499 28.9446 51.2499 31V54.25C51.2499 62.4717 47.9839 70.3567 42.1702 76.1703C36.3566 81.9839 28.4716 85.25 20.2499 85.25H12.4999C1.64991 85.25 -4.93759 81.9175 -10.7113 76.1825L-24.6613 62.2325C-25.9946 60.7559 -26.7089 58.8231 -26.6565 56.8344C-26.604 54.8456 -25.7888 52.9532 -24.3795 51.549C-22.9703 50.1447 -21.075 49.3362 -19.0861 49.2908C-17.0972 49.2453 -15.167 49.9665 -13.6951 51.305L-6.87509 58.125" stroke="black" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
          </g>
        </svg>
      ),
    };
  }

  return {
    bgClass: "bg-[#DCB57E]",
    borderColor: "border-[#AA8A5F] border-r-black",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 63 107" fill="none" className="w-[124px] h-[124px] -ml-5 mt-5">
        <path d="M0.58313 23.0585C0.58313 16.8614 -6.44766 11.9439 -15.021 13.375C-27.6069 15.4704 -33.3582 40.1518 -32.8544 44.5833C-32.4977 47.7175 -25.1637 52.2606 -16.5547 49.0417C-10.9327 46.9373 -7.81637 42.5771 -6.10437 37.8958" stroke="black" strokeOpacity="0.6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M19.6069 23.0585C19.6069 16.8614 26.6377 11.9439 35.2111 13.375C47.797 15.4704 53.5482 40.1518 53.0444 44.5833C52.6878 47.7175 45.3538 52.2606 36.7448 49.0417C31.1228 46.9373 28.4746 42.5771 26.7626 37.8958" stroke="black" strokeOpacity="0.6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M27.3335 62.4167V64.6458" stroke="black" strokeOpacity="0.6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M6.15625 72.4479H12.8438L9.5 75.7917L6.15625 72.4479Z" stroke="black" strokeOpacity="0.6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M-24.294 50.1429C-25.5417 54.961 -26.171 59.9184 -26.1665 64.8955C-26.1665 83.4957 -10.1967 93.625 9.50019 93.625C29.1971 93.625 45.1669 83.4957 45.1669 64.8955C45.1669 60.1652 44.4446 55.0872 42.9689 50.1429M1.76052 23.0273C4.3097 22.5265 6.90231 22.2801 9.50019 22.2917C12.9777 22.2917 16.1877 22.7732 19.1346 23.6559" stroke="black" strokeOpacity="0.6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    )
  };
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

      <main className="min-h-screen bg-[#E1E69D]">
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
        <div className="py-6 sm:py-8 bg-[#E1E69D]">
          <div className="max-w-5xl mx-auto px-2 sm:px-6">
            <h2
              className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl mb-1 font-bold"
              style={{
                color: "#E6E6E6",
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
              <div className="flex flex-col gap-4">
                {notifications.map((n) => {
                  const dateLabel = formattedDates[n.notification_id] || "";
                  const href = getEntityHref(n);
                  const titleLabel = formatTitle(n);
                  const cardStyle = getCardStyle(n.entity_type, n.title);

                  return (
                    <div key={n.notification_id} className="relative flex bg-white rounded-xl border border-black shadow-[0_2px_4px_rgba(0,0,0,0.05)] overflow-hidden min-h-[140px]">
                      <div className={`w-16 sm:w-20 ${cardStyle.bgClass} border-r ${cardStyle.borderColor} flex-shrink-0 flex items-start overflow-hidden`}>
                        {cardStyle.icon}
                      </div>

                      <div className="flex-1 p-4 sm:p-5 flex flex-col justify-between">
                        <div className="pr-8">
                          <div className="text-sm sm:text-base font-extrabold text-black" style={{ fontFamily: '"Genty Sans", sans-serif' }}>
                            <span className="inline-flex items-center gap-2 min-w-0">
                              <span
                                className={`h-2.5 w-2.5 rounded-full ${priorityDotClass(n.priority)}`}
                                aria-hidden="true"
                              />
                              <span className="truncate">{titleLabel}</span>
                            </span>
                          </div>

                          {dateLabel ? (
                            <div className="text-[10px] sm:text-xs text-gray-500 mt-1 mb-3" style={{ fontFamily: '"Genty Sans", sans-serif' }}>
                              {dateLabel}
                            </div>
                          ) : <div className="mt-4" />}

                          {n.message && (
                            <div className="text-[11px] sm:text-xs text-black font-semibold mb-6 leading-relaxed" style={{ fontFamily: '"Genty Sans", sans-serif' }}>
                              {formatMessageText(n.message)}
                            </div>
                          )}
                        </div>

                        <div className="mt-auto">
                          {href ? (
                            <Link
                              href={href}
                              style={{
                                color: "rgba(0, 0, 0, 0.60)",
                                textAlign: "center",
                                fontFamily: '"Genty Sans", sans-serif',
                                fontSize: "13px",
                                fontStyle: "normal",
                                fontWeight: 500,
                                lineHeight: "normal",
                              }}
                              className="uppercase hover:text-black hover:underline transition-all"
                            >
                              VIEW ITEM
                            </Link>
                          ) : <div className="h-4" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

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
