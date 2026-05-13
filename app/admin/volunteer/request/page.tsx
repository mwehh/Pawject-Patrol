"use client";

import React, { useEffect, useState } from "react";
import {Menu, LogIn, X, Facebook, Instagram, Twitter, Mail} from "lucide-react";
import { supabase } from "@/utils/supabase/client";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { Suspense } from "react";
import AdminNotificationsBell from "@/components/AdminNotificationsBell";

// Field Components
function Field({ label, placeholder, type = "text", value, onChange, required }: any) {
  return (
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
        {label} {required && <span style={{ color: 'red' }}>*</span>}
      </label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required={required}
        className="w-full rounded-lg px-3 py-2 text-sm text-[#3C3333] placeholder:rgba(60,51,51,0.6) focus:outline-none focus:ring-2 focus:ring-[#3C3333]"
        style={{ backgroundColor: "#C2C876" }}
      />
    </div>
  );
}

function SelectField({ label, options, value, onChange }: any) {
  return (
    <div className="rounded-3xl bg-[#E1E69D] p-2">
      <label
        className="block mb-1"
        style={{
          color: "#3C3333",
          fontFamily: '"Genty Sans", sans-serif',
          fontSize: "14px",
          fontWeight: 500,
        }}
      >
        {label}
      </label>
      <select
        value={value}
        onChange={onChange}
        className="w-full rounded-lg px-3 py-2 text-sm text-[#3C3333] focus:outline-none focus:ring-2 focus:ring-[#3C3333]"
        style={{ backgroundColor: "#C2C876" }}
      >
        {options.map((o: string) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}

function TextArea({ label, placeholder, value, onChange, required }: any) {
  return (
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
        {label} {required && <span style={{ color: 'red' }}>*</span>}
      </label>
      <textarea
        rows={4}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required={required}
        className="w-full rounded-lg px-3 py-2 text-sm text-[#3C3333] placeholder:rgba(60,51,51,0.6) focus:outline-none focus:ring-2 focus:ring-[#3C3333]"
        style={{ backgroundColor: "#C2C876" }}
      />
    </div>
  );
}

// Page component for creating a volunteer request
function RequestPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [formData, setFormData] = useState({
    call_title: "",
    call_details: "",
    call_starttime: "",
    call_endtime: "",
    call_location: "",
    capacity: "",
  });
  const [errors, setErrors] = useState<{
    call_title?: string;
    call_details?: string;
    call_starttime?: string;
    call_endtime?: string;
    call_location?: string;
    start?: string;
    end?: string;
  }>({});
  const router = useRouter();
  const searchParams = useSearchParams();

  // Check authentication on mount
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

  // Current time in local timezone
  const now = new Date();
  const tzOffset = now.getTimezoneOffset() * 60000;
  const localNow = new Date(now.getTime() - tzOffset);
  const nowMin = localNow.toISOString().slice(0, 16);

  // Prefill form fields from search parameters if available
  useEffect(() => {
    setFormData({
      call_title: searchParams?.get('call_title') || '',
      call_details: searchParams?.get('call_details') || '',
      call_starttime: searchParams?.get('call_starttime') || '',
      call_endtime: searchParams?.get('call_endtime') || '',
      call_location: searchParams?.get('call_location') || '',
      capacity: searchParams?.get('capacity') || '',
    });
  }, [searchParams]);

  // Handle form input changes
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle user logout and redirect to login page
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/admin/login");
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nowISO = new Date().toISOString().slice(0, 16);
    let hasError = false;
    const newErrors: {
      call_title?: string;
      call_details?: string;
      call_starttime?: string;
      call_endtime?: string;
      call_location?: string;
      start?: string;
      end?: string;
    } = {};
    // Validate required fields (except capacity)
    if (!formData.call_title.trim()) {
      newErrors.call_title = "Please enter title.";
      hasError = true;
    }
    if (!formData.call_details.trim()) {
      newErrors.call_details = "Please enter details.";
      hasError = true;
    }
    if (!formData.call_starttime) {
      newErrors.call_starttime = "Please enter start time.";
      hasError = true;
    }
    if (!formData.call_location.trim()) {
      newErrors.call_location = "Please enter location.";
      hasError = true;
    }
    // Validate start time
    if (formData.call_starttime && formData.call_starttime < nowISO) {
      newErrors.start = "Start time must not be before the current date and time.";
      hasError = true;
    }
    // Validate end time
    if (formData.call_endtime && formData.call_endtime < formData.call_starttime) {
      newErrors.end = "End time must not be before the start time.";
      hasError = true;
    }
    setErrors(newErrors);
    if (hasError) return;
    // Set confirm_access cookie before redirecting to confirm page
    if (typeof window !== "undefined") {
      document.cookie = "confirm_access=true; path=/; max-age=300";
    }
    const queryParams = new URLSearchParams(formData).toString();
    router.push(`/admin/volunteer/request/confirm?${queryParams}`);
  };

  // Render the request page
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
      <header className="flex items-center justify-between px-4 w-full h-[52px] bg-[#E6E6E6] mx-auto">
        <div className="w-full max-w-[1400px] mx-auto flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <Menu className="w-6 h-6 text-gray-800" />
          </button>

          <div className="flex-1 flex justify-center items-center h-full">
            <img
              src="/Moodboard2.png"
              alt="Pawject Patrol Logo"
              width={77}
              height={36}
              className="flex-shrink-0"
            />
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
            Volunteer Task Form
          </h1>

          <p
            className="text-xs sm:text-sm md:text-md"
            style={{ color: "#3C3333", fontFamily: '"Genty Sans", sans-serif' }}
          >
            Fill up details and make a announcement to display.
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
          <form onSubmit={handleSubmit} className="grid gap-[16px]">
            {/* Title Field */}
            <Field
              label="Title"
              placeholder="Enter volunteer task title"
              value={formData.call_title}
              onChange={(e: any) => {
                handleInputChange('call_title', e.target.value);
                if (errors.call_title && e.target.value.trim()) {
                  setErrors(prev => { const { call_title, ...rest } = prev; return rest; });
                }
              }}
              required={true}
            />
            {errors.call_title && (
              <p className="text-red-600 text-xs mt-1 ml-2.5">{errors.call_title}</p>
            )}

            {/* Details Field */}
            <TextArea
              label="Details"
              placeholder="Enter volunteer task details"
              value={formData.call_details}
              onChange={(e: any) => {
                handleInputChange('call_details', e.target.value);
                if (errors.call_details && e.target.value.trim()) {
                  setErrors(prev => { const { call_details, ...rest } = prev; return rest; });
                }
              }}
              required={true}
            />
            {errors.call_details && (
              <p className="text-red-600 text-xs mt-1 ml-2.5">{errors.call_details}</p>
            )}

            {/* Start and End Time */}
            <div className="grid md:grid-cols-2 gap-2">
              <div className="flex flex-col">
                <Field
                  label="Start Time"
                  type="datetime-local"
                  value={formData.call_starttime}
                  required={true}
                  onChange={(e: any) => {
                    handleInputChange('call_starttime', e.target.value);
                    if (errors.call_starttime && e.target.value) {
                      setErrors(prev => { const { call_starttime, ...rest } = prev; return rest; });
                    }
                  }}
                />
                {errors.call_starttime && (
                  <p className="text-red-600 text-xs mt-1 ml-2.5">{errors.call_starttime}</p>
                )}
                {errors.start && (
                  <p className="text-red-600 text-xs mt-1 ml-2.5">{errors.start}</p>
                )}
              </div>
              <div className="flex flex-col">
                <Field
                  label="End Time"
                  type="datetime-local"
                  value={formData.call_endtime}
                  onChange={(e: any) => {
                    handleInputChange('call_endtime', e.target.value);
                    if (errors.call_endtime && e.target.value) {
                      setErrors(prev => { const { call_endtime, ...rest } = prev; return rest; });
                    }
                  }}
                />
                {errors.call_endtime && (
                  <p className="text-red-600 text-xs mt-1 ml-2.5">{errors.call_endtime}</p>
                )}
                {errors.end && (
                  <p className="text-red-600 text-xs mt-1 ml-2.5">{errors.end}</p>
                )}
              </div>
            </div>

            {/* Location and Capacity */}
            <div className="grid md:grid-cols-2 gap-2">
              <Field
                label="Location"
                placeholder="Enter location"
                value={formData.call_location}
                onChange={(e: any) => {
                  handleInputChange('call_location', e.target.value);
                  if (errors.call_location && e.target.value.trim()) {
                    setErrors(prev => { const { call_location, ...rest } = prev; return rest; });
                  }
                }}
                required={true}
              />
              {errors.call_location && (
                <p className="text-red-600 text-xs mt-1 ml-2.5">{errors.call_location}</p>
              )}
              <Field
                label="Capacity"
                type="number"
                placeholder="Enter capacity (Leave blank for unlimited)"
                value={formData.capacity}
                onChange={(e: any) => handleInputChange('capacity', e.target.value)}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 text-sm mt-6">
              <Link 
                href="/admin/volunteer" 
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
                Confirm Request
              </button>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}

export default function RequestPageLayout() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <RequestPage />
    </Suspense>
  );
}