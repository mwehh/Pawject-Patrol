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
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/utils/supabase/client";
import Sidebar from "@/components/Sidebar";
import AdminAdoptionSection from "@/components/AdminAdoptionSection";

// Admin dashboard page component - displays stats and navigation cards
export default function HeaderAndBackground() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Fix hydration mismatch: only render timeAgo after mount
  const [isMounted, setIsMounted] = useState(false);

  // State management for paw decorations, dog image, and dashboard stats
  const [paws, setPaws] = useState<
    { src: string; top: string; left: string; rotate: number }[]
  >([]);
  const [dogSrc, setDogSrc] = useState("/dog.png");
  const [totalAnimals, setTotalAnimals] = useState(0);
  const [animalReports, setAnimalReports] = useState(0);
  const [volunteerRequests, setVolunteerRequests] = useState(0);
  const [loading, setLoading] = useState(true);

  // Recent items (for dashboard previews)
  const [recentAnimals, setRecentAnimals] = useState<any[]>([]);
  const [recentReports, setRecentReports] = useState<any[]>([]);
  const [recentVolunteers, setRecentVolunteers] = useState<any[]>([]);

  // State for user info
  const [userName, setUserName] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string>("");

  // Sample data for animal profiles, reports, and volunteer requests
  const animalProfiles = [
    {
      name: "Rona",
      type: "Golden Retriever",
      image:
        "https://images.unsplash.com/photo-1633722715463-d30f4f325e24?w=400&h=400&fit=crop",
    },
    {
      name: "Choco",
      type: "Mixed Stray",
      image:
        "https://images.unsplash.com/photo-1568572933382-74d440642117?w=400&h=400&fit=crop",
    },
    {
      name: "Julius",
      type: "Mixed Stray",
      image:
        "https://images.unsplash.com/photo-1513360371669-4adf3dd7dff8?w=400&h=400&fit=crop",
    },
  ];

  const animalReportsData = [
    {
      title: "Lost Dog Near CSM",
      location: "CSM Canteen Entrance",
      time: "2 hrs",
    },
    {
      title: "Dog Bite Incident",
      location: "Relocation, Sto. Nino",
      time: "16 hrs",
    },
    {
      title: "Cat Stuck Inside Car Engine",
      location: "Sitio Basak, Mintal",
      time: "2 days",
    },
  ];

  const volunteerRequestsData = [
    { name: "Mark", task: "Active Volunteer", image: "/api/placeholder/50/50" },
    { name: "Deniel", task: "Walking", image: "/api/placeholder/50/50" },
    { name: "Carl", task: "Admin Assistance", image: "/api/placeholder/50/50" },
  ];

  // Handle responsive layout changes for paw decorations and dog image
  useEffect(() => {
    setIsMounted(true);
    const handleResize = () => {
      const width = window.innerWidth;
      if (width > 768) {
        setPaws([
          { src: "/paws/paws1.png", top: "8%", left: "10%", rotate: 43 },
          { src: "/paws/paws2.png", top: "15%", left: "30%", rotate: -15 },
          { src: "/paws/paws1.png", top: "18%", left: "70%", rotate: 20 },
          { src: "/paws/paws2.png", top: "30%", left: "85%", rotate: -25 },
          { src: "/paws/paws1.png", top: "38%", left: "55%", rotate: 10 },
          { src: "/paws/paws2.png", top: "45%", left: "15%", rotate: -35 },
          { src: "/paws/paws1.png", top: "55%", left: "75%", rotate: 30 },
          { src: "/paws/paws2.png", top: "60%", left: "40%", rotate: -10 },
          { src: "/paws/paws1.png", top: "70%", left: "10%", rotate: 25 },
          { src: "/paws/paws2.png", top: "75%", left: "85%", rotate: -20 },
          { src: "/paws/paws1.png", top: "82%", left: "50%", rotate: 15 },
          { src: "/paws/paws2.png", top: "88%", left: "25%", rotate: -30 },
        ]);
        setDogSrc("/dog2.png");
      } else {
        setPaws([
          { src: "/paws/paws1.png", top: "8%", left: "10%", rotate: 40 },
          { src: "/paws/paws2.png", top: "15%", left: "65%", rotate: -30 },
          { src: "/paws/paws1.png", top: "25%", left: "35%", rotate: 25 },
          { src: "/paws/paws2.png", top: "35%", left: "80%", rotate: -10 },
          { src: "/paws/paws1.png", top: "50%", left: "20%", rotate: 15 },
          { src: "/paws/paws2.png", top: "55%", left: "60%", rotate: -20 },
          { src: "/paws/paws1.png", top: "65%", left: "10%", rotate: 35 },
          { src: "/paws/paws2.png", top: "70%", left: "80%", rotate: -40 },
          { src: "/paws/paws1.png", top: "85%", left: "30%", rotate: 10 },
          { src: "/paws/paws2.png", top: "90%", left: "70%", rotate: -35 },
        ]);
        setDogSrc("/dog.png");
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Verify admin authentication and fetch dashboard statistics
  useEffect(() => {
    let mounted = true;

    const checkAdminAndFetchData = async () => {
      // Check authentication status
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      // Early return if component unmounted during async operation
      if (!mounted) return;

      if (authError || !user) {
        router.replace("/admin/login");
        return;
      }

      // Set user info from Supabase user object
      setUserEmail(user.email || "");
      // Try to get name from user metadata, fallback to email username
      const nameFromMeta = user.user_metadata?.full_name || user.user_metadata?.name || "";
      setUserName(nameFromMeta || user.email?.split("@")[0] || "");

      // Verify user has admin privileges
      const { data: adminData, error: adminError } = await supabase
        .from("admin")
        .select("auth_id")
        .eq("auth_id", user.id)
        .single();

      if (!mounted) return;

      if (adminError || !adminData) {
        await supabase.auth.signOut();
        router.replace("/admin/login?error=unauthorized");
        return;
      }

      // Fetch dashboard statistics from database tables
      const { count: animalsCount } = await supabase
        .from("animal")
        .select("*", { count: "exact", head: true });

      // Count only pending animal reports
      const { count: reportsCount } = await supabase
        .from("animal_report")
        .select("*", { count: "exact", head: true })
        .eq("report_status", "Pending");

      // Count only active or filled volunteer requests
      const { count: callCount } = await supabase
        .from("volunteer_call")
        .select("*", { count: "exact", head: true })
        .in("call_status", ["Active", "Filled", "Ongoing"]);

      // Fetch recent entries for quick preview (latest 3)
      const { data: recentAnimalsData } = await supabase
        .from("animal")
        .select("animal_id, animal_name, animal_breed, animal_photo, animal_status, created_at")
        .order("created_at", { ascending: false })
        .limit(4);

      const { data: recentReportsData } = await supabase
        .from("animal_report")
        .select("report_id, report_title, animal_description, photo_url, report_status, created_at, landmark")
        .order("created_at", { ascending: false })
        .limit(3);

      const { data: recentVolunteersData } = await supabase
        .from("volunteer_call")
        // select all columns to avoid missing fields if schema differs
        .select("*")
        .order("created_at", { ascending: false })
        .limit(4);

      // Update state with fetched counts and recent items if component still mounted
      if (mounted) {
        setTotalAnimals(animalsCount || 0);
        setAnimalReports(reportsCount || 0);
        setVolunteerRequests(callCount || 0);
        setRecentAnimals(recentAnimalsData || []);
        setRecentReports(recentReportsData || []);
        setRecentVolunteers(recentVolunteersData || []);
        setLoading(false);
      }
    };

    // Execute authentication check and data fetch on mount
    checkAdminAndFetchData();

    // Cleanup function to prevent state updates after unmount
    return () => {
      mounted = false;
    };
  }, [router]);

  // Handle user logout and redirect to login page
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/admin/login");
  };

  return (
    <main className="relative min-h-screen flex flex-col items-center overflow-hidden bg-[#E1E69D]">
      {/* Sidebar */}
      <Sidebar
        variant="admin"
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        userName={userName}
        userEmail={userEmail}
        router={router}
      />
      {/* --- Paw Background Decorations --- */}
      <div className="absolute inset-0 opacity-50 pointer-events-none">
        {paws.map((paw, index) => (
          <Image
            key={index}
            src={paw.src}
            alt="paw"
            width={44}
            height={44}
            className="absolute"
            style={{
              top: paw.top,
              left: paw.left,
              transform: `rotate(${paw.rotate}deg)`,
              aspectRatio: "43.96 / 43.96",
              flexShrink: 0,
              objectFit: "cover",
            }}
          />
        ))}
      </div>

      <div className="relative z-10 w-full flex flex-col items-center flex-1">
        {/* Header with menu, logo, and logout button */}
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
                className="shrink-0"
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
              >
                <LogIn className="w-6 h-6 text-gray-800" />
              </button>
            </div>
          </div>
        </header>

        <div className="max-w-6xl mx-auto px-4 py-6 w-full">
          {/* Wrapper Container */}
          <div className="bg-[#E1E69D] rounded-2xl p-2 md:p-5 lg:p-8 pl-6 pr-6">
            <div className="flex flex-col lg:flex-row gap-10 items-start lg:items-center justify-between">
              {/* Welcome Message */}
              <div className="flex-1 flex flex-col gap-4">
                <p
                  className="text-[10px] sm:text-xs md:text-xs"
                  style={{
                    color: "#3C3333",
                    fontFamily: '"Genty Sans", sans-serif',
                  }}
                >
                  Welcome back Admin!
                </p>

                <h1
                  className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl"
                  style={{
                    color: "#E6E6E6",
                    WebkitTextStrokeWidth: ".5px",
                    WebkitTextStrokeColor: "#000",
                    fontFamily: '"Kawaii RT", sans-serif',
                    fontStyle: "normal",
                    fontWeight: 400,
                    lineHeight: "normal",
                    outlineColor: "#3C3333",
                  }}
                >
                  Pawject Patrol Admin Dashboard
                </h1>

                <p
                  className="text-[12px] sm:text-[12px] md:text-[14px]"
                  style={{
                    color: "#3C3333",
                    fontFamily: '"Genty Sans", sans-serif',
                  }}
                >
                  Manage your animal patrol operations, track reports,
                  coordinate volunteers, and monitor all activities in
                  real-time.
                </p>

                {/* --- Dashboard Statistics --- */}
                <section
                  className="flex gap-4 lg:flex-row lg:flex-wrap mt-4"
                  style={{ fontFamily: '"Genty Sans", sans-serif' }}
                >
                  {/* Total Animals */}
                  <div
                    className="
                    flex flex-col justify-center items-center text-center
                    h-[108px] flex-1 md:flex-[1_0_calc(33.333%-11px)]
                    p-2.5 gap-1
                    rounded-2xl bg-[#DCB57E]
                  "
                  >
                    <span className="text-xl md:text-2xl lg:text-2xl font-medium text-[#E6E6E6]">
                      {loading ? "..." : totalAnimals}
                    </span>
                    <span className="text-sm md:text-lg lg:text-lg text-[#E6E6E6]">
                      Total Animals
                    </span>
                  </div>

                  {/* Animal Reports */}
                  <div
                    className="
                    flex flex-col justify-center items-center text-center
                    h-[108px] flex-1 md:flex-[1_0_calc(33.333%-11px)]
                    p-2.5 gap-1
                    rounded-2xl bg-[#5E9BBA]
                  "
                  >
                    <span className="text-xl md:text-xl lg:text-2xl font-medium text-[#E6E6E6]">
                      {loading ? "..." : animalReports}
                    </span>
                    <span className="text-sm md:text-lg lg:text-lg text-[#E6E6E6]">
                      Animal Reports
                    </span>
                  </div>

                  {/* Volunteer Requests */}
                  <div
                    className="
                    flex flex-col justify-center items-center text-center
                    h-[108px] flex-1 md:flex-[1_0_calc(33.333%-11px)]
                    p-2.5 gap-1
                    rounded-2xl bg-[#C575AD]
                  "
                  >
                    <span className="text-xl md:text-2xl lg:text-2xl font-medium text-[#E6E6E6]">
                      {loading ? "..." : volunteerRequests}
                    </span>
                    <span className="text-sm md:text-lg lg:text-lg text-[#E6E6E6]">
                      Volunteer Tasks
                    </span>
                  </div>
                </section>
              </div>

              {/* Dog Image */}
              <div className="w-full lg:w-auto lg:shrink-0">
                <img
                  src="/dog_admin.jpg"
                  alt="Dog"
                  className="w-full md:h-[290px] lg:w-[520px] lg:h-[340px] rounded-[12px] object-cover"
                />
              </div>
            </div>
          </div>
        </div>

        {/* --- Dashboard Cards --- */}
        <div className="w-full flex-1 bg-[#E6E6E6]">
          <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col gap-6">
            <div className=" md:pr-10 md:pl-10 flex flex-col lg:flex-row flex-wrap gap-6 justify-center">
              {/* Animal Profiles Card */}
              <div className="w-full lg:w-[calc(33.333%-16px)] bg-[#FFFFFF] rounded-2xl shadow-lg overflow-hidden border-2 border-[#DCB57E] flex flex-col">
                {/* Header */}
                <a
                  href="/admin/profiles"
                  className="
    flex h-[86px] min-w-[270px] pl-2.5
    justify-between items-center self-stretch
    rounded-t-[12px] bg-[#E6E6E6] shadow-md border-b-2 border-[#DCB57E]
  "
                >
                  <div className="flex-1 px-1">
                    <h2
                      className="text-lg lg:text-lg font-medium mb-0.5"
                      style={{
                        color: "#DCB57E",
                        fontFamily: '"Genty Sans", sans-serif',
                      }}
                    >
                      Animal Profiles
                    </h2>
                    <p
                      className="text-[10px] md:text-xs lg:text-xs text-[#3C3333]"
                      style={{ fontFamily: '"Genty Sans", sans-serif' }}
                    >
                      View and Manage Animal Database
                    </p>
                  </div>

                  <div className="w-24 lg:w-32 flex items-center justify-center bg-[#DCB57E] h-full rounded-tr-[12px]">
                    <img
                      src="/paws/paws1.png"
                      alt="Animal Profiles"
                      className="w-10 h-10 lg:w-12 lg:h-12"
                    />
                  </div>
                </a>

                {/* Preview and Button Container */}
                <div
                  className="
    flex flex-col items-start self-stretch
    px-2.5 pb-5 pt-5 h-full
  "
                >
                  {/* Preview Items */}
                  <div className="flex flex-col gap-2.5 flex-1 w-full">
                  {recentAnimals.length === 0 ? (
                    <div className="text-sm text-gray-500">No recent animals</div>
                  ) : (
                    recentAnimals.slice(0, 4).map((animal, idx) => (
                      <div
                        key={`${animal.animal_id || "animal"}-${idx}`}
                        className="
        flex h-[55px] pl-1.5 pr-2.5 py-1
        justify-between items-center self-stretch
        rounded-[6px] border border-[#DCB57E] bg-[#F4E8D7]
        cursor-pointer
      "
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gray-300 rounded-lg overflow-hidden">
                            {animal.animal_photo ? (
                              <img
                                src={animal.animal_photo}
                                alt={animal.animal_name || 'Animal'}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">
                                No photo
                              </div>
                            )}
                          </div>
                          <div>
                            <p
                              className="font-medium text-xs text-[#4D3F2C]"
                              style={{ fontFamily: '"Genty Sans", sans-serif' }}
                            >
                              {animal.animal_name || 'Unnamed'}
                            </p>
                            <p className="text-[10px] text-[#846D4C]">
                              {animal.animal_breed || animal.animal_species || 'Unknown'}
                            </p>
                          </div>
                        </div>

                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                        >
                          <path
                            d="M5 12H19"
                            stroke="#3C3333"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M12 5L19 12L12 19"
                            stroke="#3C3333"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                    ))
                  )}
                  </div>

                  {/* View All Button */}
<Link href="/admin/profiles" className="
      flex h-[33px] px-4 py-2
      items-start gap-2.5 self-stretch
      rounded-lg bg-[#DCB57E]
      text-xs font-medium
      hover:bg-[#d4a86b] transition-colors mt-2.5
      justify-center
    ">
  <button
    style={{
      fontFamily: '"Genty Sans", sans-serif',
      color: "#FFF",
    }}
  >
    View All Animals
  </button>
</Link>
                </div>
              </div>

              {/* Animal Reports Card */}
              <div className="w-full lg:w-[calc(33.333%-16px)] bg-[#FFFFFF] rounded-2xl shadow-lg overflow-hidden border-2 border-[#5E9BBA] flex flex-col">
                {/* Header */}
                <a
                  href="/admin/report"
                  className="
    flex h-[86px] min-w-[270px] pl-2.5
    justify-between items-center self-stretch
    rounded-t-[12px] bg-[#E6E6E6] shadow-md border-b-2 border-[#5E9BBA]
  "
                >
                  <div className="flex-1 px-1">
                    <h2
                      className="text-lg lg:text-lg font-medium mb-0.5"
                      style={{
                        color: "#5E9BBA",
                        fontFamily: '"Genty Sans", sans-serif',
                      }}
                    >
                      Animal Reports
                    </h2>
                    <p
                      className="text-[10px] md:text-xs lg:text-xs text-[#3C3333]"
                      style={{ fontFamily: '"Genty Sans", sans-serif' }}
                    >
                      Track Stray Findings and Reports
                    </p>
                  </div>

                  <div className="w-24 lg:w-32 flex items-center justify-center bg-[#5E9BBA] h-full rounded-tr-[12px]">
                    <img
                      src="/nav/report.png"
                      alt="Animal Reports"
                      className="w-10 h-10 lg:w-12 lg:h-12"
                    />
                  </div>
                </a>

                {/* Preview and Button Container */}
                <div
                  className="
    flex flex-col items-start self-stretch
    px-2.5 pb-5 pt-5 h-full
  "
                >
                  {/* Preview Items */}
                  <div className="flex flex-col gap-2.5 flex-1 w-full">
                  {recentReports.length === 0 ? (
                    <div className="text-sm text-gray-500">No recent reports</div>
                  ) : (
                    recentReports.slice(0, 3).map((report, idx) => {
                      const isResolved = report.report_status === 'Resolved' || report.report_status === 'Accepted';
                      // Only calculate timeAgo on client after mount
                      let timeAgo = '';
                      if (isMounted) {
                        if (!report.created_at) timeAgo = 'Unknown';
                        else {
                          const now = new Date();
                          const created = new Date(report.created_at);
                          const diffMs = now.getTime() - created.getTime();
                          const diffMins = Math.floor(diffMs / 60000);
                          const diffHours = Math.floor(diffMs / 3600000);
                          const diffDays = Math.floor(diffMs / 86400000);
                          if (diffMins < 60) timeAgo = `${diffMins} min${diffMins !== 1 ? 's' : ''}`;
                          else if (diffHours < 24) timeAgo = `${diffHours} hr${diffHours !== 1 ? 's' : ''}`;
                          else timeAgo = `${diffDays} day${diffDays !== 1 ? 's' : ''}`;
                        }
                      }
                      return (
                        <div
                          key={report.report_id || idx}
                          onClick={() => router.push(`/admin/report/${report.report_id}`)}
                          className={`flex flex-col p-4 rounded-lg border cursor-pointer w-full ${
                            isResolved
                              ? "border-[#689668] bg-[#CDE0EA]"
                              : "border-[#DC2626] bg-[#CDE0EA]"
                          }`}
                        >
                          {/* Title with icon */}
                          <div className="flex items-center gap-3 mb-1">
                            {isResolved ? (
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="14"
                                height="14"
                                viewBox="0 0 14 14"
                                fill="none"
                              >
                                <g clipPath="url(#clip0_723_2224)">
                                  <path
                                    d="M12.8334 6.46309V6.99976C12.8327 8.25767 12.4254 9.48165 11.6722 10.4892C10.919 11.4967 9.86033 12.2337 8.65404 12.5904C7.44775 12.947 6.15848 12.9042 4.97852 12.4683C3.79856 12.0323 2.79113 11.2266 2.10647 10.1714C1.42182 9.11611 1.09663 7.8678 1.17939 6.61261C1.26216 5.35742 1.74845 4.16262 2.56574 3.20638C3.38304 2.25015 4.48754 1.58373 5.71452 1.30651C6.94151 1.02929 8.22524 1.15612 9.37425 1.66809"
                                    stroke="#689668"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                  <path
                                    d="M12.8333 2.3335L7 8.17266L5.25 6.42266"
                                    stroke="#689668"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </g>
                              </svg>
                            ) : (
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="14"
                                height="14"
                                viewBox="0 0 14 14"
                                fill="none"
                              >
                                <g clipPath="url(#clip0_722_2774)">
                                  <path
                                    d="M7.00008 12.8332C10.2217 12.8332 12.8334 10.2215 12.8334 6.99984C12.8334 3.77818 10.2217 1.1665 7.00008 1.1665C3.77842 1.1665 1.16675 3.77818 1.16675 6.99984C1.16675 10.2215 3.77842 12.8332 7.00008 12.8332Z"
                                    stroke="#DC2626"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                  <path
                                    d="M7 4.6665V6.99984"
                                    stroke="#DC2626"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                  <path
                                    d="M7 9.3335H7.00583"
                                    stroke="#DC2626"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </g>
                              </svg>
                            )}
                            <p
                              className="text-xs"
                              style={{
                                color: "#213641",
                                fontFamily: '"Genty Sans", sans-serif',
                              }}
                            >
                              {report.report_title || 'Untitled Report'}
                            </p>
                          </div>

                          {/* Description */}
                          <p className="text-[10px]" style={{ color: "#385D70" }}>
                            {report.animal_description || 'No description'}
                          </p>

                          {/* Location and Time Info */}
                          <div className="flex gap-3">
                            <div className="flex items-center gap-1">
                              <span
                                className="text-[10px] font-medium"
                                style={{ color: "#3C3333" }}
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="10"
                                  height="10"
                                  viewBox="0 0 10 10"
                                  fill="none"
                                >
                                  <path
                                    d="M5.00008 5.00016C5.22925 5.00016 5.42543 4.91857 5.58862 4.75537C5.75182 4.59218 5.83341 4.396 5.83341 4.16683C5.83341 3.93766 5.75182 3.74148 5.58862 3.57829C5.42543 3.41509 5.22925 3.3335 5.00008 3.3335C4.77091 3.3335 4.57473 3.41509 4.41154 3.57829C4.24835 3.74148 4.16675 3.93766 4.16675 4.16683C4.16675 4.396 4.24835 4.59218 4.41154 4.75537C4.57473 4.91857 4.77091 5.00016 5.00008 5.00016ZM5.00008 8.06266C5.8473 7.28488 6.47578 6.57829 6.8855 5.94287C7.29522 5.30745 7.50008 4.74322 7.50008 4.25016C7.50008 3.49322 7.25876 2.87343 6.77612 2.39079C6.29348 1.90815 5.70147 1.66683 5.00008 1.66683C4.29869 1.66683 3.70668 1.90815 3.22404 2.39079C2.7414 2.87343 2.50008 3.49322 2.50008 4.25016C2.50008 4.74322 2.70494 5.30745 3.11466 5.94287C3.52439 6.57829 4.15286 7.28488 5.00008 8.06266ZM5.00008 9.16683C3.88203 8.21544 3.04696 7.33176 2.49487 6.51579C1.94279 5.69982 1.66675 4.94461 1.66675 4.25016C1.66675 3.2085 2.00182 2.37864 2.67196 1.76058C3.3421 1.14252 4.11814 0.833496 5.00008 0.833496C5.88203 0.833496 6.65807 1.14252 7.32821 1.76058C7.99835 2.37864 8.33341 3.2085 8.33341 4.25016C8.33341 4.94461 8.05737 5.69982 7.50529 6.51579C6.95321 7.33176 6.11814 8.21544 5.00008 9.16683Z"
                                    fill="#47748C"
                                  />
                                </svg>
                              </span>
                              <span
                                className="text-[10px] font-medium"
                                style={{ color: "#385D70" }}
                              >
                                {report.landmark ? report.landmark.substring(0, 20) : 'Unknown'}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-xs">
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="9"
                                  height="9"
                                  viewBox="0 0 9 9"
                                  fill="none"
                                >
                                  <g clipPath="url(#clip0_723_2172)">
                                    <path
                                      d="M4.5 8.25C6.57107 8.25 8.25 6.57107 8.25 4.5C8.25 2.42893 6.57107 0.75 4.5 0.75C2.42893 0.75 0.75 2.42893 0.75 4.5C0.75 6.57107 2.42893 8.25 4.5 8.25Z"
                                      stroke="#47748C"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    />
                                    <path
                                      d="M4.5 2.25V4.5H6.1875"
                                      stroke="#47748C"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    />
                                  </g>
                                  <defs>
                                    <clipPath id="clip0_723_2172">
                                      <rect width="9" height="9" fill="white" />
                                    </clipPath>
                                  </defs>
                                </svg>
                              </span>
                              <span
                                className="text-[10px] font-medium"
                                style={{ color: "#385D70" }}
                              >
                                {isMounted ? timeAgo : ''}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  </div>

                  {/* View All Button */}
                  <button
                    onClick={() => router.push('/admin/report')}
                    className="
    flex h-[33px] px-4 py-2
    items-center gap-2.5 self-stretch
    rounded-lg bg-[#5E9BBA]
    text-xs font-medium
    hover:bg-[#4f8aa8] transition-colors mt-2.5
    justify-center
  "
                    style={{
                      fontFamily: '"Genty Sans", sans-serif',
                      color: "#FFF",
                    }}
                  >
                    View All Reports
                  </button>
                </div>
              </div>

              {/* Volunteer Requests Card */}
              <div className="w-full lg:w-[calc(33.333%-16px)] bg-[#FFFFFF] rounded-2xl shadow-lg overflow-hidden border-2 border-[#C575AD] flex flex-col">
                {/* Header */}
                <a
                  href="/admin/volunteer"
                  className="
    flex h-[86px] min-w-[270px] pl-2.5
    justify-between items-center self-stretch
    rounded-t-[12px] bg-[#E6E6E6] shadow-md border-b-2 border-[#C575AD]
  "
                >
                  <div className="flex-1 px-1">
                    <h2
                      className="text-lg lg:text-lg font-medium mb-0.5"
                      style={{
                        color: "#C575AD",
                        fontFamily: '"Genty Sans", sans-serif',
                      }}
                    >
                      Volunteer Requests
                    </h2>
                    <p
                      className="text-[10px] md:text-xs lg:text-xs text-[#3C3333]"
                      style={{ fontFamily: '"Genty Sans", sans-serif' }}
                    >
                      View and Manage Volunteer Tasks
                    </p>
                  </div>

                  <div className="w-24 lg:w-32 flex items-center justify-center bg-[#C575AD] h-full rounded-tr-[12px]">
                    <img
                      src="/nav/user.png"
                      alt="Volunteer Requests"
                      className="w-10 h-10 lg:w-12 lg:h-12"
                    />
                  </div>
                </a>

                {/* Preview and Button Container */}
                <div
                  className="
    flex flex-col items-start self-stretch
    px-2.5 pb-5 pt-5 h-full
  "
                >
                  <div className="flex flex-col gap-2.5 flex-1 w-full">
                  {recentVolunteers.length === 0 ? (
                    <div className="text-sm text-gray-500">No recent requests</div>
                  ) : (
                    recentVolunteers.slice(0, 4).map((volunteer, idx) => (
                      <div
                        key={volunteer.id || idx}
                        onClick={() => router.push('/admin/volunteer')}
                        className="
        flex h-[55px] pl-1.5 pr-2.5 py-1
        justify-between items-center self-stretch
        rounded-[6px] border border-[#C575AD] bg-[#EDD4E6]
        cursor-pointer
      "
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gray-300 rounded-lg overflow-hidden flex items-center justify-center">
                            <span className="text-xs font-semibold text-gray-600">
                              {volunteer.call_title && volunteer.call_title.length > 0 ? volunteer.call_title[0].toUpperCase() : 'V'}
                            </span>
                          </div>
                          <div>
                            <p
                              className="font-medium text-xs text-[#45293D]"
                              style={{ fontFamily: '"Genty Sans", sans-serif' }}
                            >
                              {volunteer.call_title || 'Volunteer Request'}
                            </p>
                            <p className="text-[10px] text-[#45293D]">
                              {volunteer.call_status || 'Pending'}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                  </div>

                  {/* View All Button */}
                  <button
                    onClick={() => router.push('/admin/volunteer')}
                    className="
    flex h-[33px] px-4 py-2
    items-center gap-2.5 self-stretch
    rounded-lg bg-[#C575AD]
    text-xs font-medium
    hover:bg-[#b05a9a] transition-colors mt-2.5
    justify-center
  "
                    style={{
                      fontFamily: '"Genty Sans", sans-serif',
                      color: "#FFF",
                    }}
                  >
                    View All Volunteers
                  </button>
                </div>
              </div>
            </div>

            <AdminAdoptionSection />
          </div>
        </div>
      </div>
    </main>
  );
}
