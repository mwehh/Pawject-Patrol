// Import necessary modules and types
"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Menu, LogIn, X, Facebook, Instagram, Twitter, Mail, Calendar, Clock, MapPin, User, Search } from "lucide-react";
import { supabase } from "@/utils/supabase/client";
import Sidebar from "@/components/Sidebar";
import UserNotificationsBell from "@/components/UserNotificationsBell";
import { Suspense } from "react";
import { joinVolunteerCall, leaveVolunteerCall, getUserResponseStatus, getVolunteerSignupCount } from '@/actions/volunteer/user';
import { listVolunteerCalls, syncVolunteerCallStatus } from '@/actions/volunteer/admin';

// Define Volunteer type
type Volunteer = {
  call_id?: string;
  call_title?: string | null;
  call_details?: string | null;
  call_starttime?: string | null;
  call_endtime?: string | null;
  call_location?: string | null;
  capacity?: number | null;
  created_at?: string | null;
  call_status?: string | null;
  joined_count?: number;
};

// Function to determine badge classes based on status
function statusBadgeClasses(status?: string | null) {
  const s = (status || "").toLowerCase();
  if (s.includes("active")) {
    return { background: "#E1E69D", color: "#3C3333", borderColor: "#C2C876" };
  }
  if (s.includes("filled")) {
    return { background: "#C2C876", color: "#3C3333", borderColor: "#A3B18A" };
  }
  if (s.includes("ongoing")) {
    return { background: "#D1C4E9", color: "#6C3483", borderColor: "#B39DDB" };
  }
  if (s.includes("cancel")) {
    return { background: "#F8B4B4", color: "#B71C1C", borderColor: "#F44336" };
  }
  if (s.includes("completed")) {
    return { background: "#E0E0E0", color: "#616161", borderColor: "#BDBDBD" };
  }
  return { background: "#FFE082", color: "#3C3333", borderColor: "#FFD54F" };
}

function formatDate(value?: string | null) {
  if (!value) return "";
  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) return value;
    return d.toLocaleDateString(undefined, { dateStyle: 'medium' });
  } catch {
    return String(value);
  }
}

function formatTime(value?: string | null) {
  if (!value) return "";
  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) return value;
    return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: true });
  } catch {
    return String(value);
  }
}

function getVolunteerDisplayStatus(call: Volunteer, userJoined: boolean) {
  const status = (call.call_status || '').toLowerCase();
  if (status.includes('completed')) return 'Completed';
  if (status.includes('cancel')) return 'Cancelled';

  const now = new Date();
  const endTime = call.call_endtime ? new Date(call.call_endtime) : null;
  if (endTime && now >= endTime) return 'Completed';

  const startTime = call.call_starttime ? new Date(call.call_starttime) : null;
  if (startTime && now >= startTime) return 'Ongoing';

  if (userJoined) return 'Joined';

  const hasCapacity = typeof call.capacity === 'number' && call.capacity > 0;
  const joined = typeof call.joined_count === 'number' ? call.joined_count : 0;
  if (hasCapacity && joined >= (call.capacity || 0)) return 'Filled';

  return 'Active';
}

function isVolunteerCallCompleted(call: Volunteer, now = new Date()) {
  const status = (call.call_status || '').toLowerCase();
  if (status.includes('completed')) return true;
  const endTime = call.call_endtime ? new Date(call.call_endtime) : null;
  return Boolean(endTime && now >= endTime);
}

