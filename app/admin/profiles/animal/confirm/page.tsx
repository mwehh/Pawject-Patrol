
"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import { Menu, LogIn, X, MapPin } from "lucide-react";
import { supabase } from "@/utils/supabase/client";
import { createAnimalProfile } from "@/actions/profiles/admin";
import { Suspense } from "react";

// Helper: convert animal_theme name to hex color
function getThemeColor(theme: string | null | undefined): string {
  if (!theme) return "#689668";
  const themeMap: Record<string, string> = {
    blue: "#5E9BBA",
    green: "#689668",
    orange: "#DCB57E",
    pink: "#C575AD",
    purple: "#8D52A7",
  };
  return themeMap[theme.toLowerCase()] || "#689668";
}

function AnimalProfileConfirmPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // State for sidebar and auth
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Modal/image state
  const [showImageModal, setShowImageModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resultMsg, setResultMsg] = useState<string | null>(null);

  // Extract animal data from search params
  const animal = {
    animal_id: "(pending)",
    animal_name: searchParams.get("animal_name") || searchParams.get("animalName") || "",
    animal_species: searchParams.get("animal_type") || searchParams.get("animalType") || "",
    animal_breed: searchParams.get("animal_breed") || searchParams.get("breed") || searchParams.get("animalBreed") || "",
    animal_gender: searchParams.get("animal_gender") || searchParams.get("gender") || "Unknown",
    animal_description: searchParams.get("animal_description") || searchParams.get("physicalDescription") || "",
    animal_status: searchParams.get("animal_status") || searchParams.get("status") || "",
    animal_photo: searchParams.get("photo_url") || searchParams.get("photoUrl") || "",
    created_at: null,
    animal_location: undefined,
    vaccination_status: searchParams.get("vaccination_status") || searchParams.get("vaccinationStatus") || "",
    recorder_name: searchParams.get("recorder_name") || searchParams.get("recorderName") || "",
    animal_theme: searchParams.get("animal_theme") || searchParams.get("theme") || searchParams.get("animalTheme") || "",
    date_seen: searchParams.get("date_seen") || searchParams.get("dateSeen") || "",
    area: searchParams.get("area") || "",
    landmark: searchParams.get("landmark") || "",
    road: searchParams.get("road") || "",
    latitude: searchParams.get("latitude") ? parseFloat(searchParams.get("latitude")!) : (searchParams.get("lat") ? parseFloat(searchParams.get("lat")!) : undefined),
    longitude: searchParams.get("longitude") ? parseFloat(searchParams.get("longitude")!) : (searchParams.get("lng") ? parseFloat(searchParams.get("lng")!) : undefined),
    health_issues: searchParams.get("health_issues") || searchParams.get("healthIssues") || "",
    animal_collar: searchParams.get("animal_collar") || searchParams.get("animalCollar") || "",
    other_information: searchParams.get("other_information") || searchParams.get("otherInfo") || "",
  };

  // Fetch user info for sidebar
  useEffect(() => {
    let mounted = true;
    const checkAdmin = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (!mounted) return;
        if (error || !user) {
          router.replace("/admin/login");
          return;
        }
        setUserEmail(user.email || "");
        const nameFromMeta = (user.user_metadata as any)?.full_name || (user.user_metadata as any)?.name || "";
        setUserName(nameFromMeta || user.email?.split("@")[0] || "");
      } catch (e) {
        if (mounted) router.replace("/admin/login");
      }
    };
    checkAdmin();
    return () => { mounted = false; };
  }, [router]);

  // Handle submit (confirm)
  async function handleConfirmSubmit() {
    setSubmitting(true);
    setResultMsg(null);
    try {
      let dateSeenWithTime: string | undefined = undefined;
      if (animal.date_seen) {
        const now = new Date();
        const selectedDate = new Date(animal.date_seen);
        selectedDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
        dateSeenWithTime = selectedDate.toISOString();
      }

      // Try to restore photo from sessionStorage if needed
      let fileToSend: File | undefined = undefined;
      let sendBase64: string | undefined = undefined;
      try {
        const savedData = sessionStorage.getItem("animalProfileFormData") || sessionStorage.getItem("animalReportFormData");
        if (savedData) {
          const data = JSON.parse(savedData);
          if (data.photoBase64 && data.photoName && data.photoType) {
            sendBase64 = data.photoBase64;
            const res = await fetch(data.photoBase64);
            const blob = await res.blob();
            fileToSend = new File([blob], data.photoName, { type: data.photoType });
          }
        }
      } catch (err) {}

      const res = await createAnimalProfile({
        recorder_name: animal.recorder_name || undefined,
        animal_name: animal.animal_name || undefined,
        animal_type: animal.animal_species || "other",
        animal_breed: animal.animal_breed || undefined,
        vaccination_status: animal.vaccination_status || undefined,
        animal_gender: animal.animal_gender || "Unknown",
        animal_status: animal.animal_status || undefined,
        date_seen: dateSeenWithTime,
        animal_description: animal.animal_description || undefined,
        area: animal.area || undefined,
        landmark: animal.landmark || undefined,
        road: animal.road || undefined,
        health_issues: animal.health_issues || undefined,
        animal_collar: animal.animal_collar || undefined,
        other_information: animal.other_information || undefined,
        animal_theme: animal.animal_theme || undefined,
        latitude: animal.latitude,
        longitude: animal.longitude,
        photo: fileToSend || undefined,
        photoBase64: sendBase64 || undefined,
        photoUrl: undefined,
      });

      if (!res.success) {
        setResultMsg(res.error ?? "Failed to submit");
      } else {
        setResultMsg("Report submitted successfully!");
        sessionStorage.removeItem("animalReportFormData");
        sessionStorage.removeItem("animalProfileFormData");
        setTimeout(() => router.push("/admin/profiles"), 2000);
      }
    } catch (e: any) {
      setResultMsg(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  const themeColor = getThemeColor(animal.animal_theme);

  // Handle user logout
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/admin/login");
  };

  return (
    <main className="min-h-screen bg-[#E1E69D]">
      {/* Sidebar */}
      <Sidebar
        variant="admin"
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        userName={userName}
        userEmail={userEmail}
        router={router}
      />
      {/* Navigation header */}
      <div className="flex items-center justify-between px-4 w-full h-[52px] bg-[#E6E6E6] mx-auto z-10">
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
            />
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
            {/* Mobile Logout Icon */}
            <button
              onClick={handleLogout}
              className="md:hidden p-2 hover:bg-gray-100 rounded-lg transition"
              aria-label="Logout"
            >
              <LogIn className="w-6 h-6 text-gray-800" />
            </button>
          </div>
        </div>
      </div>

      {/* Content Wrapper */}
      <div className="max-w-6xl mx-auto gap-[30px] self-stretch py-[40px] pl-[24px] pr-[24px]">
        {/* Recent Animal Card */}
        <div
          className="flex h-[172px] min-w-[327px] pt-6 px-6 pb-6 items-start self-stretch rounded-[16px] justify-between mb-6 text-white"
          style={{ backgroundColor: themeColor }}
        >
          {/* Left Side: Info */}
          <div className="flex flex-col h-full justify-between">
            <div>
              {/* ID Badge */}
              <div
                className="flex items-center gap-2 mb-2"
                style={{
                  color: "#FFF",
                  fontFamily: '"Genty Sans", sans-serif',
                }}
              >
                <span className="text-xs opacity-90 font-bold">Recent ID:</span>
                <p className="flex justify-center items-center py-[4px] pl-[12px] pr-[9.281px] rounded-full bg-white/20 text-xs">
                  To be assigned
                </p>
              </div>
              {/* Animal Name */}
              <h2
                className="text-2xl font-bold leading-none mb-2"
                style={{ fontFamily: '"Genty Sans", sans-serif' }}
              >
                {animal.animal_name || "Unnamed"}
              </h2>
            </div>

            {/* Submission Date */}
            <p
              className="text-xs "
              style={{ color: "#FFF", fontFamily: '"Genty Sans", sans-serif' }}
            >
              To be submitted on {new Date().toLocaleDateString()}
            </p>
            <p
              className="flex w-fit justify-center items-center gap-[10px] py-[4px] px-[10px] rounded-full bg-white/20 text-xs uppercase mt-2"
              style={{
                color: "#FFF",
                fontFamily: '"Genty Sans", sans-serif',
              }}
            >
              IN CAMPUS
            </p>
          </div>

          {/* Right Side: Edit & Confirm Buttons (Aligned to Bottom Right) */}
          <div className="flex gap-2 self-end">
            {/* Edit Button */}
            <button
              onClick={() => router.back()}
              className="flex justify-center items-center w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 transition"
              aria-label="Edit"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
            {/* Confirm Button */}
            <button
              onClick={handleConfirmSubmit}
              disabled={submitting}
              className="flex justify-center items-center w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 transition"
              aria-label="Confirm"
            >
              {submitting ? (
                <svg className="animate-spin w-5 h-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              )}
            </button>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
         {/* Left Column - Photo */}
          <div
            className="flex flex-col justify-center items-center gap-4 flex-[1_0_0] self-stretch p-6 rounded-2xl"
            style={{ backgroundColor: "#E6E6E6" }}
          >
            <h3
              className="flex items-center gap-[10px] self-stretch p-[10px] rounded-[8px] text-sm font-bold mb-3"
              style={{ color: "#FFF", backgroundColor: themeColor }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
              Photo
            </h3>
            <div
              className="w-full flex-1 min-h-0 rounded-[14px] flex items-center justify-center cursor-pointer hover:opacity-90 transition overflow-hidden"
              style={{ backgroundColor: "#DED8D8" }}
              onClick={() => animal.animal_photo && setShowImageModal(true)}
            >
              {animal.animal_photo ? (
                <img
                  src={animal.animal_photo}
                  alt={animal.animal_name || "Animal"}
                  className="w-full h-full max-h-104 object-cover"
                />
              ) : (
                <svg
                  className="w-12 h-12"
                  style={{ color: "#999" }}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              )}
            </div>
          </div>

          {/* Right Column - Info Cards */}
          <div className="flex flex-col gap-4">
            {/* Animal Information */}
            <div
              className="flex flex-col justify-center items-center gap-4 flex-[1_0_0] self-stretch p-6 rounded-2xl"
              style={{ backgroundColor: "#E6E6E6" }}
            >
              <h3
                className="flex items-center gap-[10px] self-stretch p-[10px] rounded-[8px] text-sm font-bold mb-3"
                style={{ color: "#FFF", backgroundColor: themeColor }}
              >
                Animal Information
              </h3>
              <div className="grid grid-cols-2 items-start gap-[10px] self-stretch text-xs">
                <div>
                  <p className="opacity-70">Type</p>
                  <p className="font-bold">{animal.animal_species || "—"}</p>
                </div>
                <div>
                  <p className="opacity-70">Breed</p>
                  <p className="font-bold">{animal.animal_breed || "—"}</p>
                </div>
                <div>
                  <p className="opacity-70">Gender</p>
                  <p className="font-bold">{animal.animal_gender || "—"}</p>
                </div>
                <div>
                  <p className="opacity-70">Vaccination Status</p>
                  <p className="font-bold">{animal.vaccination_status || "—"}</p>
                </div>
                <div>
                  <p className="opacity-70">Status</p>
                  <p className="font-bold">{animal.animal_status || "—"}</p>
                </div>
                <div>
                  <p className="opacity-70">Date Seen</p>
                  <p className="font-bold">{animal.date_seen ? new Date(animal.date_seen).toLocaleDateString() : "—"}</p>
                </div>
              </div>
            </div>

            {/* Recorder */}
            {animal.recorder_name && (
              <div
                className="flex flex-col justify-center items-center gap-4 flex-[1_0_0] self-stretch p-6 rounded-2xl"
                style={{ backgroundColor: "#E6E6E6" }}
              >
                <h3
                  className="flex items-center gap-[10px] self-stretch p-[10px] rounded-[8px] text-sm font-bold mb-3"
                  style={{ color: "#FFF", backgroundColor: themeColor }}
                >
                  Recorder
                </h3>
                <div className="w-full text-xs">
                  <p className="opacity-70">Name</p>
                  <p className="font-bold">{animal.recorder_name}</p>
                </div>
              </div>
            )}

            {/* Date Seen */}
            {animal.date_seen && (
              <div
                className="flex flex-col justify-center items-center gap-4 flex-[1_0_0] self-stretch p-6 rounded-2xl"
                style={{ backgroundColor: "#E6E6E6" }}
              >
                <h3
                  className="flex items-center gap-[10px] self-stretch p-[10px] rounded-[8px] text-sm font-bold mb-3"
                  style={{ color: "#FFF", backgroundColor: themeColor }}
                >
                  Date Seen
                </h3>
                <div className="w-full text-xs">
                  <p className="opacity-70">Date</p>
                  <p className="font-bold">{animal.date_seen ? new Date(animal.date_seen).toLocaleDateString() : "—"}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Location Details */}
        <div
          className="flex flex-col justify-center items-center gap-4 flex-[1_0_0] self-stretch p-6 rounded-2xl"
          style={{ backgroundColor: "#E6E6E6" }}
        >
          <h3
            className="flex items-center gap-[10px] self-stretch p-[10px] rounded-[8px] text-sm font-bold mb-3"
            style={{ color: "#FFF", backgroundColor: themeColor }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
            >
              <path
                d="M16.6666 8.33317C16.6666 12.494 12.0508 16.8273 10.5008 18.1657C10.3564 18.2742 10.1806 18.333 9.99992 18.333C9.81925 18.333 9.64348 18.2742 9.49909 18.1657C7.94909 16.8273 3.33325 12.494 3.33325 8.33317C3.33325 6.56506 4.03563 4.86937 5.28587 3.61913C6.53612 2.36888 8.23181 1.6665 9.99992 1.6665C11.768 1.6665 13.4637 2.36888 14.714 3.61913C15.9642 4.86937 16.6666 6.56506 16.6666 8.33317Z"
                stroke="#FFF"
                strokeWidth="1.66667"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M10 10.8335C11.3807 10.8335 12.5 9.71421 12.5 8.3335C12.5 6.95278 11.3807 5.8335 10 5.8335C8.61929 5.8335 7.5 6.95278 7.5 8.3335C7.5 9.71421 8.61929 10.8335 10 10.8335Z"
                stroke="#fff"
                strokeWidth="1.66667"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Location Details
          </h3>
          <div className="grid grid-cols-2 items-start gap-[10px] self-stretch text-xs">
            <div>
              <p className="opacity-70">Area Seen</p>
              <p className="font-bold">{animal.area || "—"}</p>
            </div>
            <div>
              <p className="opacity-70">Nearby Landmarks</p>
              <p className="font-bold">{animal.landmark || "—"}</p>
            </div>
            <div>
              <p className="opacity-70">Road/Street</p>
              <p className="font-bold">{animal.road || "—"}</p>
            </div>
          </div>
          {animal.latitude && animal.longitude ? (
            <div className="w-full h-64 rounded-lg overflow-hidden border border-gray-300 relative">
              <iframe
                id="mapFrame"
                width="100%"
                height="100%"
                frameBorder="0"
                style={{ border: 0 }}
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${Number(animal.longitude) - 0.01},${Number(animal.latitude) - 0.01},${Number(animal.longitude) + 0.01},${Number(animal.latitude) + 0.01}&layer=mapnik&marker=${animal.latitude},${animal.longitude}`}
                allowFullScreen
              />
            </div>
          ) : (
            <div
              className="w-full h-32 rounded-lg bg-[#DED8D8] flex items-center justify-center"
              style={{ color: "#999" }}
            >
              <MapPin className="w-6 h-6" />
              <span className="text-xs ml-2">No map coordinates available</span>
            </div>
          )}
        </div>

        {/* Health & Status & Additional Info Container */}
        <div className="flex flex-col gap-4 mb-6 mt-6">
          {/* HEALTH & IDENTIFICATION CARD */}
          <div
            className="flex flex-col justify-center items-center gap-4 flex-[1_0_0] self-stretch p-6 rounded-2xl"
            style={{ backgroundColor: "#E6E6E6" }}
          >
            <h3
              className="flex items-center gap-[10px] self-stretch p-[10px] rounded-[8px] text-sm font-bold mb-3"
              style={{ color: "#FFF", backgroundColor: themeColor }}
            >
              Health & Identification
            </h3>

            <div className="flex flex-col items-start gap-[12px] self-stretch text-sm">
              <div className="flex flex-col items-start gap-1 w-full pb-2">
                <p className="opacity-70">Health Issues</p>
                <p className="font-bold">{animal.health_issues || "None"}</p>
              </div>
              <div className="flex justify-between items-center w-full py-2 border-b border-gray-200/50">
                <div>
                  <p className="opacity-70">Collar</p>
                  <p className="font-bold">{animal.animal_collar || "None"}</p>
                </div>
              </div>
            </div>
          </div>

          {/* ADDITIONAL INFORMATION CARD */}
          <div
            className="flex flex-col justify-center items-center gap-4 flex-[1_0_0] self-stretch p-6 rounded-2xl"
            style={{ backgroundColor: "#E6E6E6" }}
          >
            <h3
              className="flex items-center gap-[10px] self-stretch p-[10px] rounded-[8px] text-sm font-bold mb-3"
              style={{ color: "#FFF", backgroundColor: themeColor }}
            >
              Additional Information
            </h3>
            <p className="flex flex-col items-start gap-[10px] self-stretch text-xs text-gray-700">
              {animal.other_information || "No additional information provided"}
            </p>
          </div>
        </div>

        {/* Action Buttons: Edit and Confirm & Submit */}
        <div className="pt-4 flex gap-3 pb-6">
          <button
            onClick={() => router.back()}
            className="flex-1 rounded-md border-2 border-gray-400 bg-white py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 text-center"
            style={{ fontFamily: '"Genty Sans", sans-serif' }}
          >
            Edit Report
          </button>
          <button
            onClick={handleConfirmSubmit}
            disabled={submitting}
            className="flex-1 rounded-md bg-[#8D52A7] py-3 text-sm font-semibold text-white hover:bg-[#7B4692] disabled:opacity-50 text-center"
            style={{ fontFamily: '"Genty Sans", sans-serif' }}
          >
            {submitting ? "Submitting..." : "Confirm & Submit"}
          </button>
        </div>
        {resultMsg && (
          <p
            className={`mt-2 text-sm text-center font-medium ${resultMsg.toLowerCase().includes('success') ? 'text-green-600' : 'text-red-600'}`}
          >
            {resultMsg}
          </p>
        )}
      </div>

      {/* Image Modal */}
      {showImageModal && animal.animal_photo && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4"
          onClick={() => setShowImageModal(false)}
        >
          <button
            onClick={() => setShowImageModal(false)}
            className="absolute top-4 right-4 text-white bg-black bg-opacity-50 rounded-full w-10 h-10 flex items-center justify-center hover:bg-opacity-75"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={animal.animal_photo}
            alt={animal.animal_name || "Animal"}
            className="max-w-full max-h-[90vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </main>
  );
}

export default function AnimalProfileLayout() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AnimalProfileConfirmPage />
    </Suspense>
  );
}