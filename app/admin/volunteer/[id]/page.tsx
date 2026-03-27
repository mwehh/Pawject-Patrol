"use client";

import { useEffect, useState } from "react";
import {
  Menu,
  LogIn,
  X,
  Facebook,
  Instagram,
  Twitter,
  Mail,
  Users,
  FileText,
  Home,
  LogOut,
} from "lucide-react";
import {
  getVolunteerCall,
  deleteAction,
  cancelAction,
  uncancelAction,
  completeAction,
  getVolunteerResponses,
  uncompleteAction,
} from "@/actions/volunteer/admin";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabase/client";
import Sidebar from "@/components/Sidebar";

// Volunteer type
type Volunteer = {
  call_id: string;
  call_title: string | null;
  call_details: string | null;
  call_status: string | null;
  call_starttime: string | null;
  call_endtime: string | null;
  call_location?: string | null;
  capacity?: number | null;
  created_at?: string | null;
};

// Function to determine badge classes based on status
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

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  // Format: Dec. 16, 2025, 09:00 AM
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
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

// Main component for Admin Volunteer Detail Page
export default function AdminVolunteerDetailPage(props: any) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [volunteer, setVolunteer] = useState<any>(null);
  const [responses, setResponses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Get volunteer ID from params
  useEffect(() => {
    (async () => {
      const resolvedParams: any = await props.params;
      const id = resolvedParams?.id;
      if (!id) return;
      // Always use getVolunteerResponses (service client) for admin
      const v = await getVolunteerCall(id);
      setVolunteer(v);
      const responses = await getVolunteerResponses(id);
      setResponses(responses);
      setLoading(false);
    })();
  }, [props.params]);

  // Fetch user info
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserEmail(user?.email || "");
      const nameFromMeta = user?.user_metadata?.full_name || user?.user_metadata?.name || "";
      setUserName(nameFromMeta || user?.email?.split("@")[0] || "");
    })();
  }, []);

  // Handle user logout and redirect to login page
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/admin/login");
  };

  // Render the volunteer detail page with sidebar
  return (
    <>
      {sidebarOpen && (
        <Sidebar
          variant="admin"
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          userName={userName}
          userEmail={userEmail}
          router={router}
        />
      )}
      <div className="min-h-screen bg-[#E6E6E6] w-full flex flex-col overflow-x-hidden">
        {/* Header with menu, logo, and logout button */}
        <header className="flex items-center justify-between px-2 sm:px-4 w-full h-[52px] bg-[#E6E6E6] mx-auto sticky top-0 z-20">
          <div className="w-full max-w-[1400px] mx-auto flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <Menu className="w-6 h-6 text-gray-800" />
            </button>

            <div className="flex-1 flex justify-center items-center h-full min-w-0">
              <img
                src="/Moodboard2.png"
                alt="Pawject Patrol Logo"
                width={77}
                height={36}
                className="flex-shrink-0"
              />
            </div>

            <button
              onClick={handleLogout}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <LogIn className="w-6 h-6 text-gray-800" />
            </button>
          </div>
        </header>
        {/* Main Content */}
        <main className="flex-1 w-full flex flex-col">
          {loading ? (
            <div className="py-24 text-center" style={{ color: '#3C3333', fontFamily: 'Genty Sans, sans-serif' }}>Loading...</div>
          ) : !volunteer ? (
            <div className="py-24 text-center" style={{ color: '#3C3333', fontFamily: 'Genty Sans, sans-serif' }}>Volunteer request not found.</div>
          ) : (
            <>
              <div className="py-4 sm:py-6 md:py-8" style={{ backgroundColor: '#E6E6E6' }}>
                <div className="max-w-2xl md:max-w-3xl lg:max-w-5xl mx-auto px-2 sm:px-4 md:px-6 w-full">
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
                    Volunteer Request Details
                  </h2>
                  <p className="text-xs sm:text-sm md:text-md" style={{ color: '#3C3333', fontFamily: '"Genty Sans", sans-serif' }}>
                    View and manage volunteer request information
                  </p>
                </div>
              </div>
              <div className="max-w-2xl md:max-w-3xl lg:max-w-5xl mx-auto px-2 sm:px-4 md:px-6 pb-8 w-full">
                <div className="bg-white rounded-2xl shadow-lg overflow-hidden w-full" style={{ border: '3px solid #8D52A7', borderRadius: '1rem' }}>
                  <div className="relative min-h-[112px] flex flex-col sm:flex-row items-center justify-center px-2 sm:px-6 gap-4"
                    style={{
                      backgroundColor: 'transparent',
                      borderBottom: '3px solid #8D52A7',
                      borderTop: 'none',
                      borderLeft: 'none',
                      borderRight: 'none',
                      borderRadius: '1rem 1rem 0 0'
                    }}>
                    <div className="flex flex-row items-center gap-4 justify-start w-full h-full" style={{alignItems: 'center'}}>
                      <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-full flex items-center justify-center text-base sm:text-xl" style={{ backgroundColor: '#8D52A7', color: 'white', fontFamily: 'Genty Sans, sans-serif' }}>
                        {(volunteer.call_title && volunteer.call_title[0]) ? volunteer.call_title[0].toUpperCase() : 'V'}
                      </div>
                      <div className="flex flex-col items-start justify-center">
                        <h2 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold break-words leading-tight" style={{ color: '#3C3333', fontFamily: 'Genty Sans, sans-serif' }}>
                          {volunteer.call_title || "Untitled"}
                        </h2>
                        <div
                          className="mt-1 inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold"
                          style={{
                            ...statusBadgeClasses(volunteer.call_status),
                            fontFamily: 'Genty Sans, sans-serif',
                            borderWidth: '1.5px',
                            borderStyle: 'solid',
                          }}
                        >
                          {volunteer.call_status || 'Unknown'}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="p-2 sm:p-4 md:p-6">
                    <div style={{ marginBottom: '1.5rem' }}>
                      <div style={{ color: '#3C3333', fontSize: '18px', fontWeight: 500, fontFamily: 'Genty Sans, sans-serif', marginBottom: '0.6rem' }}>
                        Description
                      </div>
                      {volunteer.call_details && (
                        <div style={{ color: '#364153', fontSize: '16px', fontWeight: 400, fontFamily: 'Arial, sans-serif', marginBottom: '1rem', marginTop: 0 }}>
                          {volunteer.call_details}
                        </div>
                      )}
                    </div>
                    {/* Responsive Info Rows */}
                    <div className="flex flex-col gap-4 md:gap-6 mb-2">
                      {/* Row 1: Start Time & Location */}
                      <div className="flex flex-col sm:flex-row gap-4 md:gap-10">
                        {/* Start Time */}
                        <div className="flex items-start gap-2 flex-1">
                          <span className="mt-[2px] text-gray-400">
                            <svg width="18" height="18" fill="none" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" stroke="#6B7280" strokeWidth="2"/><path d="M16 2v4M8 2v4M3 10h18" stroke="#6B7280" strokeWidth="2"/></svg>
                          </span>
                          <div className="flex flex-col">
                            <span className="text-[14px] font-bold text-[#4A5565] mb-0.5" style={{ fontFamily: 'Arial, sans-serif' }}>Start Time</span>
                            <span className="text-[16px] text-[#3C3333]" style={{ fontFamily: 'Arial, sans-serif' }}>{formatDateTime(volunteer.call_starttime)}</span>
                          </div>
                        </div>
                        {/* Location */}
                        <div className="flex items-start gap-2 flex-1 mt-4 sm:mt-0">
                          <span className="mt-[2px] text-gray-400">
                            <svg width="18" height="18" fill="none" viewBox="0 0 24 24"><path d="M12 21c-4.418 0-8-4.03-8-9a8 8 0 0 1 16 0c0 4.97-3.582 9-8 9Z" stroke="#6B7280" strokeWidth="2"/><circle cx="12" cy="12" r="3" stroke="#6B7280" strokeWidth="2"/></svg>
                          </span>
                          <div className="flex flex-col">
                            <span className="text-[14px] font-bold text-[#4A5565] mb-0.5" style={{ fontFamily: 'Arial, sans-serif' }}>Location</span>
                            <span className="text-[16px] text-[#3C3333]" style={{ fontFamily: 'Arial, sans-serif' }}>{volunteer.call_location || 'Unknown'}</span>
                          </div>
                        </div>
                      </div>
                      {/* Row 2: End Time & Created At */}
                      <div className="flex flex-col sm:flex-row gap-4 md:gap-10">
                        {/* End Time */}
                        <div className="flex items-start gap-2 flex-1">
                          <span className="mt-[2px] text-gray-400">
                            <svg width="18" height="18" fill="none" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" stroke="#6B7280" strokeWidth="2"/><path d="M16 2v4M8 2v4M3 10h18" stroke="#6B7280" strokeWidth="2"/></svg>
                          </span>
                          <div className="flex flex-col">
                            <span className="text-[14px] font-bold text-[#4A5565] mb-0.5" style={{ fontFamily: 'Arial, sans-serif' }}>End Time</span>
                            <span className="text-[16px] text-[#3C3333]" style={{ fontFamily: 'Arial, sans-serif' }}>{formatDateTime(volunteer.call_endtime)}</span>
                          </div>
                        </div>
                        {/* Created At */}
                        <div className="flex items-start gap-2 flex-1 mt-4 sm:mt-0">
                          <span className="mt-[2px] text-gray-400">
                            <svg width="18" height="18" fill="none" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="2" stroke="#6B7280" strokeWidth="2"/><path d="M8 2v4M16 2v4M4 10h16" stroke="#6B7280" strokeWidth="2"/></svg>
                          </span>
                          <div className="flex flex-col">
                            <span className="text-[14px] font-bold text-[#4A5565] mb-0.5" style={{ fontFamily: 'Arial, sans-serif' }}>Created At</span>
                            <span className="text-[16px] text-[#3C3333]" style={{ fontFamily: 'Arial, sans-serif' }}>{volunteer.created_at ? formatDateTime(volunteer.created_at) : '—'}</span>
                          </div>
                        </div>
                      </div>
                      {/* Volunteer Capacity (formatted like other details) */}
                      <div className="flex flex-col sm:flex-row gap-4 md:gap-10 mt-2 mb-2">
                        {/* Volunteer Capacity */}
                        <div className="flex items-start gap-2 flex-1">
                          <span className="mt-[2px] text-gray-400">
                            <svg width="18" height="18" fill="none" viewBox="0 0 24 24"><path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0 2c-4.418 0-8 1.79-8 4v2h16v-2c0-2.21-3.582-4-8-4Z" stroke="#6B7280" strokeWidth="2"/></svg>
                          </span>
                          <div className="flex flex-col w-full">
                            <span className="text-[14px] font-bold text-[#4A5565] mb-0.5" style={{ fontFamily: 'Arial, sans-serif' }}>Volunteer Capacity</span>
                            <div className="flex flex-col gap-1">
                              <div className="w-full h-3 bg-gray-100 rounded-lg overflow-hidden">
                                <div style={{
                                  width: `${typeof volunteer.capacity === 'number' && volunteer.capacity > 0
                                    ? Math.min(100, Math.round((responses.length / volunteer.capacity) * 100))
                                    : 0}%`,
                                  height: '100%',
                                  background: '#689668',
                                  borderRadius: '6px',
                                  transition: 'width 0.3s'
                                }} />
                              </div>
                              <div className="text-[16px] text-[#101828]" style={{ fontFamily: 'Arial, sans-serif' }}>
                                {typeof volunteer.capacity === 'number' ? `${responses.length}/${volunteer.capacity} ${responses.length === 1 ? 'volunteer' : 'volunteers'}` : `${responses.length} ${responses.length === 1 ? 'volunteer' : 'volunteers'}`}
                                {typeof volunteer.capacity === 'number' && (
                                  <span style={{ color: (volunteer.capacity - responses.length) === 0 ? '#DC2626' : '#10B981', fontWeight: 500, marginLeft: '0.5rem' }}>
                                    ({Math.max(0, volunteer.capacity - responses.length)} {Math.max(0, volunteer.capacity - responses.length) === 1 ? 'spot' : 'spots'} remaining)
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    {/* Volunteers Section */}
                    <div className="mt-6 sm:mt-8 border-t pt-4 sm:pt-6 w-full">
                      <h3 className="text-lg font-semibold mb-4" style={{ color: '#3C3333', fontFamily: 'Genty Sans, sans-serif' }}>
                        {responses.length === 1 ? 'Volunteer Joined' : 'Volunteers Joined'}
                      </h3>
                      {responses.length > 0 ? (
                        <div className="space-y-2 w-full">
                          {responses.map((response: any) => {
                            const userName = response.name || response.email || 'Unknown User';
                            const firstLetter = userName[0]?.toUpperCase() || 'U';
                            return (
                              <div 
                                key={response.response_id} 
                                className="flex flex-col sm:flex-row items-center justify-between p-2 sm:p-3 rounded-lg border w-full"
                                style={{ backgroundColor: '#F9FAFB', borderColor: '#E5E7EB' }}
                              >
                                <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                                  {/* Profile Picture */}
                                  <div 
                                    className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                                    style={{ backgroundColor: '#8D52A7' }}
                                  >
                                    <span className="text-sm font-bold text-white">{firstLetter}</span>
                                  </div>
                                  {/* User Info */}
                                  <div>
                                    <div className="font-medium" style={{ color: '#3C3333', fontFamily: 'Genty Sans, sans-serif' }}>
                                      {userName}
                                    </div>
                                    {response.email && response.email !== userName && (
                                      <div className="text-xs mt-0.5" style={{ color: '#6B7280', fontFamily: 'Genty Sans, sans-serif' }}>
                                        {response.email}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="text-xs mt-2 sm:mt-0" style={{ color: '#9CA3AF', fontFamily: 'Genty Sans, sans-serif' }}>
                                  {formatDateTime(response.created_at)}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-sm font-bold" style={{ color: '#6B7280', fontFamily: 'Arial, sans-serif' }}>
                          No volunteers have joined yet.
                        </div>
                      )}
                    </div>
                    <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row gap-2 sm:gap-3 w-full">
                      {/* Make all buttons stretch evenly and have the same size */}
                      <div className="flex flex-col sm:flex-row gap-3 w-full">
                        <div className="flex-1 min-w-0 flex">
                          <Link 
                            href="/admin/volunteer" 
                            className="px-4 py-2 rounded-md text-sm font-medium hover:bg-[#F3F4F6] transition-colors w-full"
                            style={{
                              backgroundColor: 'transparent',
                              color: '#6B4A6B',
                              fontFamily: 'Genty Sans, sans-serif',
                              flex: 1,
                              textAlign: 'center',
                              border: '1.5px solid #6B4A6B',
                              fontWeight: 500,
                              boxSizing: 'border-box',
                              minWidth: 0,
                            }}
                          >
                            Back
                          </Link>
                        </div>
                        {volunteer.call_status?.toLowerCase() !== 'cancelled' && volunteer.call_status?.toLowerCase() !== 'completed' && (
                          <div className="flex-1 min-w-0 flex">
                            <Link 
                              href={`/admin/volunteer/${volunteer.call_id}/edit`} 
                              className="px-4 py-2 rounded-md text-sm font-semibold hover:bg-[#F3F4F6] transition-colors w-full"
                              style={{
                                backgroundColor: 'transparent',
                                color: '#6B4A6B',
                                fontFamily: 'Genty Sans, sans-serif',
                                flex: 1,
                                textAlign: 'center',
                                border: '1.5px solid #6B4A6B',
                                fontWeight: 500,
                                boxSizing: 'border-box',
                                minWidth: 0,
                              }}
                            >
                              Edit Request
                            </Link>
                          </div>
                        )}
                        {volunteer.call_status?.toLowerCase() !== 'completed' && volunteer.call_status?.toLowerCase() !== 'cancelled' && (
                          <form action={completeAction} className="flex-1 min-w-0 flex">
                            <input type="hidden" name="id" value={volunteer.call_id} />
                            <button 
                              type="submit" 
                              className="px-4 py-2 rounded-md text-sm font-semibold hover:bg-[#F3F4F6] transition-colors w-full"
                              style={{
                                backgroundColor: 'transparent',
                                color: '#6B4A6B',
                                fontFamily: 'Genty Sans, sans-serif',
                                flex: 1,
                                textAlign: 'center',
                                border: '1.5px solid #6B4A6B',
                                fontWeight: 500,
                                boxSizing: 'border-box',
                                minWidth: 0,
                              }}
                            >
                              Complete Request
                            </button>
                          </form>
                        )}
                        {volunteer.call_status?.toLowerCase() === 'completed' && (
                          <form action={uncompleteAction} className="flex-1 min-w-0 flex">
                            <input type="hidden" name="id" value={volunteer.call_id} />
                            <button 
                              type="submit" 
                              className="px-4 py-2 rounded-md text-sm font-semibold hover:bg-[#F3F4F6] transition-colors w-full"
                              style={{
                                backgroundColor: 'transparent',
                                color: '#6B4A6B',
                                fontFamily: 'Genty Sans, sans-serif',
                                flex: 1,
                                textAlign: 'center',
                                border: '1.5px solid #6B4A6B',
                                fontWeight: 500,
                                boxSizing: 'border-box',
                                minWidth: 0,
                              }}
                            >
                              Uncomplete Request
                            </button>
                          </form>
                        )}
                        {volunteer.call_status?.toLowerCase() === 'cancelled' ? (
                          <form action={uncancelAction} className="flex-1 min-w-0 flex">
                            <input type="hidden" name="id" value={volunteer.call_id} />
                            <button 
                              type="submit" 
                              className="px-4 py-2 rounded-md text-sm font-semibold hover:bg-[#F3F4F6] transition-colors w-full"
                              style={{
                                backgroundColor: 'transparent',
                                color: '#6B4A6B',
                                fontFamily: 'Genty Sans, sans-serif',
                                flex: 1,
                                textAlign: 'center',
                                border: '1.5px solid #6B4A6B',
                                fontWeight: 500,
                                boxSizing: 'border-box',
                                minWidth: 0,
                              }}
                            >
                              Uncancel Request
                            </button>
                          </form>
                        ) : volunteer.call_status?.toLowerCase() !== 'completed' && (
                          <form action={cancelAction} className="flex-1 min-w-0 flex">
                            <input type="hidden" name="id" value={volunteer.call_id} />
                            <button 
                              type="submit" 
                              className="px-4 py-2 rounded-md text-sm font-semibold hover:bg-[#F3F4F6] transition-colors w-full"
                              style={{
                                backgroundColor: 'transparent',
                                color: '#6B4A6B',
                                fontFamily: 'Genty Sans, sans-serif',
                                flex: 1,
                                textAlign: 'center',
                                border: '1.5px solid #6B4A6B',
                                fontWeight: 500,
                                boxSizing: 'border-box',
                                minWidth: 0,
                              }}
                            >
                              Cancel Request
                            </button>
                          </form>
                        )}
                        <div className="flex-1 min-w-0 flex">
                          <button
                            type="button"
                            className="px-4 py-2 rounded-md text-sm font-semibold hover:opacity-90 transition-opacity w-full"
                            style={{
                              backgroundColor: '#6B4A6B',
                              color: 'white',
                              fontFamily: 'Genty Sans, sans-serif',
                              flex: 1,
                              textAlign: 'center',
                              border: '1.5px solid #6B4A6B',
                              fontWeight: 500,
                              boxSizing: 'border-box',
                              minWidth: 0,
                            }}
                            onClick={() => {
                              setModalError(null);
                              setShowDeleteModal(true);
                            }}
                          >
                            Delete Request
                          </button>
                        </div>
                            {/* Delete Confirmation Modal */}
                            {showDeleteModal && (
                              <div className="fixed inset-0 bg-opacity-30 backdrop-blur-[1px] flex items-center justify-center z-50 p-4">
                                <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 transition-transform duration-300 ease-out transform animate-slide-down" style={{ fontFamily: 'Genty Sans, sans-serif' }}>
                                  <h3 className="text-lg mb-2" style={{ color: '#3C3333' }}>
                                    Delete Volunteer Request?
                                  </h3>
                                  <p className="text-sm mb-6" style={{ color: '#3C3333' }}>
                                    Are you sure you want to delete <span style={{ fontWeight: 600 }}>{volunteer.call_title}</span>? This action cannot be undone.
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
                                      onClick={async () => {
                                        setModalError(null);
                                        try {
                                          const formData = new FormData();
                                          formData.append('id', volunteer.call_id);
                                          await deleteAction(formData);
                                          setShowDeleteModal(false);
                                          router.push('/admin/volunteer');
                                        } catch (err) {
                                          setModalError('Failed to delete. Please try again.');
                                        }
                                      }}
                                      className="px-6 py-2 rounded-lg text-white text-sm font-semibold hover:opacity-90 transition-all"
                                      style={{ backgroundColor: '#8D52A7' }}
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </>
  );
}