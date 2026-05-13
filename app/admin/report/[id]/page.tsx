"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Menu, LogIn, ChevronLeft, ChevronRight, X, Facebook, Instagram, Twitter, Mail} from "lucide-react";
import dynamic from "next/dynamic";
import { supabase } from "@/utils/supabase/client";
import { updateReportStatus } from "@/actions/form/admin";
import Sidebar from "@/components/Sidebar";

// Dynamically import the AdminMapView component for client-side rendering only
const AdminMapView = dynamic(() => import("@/components/AdminMapView"), {
  ssr: false,
});

// Define the ReportData type to match the database schema
type ReportData = {
  report_id: string;
  report_title: string | null;
  animal_name: string | null;
  animal_type: string | null;
  animal_gender: string | null;
  date_seen: string | null;
  animal_description: string | null;
  area: string | null;
  landmark: string | null;
  road: string | null;
  latitude: number | null;
  longitude: number | null;
  photo_url: string | null;
  report_status: string | null;
  health_issues?: string | null;
  animal_collar?: string | null;
  other_information?: string | null;
  report_theme?: string | null;
  reporter_name?: string | null;
};

// Admin report detail page component - displays full report information and allows status updates
export default function AdminReportDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();

  // State management for report data and UI states
  const [id, setId] = useState<string | null>(null);
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [status, setStatus] = useState<string>("Pending");
  const [activeTab, setActiveTab] = useState<"overview" | "animalinfo" | "location" | "health">("overview");
  const [allReportIds, setAllReportIds] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [totalReports, setTotalReports] = useState<number>(0);
  const [showImageModal, setShowImageModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

   // User info state for sidebar
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Fetch report data on component mount
  useEffect(() => {
    // Mounting flag to prevent state updates after unmount
    let mounted = true;

    // Fetch data with authentication and authorization checks
    const fetchData = async () => {
        // Await params
        const resolvedParams = await params;
        const reportId = resolvedParams.id;

        const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (!mounted) return;

      // Handle authentication errors
      if (authError || !user) {
        setError("Not authenticated");
        setLoading(false);
        return;
      }

      setUserEmail(user.email || "");
      const nameFromMeta = user.user_metadata?.full_name || user.user_metadata?.name || "";
      setUserName(nameFromMeta || user.email?.split("@")[0] || "");

      // Set report ID in state
      if (!mounted) return;
      setId(reportId);

      // Validate report ID
      if (!reportId || reportId.trim() === "") {
        setError("Invalid report ID");
        setLoading(false);
        return;
      }

      // Handle authentication errors
      if (authError || !user) {
        setError("Not authenticated");
        setLoading(false);
        return;
      }

      // Verify user is an admin
      const { data: admin, error: adminError } = await supabase
        .from("admin")
        .select("auth_id")
        .eq("auth_id", user.id)
        .maybeSingle();

      // Check if component is still mounted
      if (!mounted) return;

      // Handle admin check errors
      if (adminError || !admin) {
        setError("Unauthorized");
        setLoading(false);
        return;
      }

      // Fetch all report IDs first to enable navigation
      const { data: allReports, error: allReportsError } = await supabase
        .from("animal_report")
        .select("report_id")
        .order("created_at", { ascending: false });

      if (!mounted) return;

      if (!allReportsError && allReports) {
        const reportIds = allReports.map(r => r.report_id);
        setAllReportIds(reportIds);
        setTotalReports(reportIds.length);
        const index = reportIds.indexOf(reportId);
        setCurrentIndex(index >= 0 ? index : 0);
      }

      // Fetch complete report data from database
      const { data: reportData, error: reportError } = await supabase
        .from("animal_report")
        .select("*")
        .eq("report_id", reportId)
        .single();

      if (!mounted) return;

      // Handle report fetch errors
      if (reportError || !reportData) {
        console.error("Report fetch error:", reportError);
        setError(`Report not found (ID: ${reportId})`);
        setLoading(false);
        return;
      }

      // Set report data and status in state
      setData(reportData);
      setStatus(reportData.report_status || "Pending");
      setLoading(false);
    };

    // Execute fetch on mount
    fetchData();

    // Cleanup function to prevent state updates after unmount
    return () => {
      mounted = false;
    };
  }, [params]);

  // Navigate to previous report
  const goToPrevious = () => {
    if (currentIndex > 0 && allReportIds.length > 0) {
      const prevId = allReportIds[currentIndex - 1];
      router.push(`/admin/report/${prevId}`);
    }
  };

  // Navigate to next report
  const goToNext = () => {
    if (currentIndex < allReportIds.length - 1 && allReportIds.length > 0) {
      const nextId = allReportIds[currentIndex + 1];
      router.push(`/admin/report/${nextId}`);
    }
  };

  // Handle report status updates (Accept/Reject)
  const handleStatusUpdate = async (newStatus: 'Accepted' | 'Rejected' | 'Pending') => {
    // Prevent redundant status updates
    if (status === newStatus) {
      return;
    }
    // Validate data presence
    if (!data) return;

    // Update status in backend
    setUpdating(true);

    // Call the updateReportStatus action
    const result = await updateReportStatus(data.report_id, newStatus);

    // Handle result
    if (result.success) {
      setStatus(newStatus);
      router.refresh();
    } else {
      // Show error alert on failure
      alert(`Failed to update status: ${result.error}`);
    }
    // Finalize updating state
    setUpdating(false);
  };

  // Show loading state while fetching data
  if (loading) {
    return (
      <main
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "#E1E69D" }}
      >
        <p
          className="text-sm"
          style={{
            color: "#3C3333",
            fontFamily: '"Genty Sans", sans-serif',
          }}
        >
          Loading...
        </p>
      </main>
    );
  }

  // Show error state if data fetch failed
  if (error || !data) {
    return (
      <main
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "#E1E69D" }}
      >
        <div className="text-center">
          <p
            className="text-sm"
            style={{
              color: "#3C3333",
              fontFamily: '"Genty Sans", sans-serif',
            }}
          >
            {error || "Report not found"}
          </p>
          <Link
            href="/admin/report"
            className="text-xs mt-2 inline-block hover:opacity-90"
            style={{
              color: "#8D52A7",
              fontFamily: '"Genty Sans", sans-serif',
            }}
          >
            ← Back to reports
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen" style={{ backgroundColor: "#E1E69D" }}>
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
      <div className="flex items-center justify-between px-4 w-full h-[52px] bg-[#E6E6E6] sticky top-0 z-20">
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
              onClick={async () => {
                await supabase.auth.signOut();
                router.replace("/admin/login");
              }}
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
              onClick={async () => {
                await supabase.auth.signOut();
                router.replace("/admin/login");
              }}
              className="md:hidden p-2 hover:bg-gray-100 rounded-lg transition"
              aria-label="Logout"
            >
              <LogIn className="w-6 h-6 text-gray-800" />
            </button>
          </div>
        </div>
      </div>

      {/* Content Container */}
      <div className="max-w-6xl mx-auto px-4 py-0 pl-[24px] pr-[24px]">
        <div className="flex flex-col items-center mt-8">
          {/* Navigation arrows and Main Card Container */}
          <div className="relative w-full flex flex-col items-center">
          {/* Left arrow */}
          {currentIndex > 0 && (
            <button
              onClick={goToPrevious}
              className="absolute left-[-60px] top-1/2 -translate-y-1/2 w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors z-10"
              aria-label="Previous report"
            >
              <ChevronLeft className="w-6 h-6 text-gray-700" />
            </button>
          )}

          {/* Right arrow */}
          {currentIndex < allReportIds.length - 1 && (
            <button
              onClick={goToNext}
              className="absolute right-[-60px] top-1/2 -translate-y-1/2 w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors z-10"
              aria-label="Next report"
            >
              <ChevronRight className="w-6 h-6 text-gray-700" />
            </button>
          )}

          {/* Main Card Container */}
          <div
            className="flex flex-col items-center w-full overflow-hidden bg-white rounded-2xl"
          >
            {/* Report Header - Purple Section */}
            <div
              className="flex flex-col items-start gap-[10px] w-full p-6"
              style={{ backgroundColor: "#8D52A7" }}
            >
              <div className="flex w-full justify-between items-center">
                <p
                  className="text-xs text-white opacity-80"
                  style={{ fontFamily: '"Genty Sans", sans-serif' }}
                >
                  Report ID: {data.report_id}
                </p>
                <span
                  className="text-sm font-semibold px-3 py-1 rounded-full"
                  style={{
                    backgroundColor: status === "Accepted" ? "#9BBF94" : status === "Rejected" ? "#FCA5A5" : "#FDE68A",
                    color: status === "Accepted" ? "#166534" : status === "Rejected" ? "#991B1B" : "#92400E",
                    fontFamily: '"Genty Sans", sans-serif',
                  }}
                >
                  {status}
                </span>
              </div>

              <h2
                className="text-2xl font-bold text-white"
                style={{ fontFamily: '"Genty Sans", sans-serif' }}
              >
                {data.report_title || "Untitled Report"}
              </h2>

              <p
                className="text-sm text-white opacity-90"
                style={{ fontFamily: '"Genty Sans", sans-serif' }}
              >
                {data.animal_type || "Animal"} • {data.animal_gender || "Unknown"}
              </p>
            </div>

           {/* Icon Navigation */}
