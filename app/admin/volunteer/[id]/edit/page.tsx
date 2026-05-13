"use client";

// Import necessary modules and actions
import Link from "next/link";
import Image from "next/image";
import { Menu, LogIn, X, Facebook, Instagram, Twitter, Mail } from "lucide-react";
import { getVolunteerCall } from "@/actions/volunteer/admin";
import { updateAction } from "@/actions/volunteer/admin";
import Sidebar from "@/components/Sidebar";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabase/client";

// Convert a UTC datetime string to local datetime-local input format
function toInputLocal(value?: string | null) {
  if (!value) return "";
  try {
    const d = new Date(value);
    const tzOffset = d.getTimezoneOffset();
    const local = new Date(d.getTime() - tzOffset * 60000);
    return local.toISOString().slice(0, 16);
  } catch (e) {
    return "";
  }
}

// Main component for Edit Volunteer Page
export default function EditVolunteerPage(props: any) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userName, setUserName] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string>("");
  const [id, setId] = useState<string | undefined>(undefined);
  const [v, setV] = useState<any>(undefined);
  const router = useRouter();

  const resolvedParams: any = React.use(props.params);
  const idValue = resolvedParams?.id;

  useEffect(() => {
    const fetchData = async () => {
      setId(idValue);
      const volunteerCall = await getVolunteerCall(idValue);
      setV(volunteerCall);
    };
    fetchData();
  }, [idValue]);

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

  // Loading state
  if (v === undefined) {
    return (
      <main className="min-h-screen bg-[#E6E6E6]">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="py-24 text-center" style={{ color: '#3C3333', fontFamily: '"Genty Sans", sans-serif' }}>
            Loading...
          </div>
        </div>
      </main>
    );
  }
  if (!v) {
    return (
      <main className="min-h-screen bg-[#E6E6E6]">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="py-24 text-center" style={{ color: '#3C3333', fontFamily: '"Genty Sans", sans-serif' }}>Volunteer request not found.</div>
        </div>
      </main>
    );
  }

  if (!v) {
    return (
      <main className="min-h-screen bg-[#E6E6E6]">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="py-24 text-center" style={{ color: '#3C3333', fontFamily: '"Genty Sans", sans-serif' }}>Volunteer request not found.</div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#E6E6E6]">
      {/* Sidebar */}
      <Sidebar
        variant="admin"
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        userName={userName}
        userEmail={userEmail}
        router={router}
      />
      {/* Navigation Header */}
      <div className="flex items-center justify-between px-4 w-full h-[52px] bg-[#E6E6E6] mx-auto">
        <div className="w-full max-w-[1400px] mx-auto flex items-center justify-between">
          <button
            type="button"
            className="p-2 hover:bg-gray-100 rounded-lg transition"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open sidebar"
          >
            <Menu className="w-6 h-6 text-gray-800" />
          </button>
          <div className="flex-1 flex justify-center items-center h-full">
            <Image src="/Moodboard2.png" alt="Pawject Patrol Logo" width={77} height={36} />
          </div>
          <div className="flex items-center gap-2">
            {/* Notification Icon */}
            <button className="p-2 hover:bg-gray-200 rounded-full transition">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-800">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            </button>

            {/* Logout Button (Desktop only with text, mobile uses just icon) */}
            <Link
              href="/admin/login"
              className="hidden md:flex items-center gap-2 bg-[#8D52A7] hover:bg-[#7B4692] text-white px-4 py-2 rounded-lg transition-colors font-medium text-sm"
              style={{ fontFamily: '"Genty Sans", sans-serif' }}
            >
              <span>Logout</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </Link>
            {/* Mobile Logout Icon */}
            <Link
              href="/admin/login"
              className="md:hidden p-2 hover:bg-gray-100 rounded-lg transition"
              aria-label="Logout"
            >
              <LogIn className="w-6 h-6 text-gray-800" />
            </Link>
          </div>
        </div>
      </div>

      <section className="max-w-6xl mx-auto px-4 py-6 pl-[24px] pr-[24px]">
        {/* Header Text */}
        <div className="mb-6">
          <h1
            className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl"
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
            Edit Volunteer Request
          </h1>

          <p
            className="text-xs sm:text-sm md:text-md"
            style={{ color: "#3C3333", fontFamily: '"Genty Sans", sans-serif' }}
          >
            Update volunteer request information
          </p>
        </div>

        {/* Form Container */}
        <div
          className="rounded-xl bg-[#E1E69D] border border-[#3C3333] p-6"
          style={{
            display: "flex",
            minWidth: "327px",
            flexDirection: "column",
            gap: "15px",
            alignSelf: "stretch",
          }}
        >
          <form action={updateAction} className="grid gap-[16px]">
            <input type="hidden" name="id" value={id} />
            {/* Title Field */}
            <div className="rounded-xl bg-[#E1E69D] p-2">
              <label
                className="block mb-1"
                style={{
                  color: "#3C3333",
                  fontFamily: '"Genty Sans", sans-serif',
                  fontSize: "14px",
                  fontWeight: 500,
                }}
              >
                Title *
              </label>
              <input
                name="call_title"
                placeholder="Enter volunteer task title"
                defaultValue={v.call_title || ""}
                required
                className="w-full rounded-lg px-4 py-3 text-sm text-[#3C3333] placeholder:rgba(60,51,51,0.6) focus:outline-none focus:ring-2 focus:ring-[#3C3333]"
                style={{ backgroundColor: "#C2C876", fontFamily: '"Arial", sans-serif' }}
              />
            </div>

            {/* Details Field */}
            <div className="rounded-xl bg-[#E1E69D] p-2">
              <label
                className="block mb-1"
                style={{
                  color: "#3C3333",
                  fontFamily: '"Genty Sans", sans-serif',
                  fontSize: "14px",
                  fontWeight: 500,
                  lineHeight: "14px",
                }}
              >
                Details *
              </label>
              <textarea
                name="call_details"
                rows={4}
                placeholder="Enter volunteer task details"
                defaultValue={v.call_details || ""}
                required
                className="w-full rounded-lg px-4 py-3 text-sm text-[#3C3333] placeholder:rgba(60,51,51,0.6) focus:outline-none focus:ring-2 focus:ring-[#3C3333]"
                style={{ backgroundColor: "#C2C876", fontFamily: '"Arial", sans-serif' }}
              />
            </div>

            {/* Start and End Time */}
            <div className="grid md:grid-cols-2 gap-2">
              <div className="rounded-xl bg-[#E1E69D] p-2">
                <label
                  className="block mb-1"
                  style={{
                    color: "#3C3333",
                    fontFamily: '"Genty Sans", sans-serif',
                    fontSize: "14px",
                    fontWeight: 500,
                  }}
                >
                  Start Time *
                </label>
                <input
                  name="call_starttime"
                  type="datetime-local"
                  defaultValue={toInputLocal(v.call_starttime)}
                  required
                  className="w-full rounded-lg px-4 py-3 text-sm text-[#3C3333] focus:outline-none focus:ring-2 focus:ring-[#3C3333]"
                  style={{ backgroundColor: "#C2C876", fontFamily: '"Arial", sans-serif' }}
                />
              </div>
              <div className="rounded-xl bg-[#E1E69D] p-2">
                <label
                  className="block mb-1"
                  style={{
                    color: "#3C3333",
                    fontFamily: '"Genty Sans", sans-serif',
                    fontSize: "14px",
                    fontWeight: 500,
                  }}
                >
                  End Time
                </label>
                <input
                  name="call_endtime"
                  type="datetime-local"
                  defaultValue={toInputLocal(v.call_endtime)}
                  className="w-full rounded-lg px-4 py-3 text-sm text-[#3C3333] focus:outline-none focus:ring-2 focus:ring-[#3C3333]"
                  style={{ backgroundColor: "#C2C876", fontFamily: '"Arial", sans-serif' }}
                />
              </div>
            </div>

            {/* Location and Capacity */}
            <div className="grid md:grid-cols-2 gap-2">
              <div className="rounded-xl bg-[#E1E69D] p-2">
                <label
                  className="block mb-1"
                  style={{
                    color: "#3C3333",
                    fontFamily: '"Genty Sans", sans-serif',
                    fontSize: "14px",
                    fontWeight: 500,
                  }}
                >
                  Location *
                </label>
                <input
                  name="call_location"
                  placeholder="Enter location"
                  defaultValue={v.call_location || ""}
                  required
                  className="w-full rounded-lg px-4 py-3 text-sm text-[#3C3333] placeholder:rgba(60,51,51,0.6) focus:outline-none focus:ring-2 focus:ring-[#3C3333]"
                  style={{ backgroundColor: "#C2C876", fontFamily: '"Arial", sans-serif' }}
                />
              </div>
              <div className="rounded-xl bg-[#E1E69D] p-2">
                <label
                  className="block mb-1"
                  style={{
                    color: "#3C3333",
                    fontFamily: '"Genty Sans", sans-serif',
                    fontSize: "14px",
                    fontWeight: 500,
                  }}
                >
                  Capacity
                </label>
                <input
                  name="capacity"
                  type="number"
                  min={0}
                  placeholder="Enter capacity"
                  defaultValue={typeof v.capacity === 'number' ? String(v.capacity) : ""}
                  className="w-full rounded-lg px-4 py-3 text-sm text-[#3C3333] focus:outline-none focus:ring-2 focus:ring-[#3C3333]"
                  style={{ backgroundColor: "#C2C876", fontFamily: '"Arial", sans-serif' }}
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 text-sm mt-6">
              <Link 
                href={`/admin/volunteer/${id}`} 
                className="flex-1 rounded-lg py-3 text-sm bg-[#E6E6E6] hover:bg-[#d4d4d4] transition text-center font-medium"
                style={{ color: '#8D52A7', fontFamily: '"Genty Sans", sans-serif' }}
              >
                Cancel
              </Link>
              <button 
                type="submit" 
                className="flex-1 rounded-lg bg-[#8D52A7] py-3 text-sm text-white hover:bg-[#7B4692] transition font-medium"
                style={{ fontFamily: '"Genty Sans", sans-serif' }}
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}