'use client';

import Link from "next/link";
import Image from "next/image";
import { Menu, LogIn } from "lucide-react";
import { createAction } from "@/actions/volunteer/admin";
import React, { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import AdminNotificationsBell from "@/components/AdminNotificationsBell";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabase/client";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

// Function to format datetime string for display
function formatDateTime(value?: string) {
  if (!value) return '-';
  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) return value;
    return d.toLocaleString(undefined, { 
      dateStyle: 'medium', 
      timeStyle: 'short' 
    });
  } catch {
    return value;
  }
}

// Decode base64-encoded JSON data from query parameter for pre-filling the confirmation page
function decodeData(s?: string) {
  if (!s) return null;
  try {
    const json = Buffer.from(decodeURIComponent(s), 'base64').toString('utf8');
    return JSON.parse(json);
  } catch (e) {
    return null;
  }
}

// Main component for confirming volunteer request creation
function ConfirmPage(props: any) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();
  const [userName, setUserName] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string>("");

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/admin/login");
  };

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/admin/login');
        return;
      }
      setUserName(user.user_metadata?.name || "Admin");
      setUserEmail(user.email || "admin@pawjectpatrol.com");
    };
    checkAuth();
  }, [router]);

  // Extract and decode data from search parameters
  const searchParams = useSearchParams();
  const encoded = searchParams.get('data') || undefined;

  // Load data from encoded parameter or directly from searchParams
  let data: any = decodeData(encoded);

  // Check for individual fields in searchParams if no encoded data
  if (!data && searchParams) {
    // Look for any known keys to determine if data is present
    const anyKeys = ['call_title', 'call_details', 'call_location', 'call_starttime', 'call_endtime', 'capacity', 'title'];
    // Check if any known keys are present in searchParams
    const hasAny = anyKeys.some((k) => searchParams.get(k) !== null);
    // If any known keys are found, construct the data object
    if (hasAny) {
      data = {
        call_title: searchParams.get('call_title') || searchParams.get('title') || '',
        call_details: searchParams.get('call_details') || '',
        call_location: searchParams.get('call_location') || '',
        call_starttime: searchParams.get('call_starttime') || '',
        call_endtime: searchParams.get('call_endtime') || '',
        capacity: searchParams.get('capacity') || undefined,
      };
    }
  }

  // If no data is available, show a message
  if (!data) {
    // Render message for missing data
    return (
      <main className="min-h-screen" style={{ backgroundColor: '#E6E6E6' }}>
        <div className="max-w-3xl mx-auto p-6">
          <p style={{ color: '#3C3333', fontFamily: '"Genty Sans", sans-serif' }}>No data to confirm. <Link href="/admin/volunteer/request" style={{ color: '#C2C876' }}>Return to form</Link></p>
        </div>
      </main>
    );
  }

  // Render the confirmation page
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
              <Image src="/Moodboard2.png" alt="Pawject Patrol Logo" width={77} height={36} className="flex-shrink-0" />
            </div>
            <div className="flex items-center gap-2">
              <AdminNotificationsBell />

              {/* Logout Button (Desktop only with text, mobile uses just icon) */}
              <button
                onClick={handleLogout}
                className="hidden md:flex items-center gap-2 bg-[#8D52A7] hover:bg-[#7B4692] text-white px-4 py-2 rounded-lg transition-colors font-medium text-sm"
                style={{ fontFamily: '"Genty Sans", sans-serif' }}
                type="button"
              >
                <span>Logout</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </button>
              {/* Mobile Logout Icon */}
              <button
                onClick={handleLogout}
                className="md:hidden p-2 hover:bg-gray-100 rounded-lg transition"
                aria-label="Sign out"
                type="button"
              >
                <LogIn className="w-6 h-6 text-gray-800" />
              </button>
            </div>
          </div>
        </header>
        {/* Main Content */}
        <main className="flex-1 w-full flex flex-col">
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
                Confirm Volunteer Request
              </h2>
              <p className="text-xs sm:text-sm md:text-md" style={{ color: '#3C3333', fontFamily: '"Genty Sans", sans-serif' }}>
                Review before creating
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
                    {(data.call_title || data.title) && (data.call_title || data.title)[0] ? (data.call_title || data.title)[0].toUpperCase() : 'V'}
                  </div>
                  <div className="flex flex-col items-start justify-center">
                    <h2 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold break-words leading-tight" style={{ color: '#3C3333', fontFamily: 'Genty Sans, sans-serif' }}>
                      {data.call_title || data.title || "Untitled"}
                    </h2>
                  </div>
                </div>
              </div>
              <div className="p-2 sm:p-4 md:p-6">
                <div style={{ marginBottom: '1.5rem' }}>
                  <div style={{ color: '#3C3333', fontSize: '18px', fontWeight: 500, fontFamily: 'Genty Sans, sans-serif', marginBottom: '0.6rem' }}>
                    Description
                  </div>
                  {data.call_details && (
                    <div style={{ color: '#364153', fontSize: '16px', fontWeight: 400, fontFamily: 'Arial, sans-serif', marginBottom: '1rem', marginTop: 0 }}>
                      {data.call_details}
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
                        <span className="text-[16px] text-[#3C3333]" style={{ fontFamily: 'Arial, sans-serif' }}>{formatDateTime(data.call_starttime)}</span>
                      </div>
                    </div>
                    {/* Location */}
                    <div className="flex items-start gap-2 flex-1 mt-4 sm:mt-0">
                      <span className="mt-[2px] text-gray-400">
                        <svg width="18" height="18" fill="none" viewBox="0 0 24 24"><path d="M12 21c-4.418 0-8-4.03-8-9a8 8 0 0 1 16 0c0 4.97-3.582 9-8 9Z" stroke="#6B7280" strokeWidth="2"/><circle cx="12" cy="12" r="3" stroke="#6B7280" strokeWidth="2"/></svg>
                      </span>
                      <div className="flex flex-col">
                        <span className="text-[14px] font-bold text-[#4A5565] mb-0.5" style={{ fontFamily: 'Arial, sans-serif' }}>Location</span>
                        <span className="text-[16px] text-[#3C3333]" style={{ fontFamily: 'Arial, sans-serif' }}>{data.call_location || 'Unknown'}</span>
                      </div>
                    </div>
                  </div>
                  {/* Row 2: End Time & Capacity */}
                  <div className="flex flex-col sm:flex-row gap-4 md:gap-10">
                    {/* End Time */}
                    <div className="flex items-start gap-2 flex-1">
                      <span className="mt-[2px] text-gray-400">
                        <svg width="18" height="18" fill="none" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" stroke="#6B7280" strokeWidth="2"/><path d="M16 2v4M8 2v4M3 10h18" stroke="#6B7280" strokeWidth="2"/></svg>
                      </span>
                      <div className="flex flex-col">
                        <span className="text-[14px] font-bold text-[#4A5565] mb-0.5" style={{ fontFamily: 'Arial, sans-serif' }}>End Time</span>
                        <span className="text-[16px] text-[#3C3333]" style={{ fontFamily: 'Arial, sans-serif' }}>{formatDateTime(data.call_endtime)}</span>
                      </div>
                    </div>
                    {/* Capacity */}
                    <div className="flex items-start gap-2 flex-1 mt-4 sm:mt-0">
                      <span className="mt-[2px] text-gray-400">
                        <svg width="18" height="18" fill="none" viewBox="0 0 24 24"><path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0 2c-4.418 0-8 1.79-8 4v2h16v-2c0-2.21-3.582-4-8-4Z" stroke="#6B7280" strokeWidth="2"/></svg>
                      </span>
                      <div className="flex flex-col w-full">
                        <span className="text-[14px] font-bold text-[#4A5565] mb-0.5" style={{ fontFamily: 'Arial, sans-serif' }}>Volunteer Capacity</span>
                        <span className="text-[16px] text-[#3C3333]" style={{ fontFamily: 'Arial, sans-serif' }}>{data.capacity && data.capacity !== '' ? data.capacity : 'Unlimited'}</span>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Buttons Section */}
                <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row gap-2 sm:gap-3 w-full">
                  <div className="flex flex-col sm:flex-row gap-3 w-full">
                    <div className="flex-1 min-w-0 flex">
                      {(() => {
                        const params = new URLSearchParams();
                        params.set('call_title', String(data.call_title || data.title || ''));
                        if (data.call_details) params.set('call_details', String(data.call_details));
                        if (data.call_location) params.set('call_location', String(data.call_location));
                        if (data.call_starttime) params.set('call_starttime', String(data.call_starttime));
                        if (data.call_endtime) params.set('call_endtime', String(data.call_endtime));
                        if (typeof data.capacity !== 'undefined' && data.capacity !== null) params.set('capacity', String(data.capacity));
                        const href = '/admin/volunteer/request?' + params.toString();
                        return (
                          <Link 
                            href={href} 
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
                            Edit
                          </Link>
                        );
                      })()}
                    </div>
                    <form action={createAction} className="flex-1 min-w-0 flex justify-end">
                      <input type="hidden" name="call_title" value={data.call_title || data.title || ''} />
                      <input type="hidden" name="call_details" value={data.call_details || ''} />
                      <input type="hidden" name="call_location" value={data.call_location || ''} />
                      <input type="hidden" name="call_starttime" value={data.call_starttime || ''} />
                      <input type="hidden" name="call_endtime" value={data.call_endtime || ''} />
                      <input type="hidden" name="capacity" value={String(data.capacity ?? '')} />
                      <button 
                        type="submit" 
                        className="px-4 py-2 rounded-md text-sm font-semibold hover:opacity-90 transition-opacity w-full"
                        style={{ backgroundColor: '#6B4A6B', color: 'white', fontFamily: 'Genty Sans, sans-serif', flex: 1, textAlign: 'center', fontWeight: 500, boxSizing: 'border-box', minWidth: 0 }}
                      >
                        Confirm & Create
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}

export default function ConfirmPageLayout() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ConfirmPage />
    </Suspense>
  );
}