console.log("UserVolunteerPage mounted");
function UserVolunteerPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [items, setItems] = useState<Volunteer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [sortBy, setSortBy] = useState(searchParams.get('sortBy') || '');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userName, setUserName] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string>("");
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [userStatuses, setUserStatuses] = useState<{ [key: string]: string | null }>({});
  const [actionLoading, setActionLoading] = useState<string | null>(null); // call_id of loading action

  // Handle user logout and redirect to login page
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  useEffect(() => {
    let mounted = true;

    const fetchData = async () => {
      // Check authentication status
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (!mounted) return;

      if (authError || !user) {
        setIsAuthenticated(false);
        setUserName("");
        setUserEmail("");
        setLoading(false);
        return;
      }

      setIsAuthenticated(true);
      setUserEmail(user.email || "");
      const nameFromMeta = user.user_metadata?.full_name || user.user_metadata?.name || "";
      setUserName(nameFromMeta || user.email?.split("@")[0] || "");

      setLoading(true);
      const column = sortBy || 'created_at';
      const defaultAsc = column === 'call_title' || column === 'call_starttime';
      const sortOrder = defaultAsc ? 'asc' : 'desc';

      // Fetch volunteer calls
      const data = await listVolunteerCalls({
        search: search || undefined,
        sortBy: column,
        sortOrder: sortOrder,
        limit: 200
      });


      // Ensure server sync updates Supabase for each call, then fetch joined_count
      await Promise.all((data as Volunteer[])
        .filter((c) => c.call_id)
        .map((c) => syncVolunteerCallStatus(String(c.call_id))));

      const withCounts = await Promise.all(
        (data as Volunteer[]).map(async (call) => {
          if (!call.call_id) return { ...call, joined_count: 0 };
          const count = await getVolunteerSignupCount(call.call_id);
          return { ...call, joined_count: count || 0 };
        })
      );
      // Remove any calls already completed (by status or by end time) so users don't see them
      const now = new Date();
      const visible = withCounts.filter((c) => !isVolunteerCallCompleted(c, now));
      setItems(visible);

      // Fetch user response status for each call
      const statuses: { [key: string]: string | null } = {};
      for (const call of withCounts) {
        if (call.call_id) {
          statuses[call.call_id] = await getUserResponseStatus(call.call_id);
        }
      }
      setUserStatuses(statuses);

      setLoading(false);
    };

    fetchData();

    return () => {
      mounted = false;
    };
  }, [search, sortBy]);

  // Update URL when search or sortBy changes
  const updateURL = () => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (sortBy) params.set('sortBy', sortBy);
    router.push(`/volunteer?${params.toString()}`);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateURL();
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSortBy(e.target.value);
  };

  // Join/Leave logic
  const handleJoin = async (callId: string) => {
    setActionLoading(callId);
    const res = await joinVolunteerCall(callId);
    if (res.success) {
      // Update status
      setUserStatuses((prev) => ({ ...prev, [callId]: 'Pending' }));
      // Optionally, refetch items
      setItems((prev) => prev.map((it) => it.call_id === callId ? { ...it, joined_count: (it.joined_count || 0) + 1 } : it));
    } else {
      alert(res.error || 'Failed to join');
    }
    setActionLoading(null);
  };

  const handleLeave = async (callId: string) => {
    setActionLoading(callId);
    const res = await leaveVolunteerCall(callId);
    if (res.success) {
      setUserStatuses((prev) => ({ ...prev, [callId]: null }));
      setItems((prev) => prev.map((it) => it.call_id === callId ? { ...it, joined_count: Math.max((it.joined_count || 1) - 1, 0) } : it));
    } else {
      alert(res.error || 'Failed to leave');
    }
    setActionLoading(null);
  };

  // Render the admin volunteer page
  return (
    <>
    <main className="min-h-screen" style={{ backgroundColor: '#E6E6E6' }}>
      {/* Sidebar */}
      <Sidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        userName={userName}
        userEmail={userEmail ?? undefined}
        router={router}
        variant="user"
      />
      {/* Navigation Header */}
      <div className="flex items-center justify-between px-4 w-full h-[52px] bg-[#E6E6E6] mx-auto z-10">
        <div className="w-full max-w-[1200px] mx-auto flex items-center justify-between">
          <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <Menu className="w-6 h-6 text-gray-800" />
          </button>
          <div className="flex-1 flex justify-center items-center h-full">
            <Image src="/Moodboard2.png" alt="Pawject Patrol Logo" width={77} height={36} />
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
      <div className="py-8" style={{ backgroundColor: '#E6E6E6' }}>
        <div className="max-w-5xl mx-auto px-6">
          <h2 
            className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl mb-1"
            style={{
              color: '#C2C876',
              WebkitTextStrokeWidth: '.5px',
              WebkitTextStrokeColor: '#3C3333',
              fontFamily: '"Kawaii RT", sans-serif',
              fontStyle: 'normal',
              fontWeight: 400,
              lineHeight: 'normal',
              outlineColor: '#3C3333',
            }}
          >
            Volunteer Opportunities
          </h2>
          <p className="text-xs sm:text-sm md:text-md" style={{ color: '#3C3333', fontFamily: '"Genty Sans", sans-serif' }}>
            Manage upcoming volunteer opportunities
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 pb-6">
        <div className="mb-8 flex items-center justify-between gap-4">
          <form className="flex-1 relative" onSubmit={handleSearchSubmit}>
            <input
              name="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title, details, or location..."
              className="w-full max-w-md pl-10 pr-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 text-sm"
              style={{ fontFamily: 'Genty Sans' }}
            />
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
              <Search className="w-5 h-5" aria-label="Search" />
            </span>
          </form>
          <div className="flex-shrink-0">
            <label className="sr-only" htmlFor="vol-sort">Sort by</label>
            <select
              id="vol-sort"
              name="sortBy"
              value={sortBy}
              onChange={handleSortChange}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
              style={{ fontFamily: 'Genty Sans' }}
            >
              <option value="">Sort By</option>
              <option value="call_title">Name</option>
              <option value="call_starttime">Start Time</option>
              <option value="created_at">Created At</option>
              <option value="capacity">Capacity</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8" style={{ color: '#3C3333', fontFamily: 'Genty Sans' }}>Loading...</div>
        ) : (!items || items.length === 0) ? (
          <div className="text-center py-8" style={{ color: '#3C3333', fontFamily: 'Genty Sans' }}>No volunteer requests found.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {items
              .filter((it) => (it.call_status || '').toLowerCase() !== 'completed')
              .map((it) => {
              const hasCapacity = typeof it.capacity === 'number' && it.capacity !== null;
              const capacity = hasCapacity ? it.capacity! : undefined;
              const joined = typeof it.joined_count === 'number' ? it.joined_count : 0;
              const spotsLeft = hasCapacity ? capacity! - joined : undefined;
              let progressPercent;
              if (hasCapacity && capacity! > 0) {
                progressPercent = Math.round((joined / capacity!) * 100);
              } else {
                // No capacity: empty if 0 volunteers, full if 1 or more
                progressPercent = joined > 0 ? 100 : 0;
              }

              // Date display logic: show only one date if start and end are the same, and only show dash if both are present and different
              const startDateStr = formatDate(it.call_starttime);
              const endDateStr = it.call_endtime ? formatDate(it.call_endtime) : '';
              const showSingleDate = it.call_endtime && startDateStr === endDateStr;
              const showDash = it.call_endtime && startDateStr !== endDateStr && startDateStr && endDateStr;

              // User status for this call
              const userStatus = it.call_id ? userStatuses[it.call_id] : null;
              const displayStatus = getVolunteerDisplayStatus(it, Boolean(userStatus));
              const isFull = hasCapacity && joined >= capacity!;
              const canJoin = displayStatus === 'Active';
              const canLeave = Boolean(userStatus) && (displayStatus === 'Joined' || displayStatus === 'Active' || displayStatus === 'Filled');

              return (
                <div
                  key={it.call_id}
                  className="relative bg-[#F7F7E8] border-2 border-[#8D52A7] rounded-2xl shadow-lg hover:shadow-xl transition-shadow flex flex-col justify-between min-h-[260px]"
                  style={{ fontFamily: 'Genty Sans', padding: '0' }}
                >
                  {/* Status badge follows hierarchy: Completed = Cancelled > Ongoing > Filled = Joined > Active */}
                  <div className="absolute top-6 left-5">
                    {displayStatus === 'Completed' ? (
                      <span className="px-7 py-3 rounded-xl text-xs font-semibold border-2 shadow-md bg-gray-300 text-gray-700 border-gray-400"
                        style={{ fontFamily: '"Genty Sans", sans-serif', fontWeight: 600, letterSpacing: '0.02em', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                        Completed
                      </span>
                    ) : displayStatus === 'Cancelled' ? (
                      <span className="px-7 py-3 rounded-xl text-xs font-semibold border-2 shadow-md bg-red-100 text-red-700 border-red-400"
                        style={{ fontFamily: '"Genty Sans", sans-serif', fontWeight: 600, letterSpacing: '0.02em', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                        Cancelled
                      </span>
                    ) : displayStatus === 'Ongoing' ? (
                      <span className="px-7 py-3 rounded-xl text-xs font-semibold border-2 shadow-md bg-purple-100 text-purple-700 border-purple-400"
                        style={{ fontFamily: '"Genty Sans", sans-serif', fontWeight: 600, letterSpacing: '0.02em', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                        Ongoing
                      </span>
                    ) : displayStatus === 'Joined' ? (
                      <span className="px-7 py-3 rounded-xl text-xs font-semibold border-2 shadow-md bg-gray-200 text-gray-700 border-gray-400"
                        style={{ fontFamily: '"Genty Sans", sans-serif', fontWeight: 600, letterSpacing: '0.02em', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                        Joined
                      </span>
                    ) : displayStatus === 'Filled' ? (
                      <span className="px-7 py-3 rounded-xl text-xs font-semibold border-2 shadow-md bg-yellow-200 text-yellow-800 border-yellow-400"
                        style={{ fontFamily: '"Genty Sans", sans-serif', fontWeight: 600, letterSpacing: '0.02em', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                        Filled
                      </span>
                    ) : (
                      <span
                        className={`px-7 py-3 rounded-xl text-xs font-semibold border-2 shadow-md`}
                        style={{
                          fontFamily: '"Genty Sans", sans-serif',
                          fontWeight: 600,
                          letterSpacing: '0.02em',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                          ...statusBadgeClasses('active'),
                        }}
                      >
                        Active
                      </span>
                    )}
                  </div>

                  {/* Card content */}
                  <div className="p-6 pt-12 flex-1 flex flex-col justify-between border-[#8D52A7]">
                    <div>
                      <h3 className="text-lg font-bold mt-8 mb-5" style={{ color: '#3C3333', fontFamily: 'Genty Sans' }}>
                        {it.call_title}
                      </h3>
                      <div className="flex flex-col gap-2 text-xs" style={{ color: '#3C3333' }}>
                        <div className="flex items-center gap-1"><MapPin className="w-4 h-4 mr-1" /><span> {it.call_location || '—'}</span></div>
                        <div className="flex items-center gap-1"><Calendar className="w-4 h-4 mr-1" /><span> {showSingleDate ? startDateStr : <>{startDateStr}{showDash ? <> - {endDateStr}</> : endDateStr ? <> {endDateStr}</> : null}</>}</span></div>
                        <div className="flex items-center gap-1"><Clock className="w-4 h-4 mr-1" /><span> {formatTime(it.call_starttime)}{it.call_endtime ? ` - ${formatTime(it.call_endtime)}` : ''}</span></div>
                        {/* Volunteer Capacity label and progress bar */}
                        <span className="flex items-center gap-1">
                          <User className="w-4 h-4 mr-1" />
                          Volunteer Capacity
                        </span>
                        <span>
                          <div className="w-full h-2 bg-[#E1E69D] rounded-full overflow-hidden" style={{ background: '#E5E7EB'}}>
                            <div
                              className="h-2 rounded-full"
                              style={{ width: `${progressPercent}%`, background: '#689668', transition: 'width 0.3s' }}
                            />
                          </div>
                        </span>
                        <span className="flex items-center justify-between">
                          {hasCapacity ? (
                            <>
                              <span className="text-xs text-gray-600">{joined}/{capacity} {joined === 1 ? 'volunteer' : 'volunteers'}</span>
                              <span
                                className={`text-xs ${spotsLeft === 0 ? 'text-red-500' : 'text-green-600'}`}
                              >
                                {spotsLeft} {spotsLeft === 1 ? 'spot' : 'spots'} left
                              </span>
                            </>
                          ) : (
                            <span className="text-xs text-gray-600">{joined} {joined === 1 ? 'volunteer' : 'volunteers'}</span>
                          )}
                        </span>
                        </div>
                    </div>
                  </div>
                  {/* Card actions */}
                  <div className="flex gap-4 px-6 pb-6">
                    <Link
                      href={`/volunteer/${it.call_id}`}
                      className="flex-1 px-7 py-3 rounded-xl text-xs font-semibold border-2 border-[#8D52A7] text-white bg-[#8D52A7] text-center transition-all hover:bg-[#6C3483]"
                      style={{ fontFamily: 'Genty Sans', display: 'block', textDecoration: 'none' }}
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
    </>
  );
}

export default function UserVolunteerLayout() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <UserVolunteerPage />
    </Suspense>
  );
}