<div className="flex flex-wrap md:flex-nowrap w-full items-start bg-[#E6E6E6] p-2 gap-2">
  {/* Overview Tab */}
  <button
    onClick={() => setActiveTab("overview")}
    className="flex justify-center items-center gap-1 transition rounded-2xl w-[calc(50%-4px)] md:w-auto md:flex-1"
    style={{
      backgroundColor: activeTab === "overview" ? "#8D52A7" : "#E6E6E6",
      height: "42px",
      padding: "10px",
    }}
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
    >
      <path
        d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
        stroke={activeTab === "overview" ? "#FFFFFF" : "#3C3333"}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 16V12"
        stroke={activeTab === "overview" ? "#FFFFFF" : "#3C3333"}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 8H12.01"
        stroke={activeTab === "overview" ? "#FFFFFF" : "#3C3333"}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  </button>

  {/* Animal Information Tab */}
  <button
    onClick={() => setActiveTab("animalinfo")}
    className="flex justify-center items-center gap-1 transition rounded-2xl w-[calc(50%-4px)] md:w-auto md:flex-1"
    style={{
      backgroundColor: activeTab === "animalinfo" ? "#8D52A7" : "#E6E6E6",
      height: "42px",
      padding: "10px",
    }}
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
    >
      <path
        d="M19 21V19C19 17.9391 18.5786 16.9217 17.8284 16.1716C17.0783 15.4214 16.0609 15 15 15H9C7.93913 15 6.92172 15.4214 6.17157 16.1716C5.42143 16.9217 5 17.9391 5 19V21"
        stroke={activeTab === "animalinfo" ? "#FFFFFF" : "#3C3333"}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 11C14.2091 11 16 9.20914 16 7C16 4.79086 14.2091 3 12 3C9.79086 3 8 4.79086 8 7C8 9.20914 9.79086 11 12 11Z"
        stroke={activeTab === "animalinfo" ? "#FFFFFF" : "#3C3333"}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  </button>

  {/* Location Tab */}
  <button
    onClick={() => setActiveTab("location")}
    className="flex justify-center items-center gap-1 transition rounded-2xl w-[calc(50%-4px)] md:w-auto md:flex-1"
    style={{
      backgroundColor: activeTab === "location" ? "#8D52A7" : "#E6E6E6",
      height: "42px",
      padding: "10px",
    }}
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
    >
      <path
        d="M3 6L9 3L15 6L21 3V18L15 21L9 18L3 21V6Z"
        stroke={activeTab === "location" ? "#FFFFFF" : "#3C3333"}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9 3V18"
        stroke={activeTab === "location" ? "#FFFFFF" : "#3C3333"}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M15 6V21"
        stroke={activeTab === "location" ? "#FFFFFF" : "#3C3333"}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  </button>

  {/* Health Tab */}
  <button
    onClick={() => setActiveTab("health")}
    className="flex justify-center items-center gap-1 transition rounded-2xl w-[calc(50%-4px)] md:w-auto md:flex-1"
    style={{
      backgroundColor: activeTab === "health" ? "#8D52A7" : "#E6E6E6",
      height: "42px",
      padding: "10px",
    }}
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
    >
      <path
        d="M11 2C10.4696 2 9.96086 2.21071 9.58579 2.58579C9.21071 2.96086 9 3.46957 9 4V9H4C3.46957 9 2.96086 9.21071 2.58579 9.58579C2.21071 9.96086 2 10.4696 2 11V13C2 14.1 2.9 15 4 15H9V20C9 21.1 9.9 22 11 22H13C13.5304 22 14.0391 21.7893 14.4142 21.4142C14.7893 21.0391 15 20.5304 15 20V15H20C20.5304 15 21.0391 14.7893 21.4142 14.4142C21.7893 14.0391 22 13.5304 22 13V11C22 10.4696 21.7893 9.96086 21.4142 9.58579C21.0391 9.21071 20.5304 9 20 9H15V4C15 3.46957 14.7893 2.96086 14.4142 2.58579C14.0391 2.21071 13.5304 2 13 2H11Z"
        stroke={activeTab === "health" ? "#FFFFFF" : "#3C3333"}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  </button>
