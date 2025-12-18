// Import necessary modules and types
"use client";


import { useState, useEffect, ReactNode, MouseEvent } from "react";
// ...existing code...
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Menu, LogIn, X, Facebook, Instagram, Twitter, Mail, Calendar, Clock, MapPin, User, Search } from "lucide-react";
import { listVolunteerCalls, deleteAction } from "@/actions/volunteer/admin";
import { getSignupCount } from "@/actions/volunteer/admin";
import { supabase } from "@/utils/supabase/client";
import Sidebar from "@/components/Sidebar";
import { Suspense } from "react";

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

// Main component for Admin Volunteer Page
function AdminVolunteerPage() {
    // Modal state for delete confirmation and feedback
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [modalError, setModalError] = useState<string | null>(null);
    const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
    const [pendingDeleteTitle, setPendingDeleteTitle] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [items, setItems] = useState<Volunteer[]>([]);
  const [joinedCounts, setJoinedCounts] = useState<{ [key: string]: number }>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [sortBy, setSortBy] = useState(searchParams.get('sortBy') || '');

  const [sidebarOpen, setSidebarOpen] = useState(false);

  // State for user info
  const [userName, setUserName] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string>("");
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  // Fetch volunteer calls when search or sortBy changes
  useEffect(() => {
    let mounted = true;

    const checkAdminAndFetchData = async () => {
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

      let data = await listVolunteerCalls({
        search: search || undefined,
        sortBy: column,
        sortOrder: sortOrder,
        limit: 200
      });

      // Custom sort for default (no sortBy): status hierarchy then start time
      if (!sortBy) {
        const statusRank = (status?: string | null) => {
          const s = (status || '').toLowerCase();
          if (s.includes('active') || s.includes('filled')) return 1;
          if (s.includes('ongoing')) return 2;
          if (s.includes('cancel')) return 3;
          if (s.includes('completed')) return 4;
          return 5;
        };
        data = (data as Volunteer[]).slice().sort((a, b) => {
          const rankA = statusRank(a.call_status);
          const rankB = statusRank(b.call_status);
          if (rankA !== rankB) return rankA - rankB;
          // If same status, sort by start time (earliest first)
          const tA = a.call_starttime ? new Date(a.call_starttime).getTime() : 0;
          const tB = b.call_starttime ? new Date(b.call_starttime).getTime() : 0;
          return tA - tB;
        });
      }

      setItems(data as Volunteer[]);
      setLoading(false);
    };

    checkAdminAndFetchData();
    return () => {
      mounted = false;
    };
  }, [search, sortBy]);

  // Update URL when search or sortBy changes
  const updateURL = () => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (sortBy) params.set('sortBy', sortBy);
    router.push(`/admin/volunteer?${params.toString()}`);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateURL();
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSortBy(e.target.value);
  };

  // Handle delete button click: show confirmation modal
  const handleDeleteClick = (id: string, title: string | null) => {
    setPendingDeleteId(id);
    setPendingDeleteTitle(title);
    setModalError(null);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!pendingDeleteId) return;
    setModalError(null);
    try {
      const formData = new FormData();
      formData.append("id", pendingDeleteId);
      await deleteAction(formData);
      setShowDeleteModal(false);
      setPendingDeleteId(null);
      setPendingDeleteTitle(null);
      setLoading(true);
      const data = await listVolunteerCalls({
        search: search || undefined,
        sortBy: sortBy || 'created_at',
        sortOrder: sortBy === 'call_title' || sortBy === 'call_starttime' ? 'asc' : 'desc',
        limit: 200
      });
      setItems(data as Volunteer[]);
      setLoading(false);
    } catch (err: any) {
      setModalError("Failed to delete. Please try again.");
    }
  };

  // No success modal or refresh button needed; handled in handleDeleteConfirm

  // Render the admin volunteer page
  return (
    <>
      {/* Floating Add Volunteer Request Button */}
      <Link
        href="/admin/volunteer/request"
        aria-label="Add Volunteer Request"
        className="fixed bottom-4 right-6 sm:bottom-6 sm:right-6 md:bottom-8 md:right-8 bg-[#E1E69D] text-[#3C3333] hover:text-white w-14 h-14 rounded-full flex items-center justify-center shadow-xl hover:bg-[#C2C876] transition-colors z-20"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7 animate-pulse">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </Link>

      {/* Sidebar */}
      <Sidebar
        variant="admin"
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        userName={userName}
        userEmail={userEmail}
        router={router}
      />


      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-opacity-30 backdrop-blur-[1px] flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 transition-transform duration-300 ease-out transform animate-slide-down" style={{ fontFamily: 'Genty Sans, sans-serif' }}>
            <h3 className="text-lg mb-2" style={{ color: '#3C3333' }}>
              Delete Volunteer Request?
            </h3>
            <p className="text-sm mb-6" style={{ color: '#3C3333' }}>
              Are you sure you want to delete <span style={{ fontWeight: 600 }}>{pendingDeleteTitle}</span>? This action cannot be undone.
            </p>
            {modalError && <p className="text-sm mb-2 text-red-600">{modalError}</p>}
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-6 py-2 rounded-lg text-sm transition-all"
                style={{ backgroundColor: '#E6E6E6', color: '#3C3333' }}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-6 py-2 rounded-lg text-white text-sm font-semibold hover:opacity-90 transition-all"
                style={{ backgroundColor: '#8D52A7' }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal removed: no box after delete */}

      <main className="min-h-screen" style={{ backgroundColor: '#E6E6E6' }}>
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
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                router.replace("/admin/login");
              }}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <LogIn className="w-6 h-6 text-gray-800" />
            </button>
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
              Volunteer Requests
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
          ) : null}

          {!loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {items.map((it) => {
              // ...existing code...
              return (
                <div
                  key={it.call_id}
                  className="relative bg-[#F7F7E8] border-2 border-[#8D52A7] rounded-2xl shadow-lg hover:shadow-xl transition-shadow flex flex-col justify-between min-h-[260px]"
                  style={{ fontFamily: 'Genty Sans', padding: '0' }}
                >
                  {/* Status badge */}
                  <div className="absolute top-6 left-5">
                    <span
                      className={`px-7 py-3 rounded-xl text-xs font-semibold border-2 shadow-md`}
                      style={{
                        fontFamily: '"Genty Sans", sans-serif',
                        fontWeight: 600,
                        letterSpacing: '0.02em',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                        ...statusBadgeClasses(it.call_status),
                      }}
                    >
                      {it.call_status || 'Active'}
                    </span>
                  </div>

                  {/* Card content */}
                  <div className="p-6 pt-12 flex-1 flex flex-col justify-between border-[#8D52A7]">
                    <div>
                      <h3 className="text-lg font-bold mt-8 mb-5" style={{ color: '#3C3333', fontFamily: 'Genty Sans' }}>
                        {it.call_title}
                      </h3>
                      <div className="flex flex-col gap-2 text-xs" style={{ color: '#3C3333' }}>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4 mr-1" />
                          {(() => {
                            const startDateStr = formatDate(it.call_starttime);
                            const endDateStr = it.call_endtime ? formatDate(it.call_endtime) : '';
                            const showSingleDate = it.call_endtime && startDateStr === endDateStr;
                            return showSingleDate
                              ? startDateStr
                              : `${startDateStr}${it.call_endtime ? ` - ${endDateStr}` : ''}`;
                          })()}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4 mr-1" />
                          {formatTime(it.call_starttime)}{it.call_endtime ? ` - ${formatTime(it.call_endtime)}` : ''}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-4 h-4 mr-1" />
                          {it.call_location || ''}
                        </span>
                        {/* Volunteer Capacity label and progress bar */}
                        <span className="flex items-center gap-1">
                          <User className="w-4 h-4 mr-1" />
                          Volunteer Capacity
                        </span>
                        <span>
                          <div className="w-full h-2 bg-[#E1E69D] rounded-full overflow-hidden" style={{ background: '#E5E7EB'}}>
                            <div
                              className="h-2 rounded-full"
                              style={{ width: `${(() => {
                                const hasCapacity = typeof it.capacity === 'number' && it.capacity !== null;
                                const capacity = hasCapacity ? it.capacity! : undefined;
                                const joined = typeof it.joined_count === 'number' ? it.joined_count : 0;
                                let progressPercent;
                                if (hasCapacity && capacity! > 0) {
                                  progressPercent = Math.round((joined / capacity!) * 100);
                                } else {
                                  progressPercent = joined > 0 ? 100 : 0;
                                }
                                return progressPercent;
                              })()}%`, background: '#689668', transition: 'width 0.3s' }}
                            />
                          </div>
                        </span>
                        <span className="flex items-center justify-between">
                          {(() => {
                            const hasCapacity = typeof it.capacity === 'number' && it.capacity !== null;
                            const capacity = hasCapacity ? it.capacity! : undefined;
                            const joined = typeof it.joined_count === 'number' ? it.joined_count : 0;
                            const spotsLeft = hasCapacity ? capacity! - joined : undefined;
                            if (hasCapacity) {
                              return (
                                <>
                                  <span className="text-xs text-gray-600">{joined}/{capacity} {joined === 1 ? 'volunteer' : 'volunteers'}</span>
                                  <span
                                    className={`text-xs ${spotsLeft === 0 ? 'text-red-500' : 'text-green-600'}`}
                                  >
                                    {spotsLeft} {spotsLeft === 1 ? 'spot' : 'spots'} left
                                  </span>
                                </>
                              );
                            } else {
                              return <span className="text-xs text-gray-600">{joined} {joined === 1 ? 'volunteer' : 'volunteers'}</span>;
                            }
                          })()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card actions */}
                  <div className="flex gap-4 px-6 pb-6">
                    <div className="flex-1 min-w-0 flex">
                      <Link
                        href={`/admin/volunteer/${it.call_id}`}
                        className="px-7 py-3 rounded-xl text-xs font-semibold border-2 border-[#8D52A7] text-[#8D52A7] bg-transparent text-center transition-all hover:bg-[#F7F7E8] w-full"
                        style={{ fontFamily: 'Genty Sans', flex: 1, minWidth: 0 }}
                      >
                        View Details
                      </Link>
                    </div>
                    <div className="flex-1 min-w-0 flex">
                      <button
                        className="px-7 py-3 rounded-xl text-xs font-semibold bg-[#8D52A7] text-white text-center transition-all hover:bg-[#A259A4] w-full"
                        style={{ fontFamily: 'Genty Sans', flex: 1, minWidth: 0 }}
                        onClick={() => handleDeleteClick(it.call_id ?? "", it.call_title ?? "")}
                      >
                        Delete
                      </button>
                    </div>
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

export default function AdminVolunteerPageLayout() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AdminVolunteerPage />
    </Suspense>
  );
}