</div>

            {/* Body Content Container */}
            <div className="flex flex-col w-full p-6 gap-[24px]">
              {/* Photo Section */}
              {activeTab === "overview" && (
                <>
                  <div className="flex h-[298px] pl-0 justify-center items-center self-stretch">
                    <div
                      className="w-full h-full rounded-2xl flex items-center justify-center cursor-pointer hover:opacity-90 transition overflow-hidden"
                      style={{
                        backgroundColor: "#8D52A7",
                        aspectRatio: "1",
                      }}
                      onClick={() => data.photo_url && setShowImageModal(true)}
                    >
                      {data.photo_url ? (
                        <img
                          src={data.photo_url}
                          alt={data.report_title || "Report"}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <svg
                          className="w-16 h-16 text-white opacity-80"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                        </svg>
                      )}
                    </div>
                  </div>

                  {/* Reporter Name */}
                  <div className="w-full">
                    <p
                      className="text-sm mb-1"
                      style={{
                        color: "#4A5565",
                        fontFamily: '"Genty Sans", sans-serif',
                      }}
                    >
                      Recorded By
                    </p>
                    <p
                      className="text-sm font-medium"
                      style={{
                        color: "#3C3333",
                        fontFamily: '"Genty Sans", sans-serif',
                      }}
                    >
                      {data.reporter_name}
                    </p>
                  </div>

                  {/* Date Seen */}
                  {data.date_seen && (
                    <div className="w-full">
                      <p
                        className="text-sm mb-1"
                        style={{
                          color: "#4A5565",
                          fontFamily: '"Genty Sans", sans-serif',
                        }}
                      >
                        Date Seen
                      </p>
                      <p
                        className="text-sm font-medium"
                        style={{
                          color: "#3C3333",
                          fontFamily: '"Genty Sans", sans-serif',
                        }}
                      >
                        {new Date(data.date_seen).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "2-digit",
                          day: "2-digit",
                        })}
                      </p>
                    </div>
                  )}

                  {/* Location */}
                  {data.area && (
                    <div className="w-full">
                      <p
                        className="text-sm mb-1"
                        style={{
                          color: "#4A5565",
                          fontFamily: '"Genty Sans", sans-serif',
                        }}
                      >
                        Location
                      </p>
                      <p
                        className="text-sm font-medium"
                        style={{
                          color: "#3C3333",
                          fontFamily: '"Genty Sans", sans-serif',
                        }}
                      >
                        {data.area}
                      </p>
                    </div>
                  )}

                  {/* Summary */}
                  <div className="w-full">
                    <p
                      className="text-sm mb-1"
                      style={{
                        color: "#4A5565",
                        fontFamily: '"Genty Sans", sans-serif',
                      }}
                    >
                      Summary
                    </p>
                    <p
                      className="text-sm leading-relaxed"
                      style={{
                        color: "#3C3333",
                        fontFamily: '"Genty Sans", sans-serif',
                      }}
                    >
                      {data.other_information ||
                        data.animal_description ||
                        "No summary provided"}
                    </p>
                  </div>
                </>
              )}

              {/* Animal Information Tab */}
              {activeTab === "animalinfo" && (
                <>
                  <div className="w-full gap-[24px]">
                    {data.reporter_name && (
                      <div className="w-full ">
                        <p
                          className="text-sm mb-1"
                          style={{
                            color: "#4A5565",
                            fontFamily: '"Genty Sans", sans-serif',
                          }}
                        >
                          Type of Animal
                        </p>
                        <p
                          className="text-sm font-medium"
                          style={{
                            color: "#3C3333",
                            fontFamily: '"Genty Sans", sans-serif',
                          }}
                        >
                          {data.animal_type}
                        </p>
                      </div>
                    )}
                  </div>
                  {/* Animal Gender */}
                  <div className="w-full">
                    <p
                      className="text-sm mb-1"
                      style={{
                        color: "#4A5565",
                        fontFamily: '"Genty Sans", sans-serif',
                      }}
                    >
                      Gender
                    </p>
                    <p
                      className="text-sm font-medium"
                      style={{
                        color: "#3C3333",
                        fontFamily: '"Genty Sans", sans-serif',
                      }}
                    >
                      {data.animal_gender}
                    </p>
                  </div>

                  {/* Physical Description */}
                  <div className="w-full">
                    <p
                      className="text-sm mb-1"
                      style={{
                        color: "#4A5565",
                        fontFamily: '"Genty Sans", sans-serif',
                      }}
                    >
                      Physical Description
                    </p>
                    <p
                      className="text-sm leading-relaxed"
                      style={{
                        color: "#3C3333",
                        fontFamily: '"Genty Sans", sans-serif',
                      }}
                    >
                      {data.animal_description ||
                        data.other_information ||
                        "No Description provided"}
                    </p>
                  </div>
                </>
              )}

              {/* Location Tab */}
              {activeTab === "location" && (
                <div className="w-full space-y-4">
                  <div>
                    <p
                      className="text-sm mb-1"
                      style={{
                        color: "#4A5565",
                        fontFamily: '"Genty Sans", sans-serif',
                      }}
                    >
                      Area Seen
                    </p>
                    <p
                      className="text-sm font-medium"
                      style={{
                        color: "#3C3333",
                        fontFamily: '"Genty Sans", sans-serif',
                      }}
                    >
                      {data.area || "—"}
                    </p>
                  </div>
                  <div>
                    <p
                      className="text-sm mb-1"
                      style={{
                        color: "#4A5565",
                        fontFamily: '"Genty Sans", sans-serif',
                      }}
                    >
                      Nearby Landmarks
                    </p>
                    <p
                      className="text-sm font-medium"
                      style={{
                        color: "#3C3333",
                        fontFamily: '"Genty Sans", sans-serif',
                      }}
                    >
                      {data.landmark || "—"}
                    </p>
                  </div>
                  <div>
                    <p
                      className="text-sm mb-1"
                      style={{
                        color: "#4A5565",
                        fontFamily: '"Genty Sans", sans-serif',
                      }}
                    >
                      Road/Street
                    </p>
                    <p
                      className="text-sm font-medium"
                      style={{
                        color: "#3C3333",
                        fontFamily: '"Genty Sans", sans-serif',
                      }}
                    >
                      {data.road || "—"}
                    </p>
                  </div>
                  {data.latitude && data.longitude && (
                    <div className="mt-4 relative z-0">
                      <p
                        className="text-sm mb-2"
                        style={{
                          color: "#4A5565",
                          fontFamily: 'Genty Sans, sans-serif',
                        }}
                      >
                        Map View
                      </p>
                      <div className="rounded-lg h-48 overflow-hidden relative z-0">
                        <AdminMapView
                          latitude={data.latitude}
                          longitude={data.longitude}
                        />
                      </div>
                      <a
                        href={`https://www.openstreetmap.org/?mlat=${data.latitude}&mlon=${data.longitude}#map=16/${data.latitude}/${data.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs mt-2 inline-block hover:opacity-90"
                        style={{
                          color: "#8D52A7",
                          fontFamily: 'Genty Sans, sans-serif',
                        }}
                      >
                        View on OpenStreetMap →
                      </a>
                    </div>
                  )}
                </div>
              )}

              {/* Health Tab */}
              {activeTab === "health" && (
                <div className="w-full space-y-4">
                  <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                    <p
                      className="text-sm"
                      style={{
                        color: "#3C3333",
                        fontFamily: '"Genty Sans", sans-serif',
                      }}
                    >
                      Health Issues
                    </p>
                    <span
                      className="px-3 py-1 rounded-full text-sm font-medium"
                      style={{
                        backgroundColor: data.health_issues && data.health_issues !== "None" && data.health_issues !== "" ? "#DBEAFE" : "#F3F4F6",
                        color: data.health_issues && data.health_issues !== "None" && data.health_issues !== "" ? "#1E40AF" : "#6B7280",
                        fontFamily: '"Genty Sans", sans-serif',
                      }}
                    >
                      {data.health_issues && data.health_issues !== "None" && data.health_issues !== "" ? "Yes" : "No"}
                    </span>
                  </div>

                  {data.health_issues && (
                    <div className="pl-4">
                      <p
                        className="text-sm mb-1"
                        style={{
                          color: "#4A5565",
                          fontFamily: '"Genty Sans", sans-serif',
                        }}
                      >
                        Health Issues
                      </p>
                      <p
                        className="text-sm font-medium"
                        style={{
                          color: "#3C3333",
                          fontFamily: '"Genty Sans", sans-serif',
                        }}
                      >
                        {data.health_issues || "Not specified"}
                      </p>
                    </div>
                  )}

                  <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                    <p
                      className="text-sm"
                      style={{
                        color: "#3C3333",
                        fontFamily: '"Genty Sans", sans-serif',
                      }}
                    >
                      Has Collar
                    </p>
                    <span
                      className="px-3 py-1 rounded-full text-sm font-medium"
                      style={{
                        backgroundColor: data.animal_collar && data.animal_collar !== "None" && data.animal_collar !== "" ? "#DBEAFE" : "#F3F4F6",
                        color: data.animal_collar && data.animal_collar !== "None" && data.animal_collar !== "" ? "#1E40AF" : "#6B7280",
                        fontFamily: '"Genty Sans", sans-serif',
                      }}
                    >
                      {data.animal_collar && data.animal_collar !== "None" && data.animal_collar !== "" ? "Yes" : "No"}
                    </span>
                  </div>

                  {data.animal_collar && (
                    <div className="pl-4">
                      <p
                        className="text-sm mb-1"
                        style={{
                          color: "#4A5565",
                          fontFamily: '"Genty Sans", sans-serif',
                        }}
                      >
                        Collar Details
                      </p>
                      <p
                        className="text-sm"
                        style={{
                          color: "#3C3333",
                          fontFamily: '"Genty Sans", sans-serif',
                        }}
                      >
                        {data.animal_collar || "Not specified"}
                      </p>
                    </div>
                  )}

                  <div className="pt-2">
                    <p
                      className="text-sm mb-1"
                      style={{
                        color: "#4A5565",
                        fontFamily: '"Genty Sans", sans-serif',
                      }}
                    >
                      Other Information
                    </p>
                    <p
                      className="text-sm"
                      style={{
                        color: "#3C3333",
                        fontFamily: '"Genty Sans", sans-serif',
                      }}
                    >
                      {data.other_information || "No description provided"}
                    </p>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              {status === "Pending" && (
                <div className="w-full space-y-3">
                  <button
                    onClick={() => handleStatusUpdate("Accepted")}
                    disabled={updating}
                    className="w-full py-3 rounded-xl text-white transition-all flex items-center justify-center gap-2 disabled:opacity-50 hover:opacity-90"
                    style={{
                      backgroundColor: "#8D52A7",
                      fontFamily: '"Genty Sans", sans-serif',
                    }}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    {updating ? "Updating..." : "Accept Report"}
                  </button>

                  <button
                    onClick={() => handleStatusUpdate("Rejected")}
                    disabled={updating}
                    className="w-full py-3 rounded-xl transition-all flex items-center justify-center gap-2 hover:bg-gray-50 disabled:opacity-50"
                    style={{
                      backgroundColor: "transparent",
                      border: "2px solid #8D52A7",
                      color: "#8D52A7",
                      fontFamily: '"Genty Sans", sans-serif',
                    }}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                    Deny Report
                  </button>
                </div>
              )}

              {status !== "Pending" && (
                <div className="w-full flex flex-col gap-3">
                  <button
                    onClick={() => handleStatusUpdate("Pending")}
                    disabled={updating}
                    className="w-full py-3 rounded-xl text-[#8D52A7] bg-white border-2 border-[#8D52A7] transition-all flex items-center justify-center gap-2 hover:bg-gray-50 disabled:opacity-50"
                    style={{
                      fontFamily: '"Genty Sans", sans-serif',
                    }}
                  >
                    {updating ? "Updating..." : " ⟲ Reset to Pending"}
                  </button>
                  <button
                    onClick={() => router.back()}
                    className="w-full py-3 rounded-xl text-white transition-all hover:opacity-90"
                    style={{
                      backgroundColor: "#8D52A7",
                      fontFamily: '"Genty Sans", sans-serif',
                    }}
                  >
                    ← Back to Reports
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>

      {/* Image Modal */}
      {showImageModal && data.photo_url && (
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
            src={data.photo_url}
            alt={data.report_title || "Report"}
            className="max-w-full max-h-[90vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </main>
  );
}