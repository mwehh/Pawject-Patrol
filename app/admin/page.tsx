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
  const [adoptionRequestsCount, setAdoptionRequestsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Recent items (for dashboard previews)
  const [recentAnimals, setRecentAnimals] = useState<any[]>([]);
  const [recentReports, setRecentReports] = useState<any[]>([]);
  const [recentVolunteers, setRecentVolunteers] = useState<any[]>([]);
  const [recentAdoptions, setRecentAdoptions] = useState<any[]>([]);

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

      // Count adoptions
      const { count: adoptionCount } = await supabase
        .from("adoption_application")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");

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

      const { data: recentAdoptionsData } = await supabase
        .from("adoption_application")
        .select("*, animal:animal(*)")
        .order("submitted_at", { ascending: false })
        .limit(3);

      // Update state with fetched counts and recent items if component still mounted
      if (mounted) {
        setTotalAnimals(animalsCount || 0);
        setAnimalReports(reportsCount || 0);
        setVolunteerRequests(callCount || 0);
        setAdoptionRequestsCount(adoptionCount || 0);
        setRecentAnimals(recentAnimalsData || []);
        setRecentReports(recentReportsData || []);
        setRecentVolunteers(recentVolunteersData || []);
        setRecentAdoptions(recentAdoptionsData || []);
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
                    {/* Wrapper Container */}
          <div className="bg-[#E1E69D] rounded-2xl md:p-5 lg:p-8 flex flex-col gap-6">
            
            {/* Welcome Message */}
            <div className="flex flex-col gap-4">
              <p
                className="text-xs md:text-sm text-[#3C3333]"
                style={{ fontFamily: '"Genty Sans", sans-serif' }}
              >
                Welcome back Admin!
              </p>

              <h1
                className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-[#E6E6E6]"
                style={{
                  WebkitTextStrokeWidth: ".5px",
                  WebkitTextStrokeColor: "#000",
                  fontFamily: '"Kawaii RT", sans-serif',
                }}
              >
                Pawject Patrol<br className="hidden md:block"/>Admin Dashboard
              </h1>

              <p
                className="text-sm md:text-base text-[#3C3333] max-w-3xl leading-relaxed"
                style={{ fontFamily: '"Genty Sans", sans-serif', fontWeight: 600 }}
              >
                Manage your animal patrol operations, track reports,
                coordinate volunteers, and monitor all activities in
                real-time.
              </p>
            </div>

            {/* --- Dashboard Statistics 4 boxes --- */}
            <section
              className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2"
              style={{ fontFamily: '"Genty Sans", sans-serif' }}
            >
              {/* Total Animals */}
              <div
                className="flex flex-col justify-center items-center text-center h-[108px] rounded-[16px] bg-[#DCB57E] shadow-sm"
              >
                <span className="text-3xl lg:text-4xl font-semibold text-[#f8f9fa]">
                  {loading ? "..." : totalAnimals}
                </span>
                <span className="text-sm md:text-base font-semibold text-[#f8f9fa] mt-1">
                  Total Animals
                </span>
              </div>
              {/* Animal Reports */}
              <div
                className="flex flex-col justify-center items-center text-center h-[108px] rounded-[16px] bg-[#5E9BBA] shadow-sm"
              >
                <span className="text-3xl lg:text-4xl font-semibold text-[#f8f9fa]">
                  {loading ? "..." : animalReports}
                </span>
                <span className="text-sm md:text-base font-semibold text-[#f8f9fa] mt-1">
                  Animal Reports
                </span>
              </div>
              {/* Volunteer Tasks */}
              <div
                className="flex flex-col justify-center items-center text-center h-[108px] rounded-[16px] bg-[#C575AD] shadow-sm"
              >
                <span className="text-3xl lg:text-4xl font-semibold text-[#f8f9fa]">
                  {loading ? "..." : volunteerRequests}
                </span>
                <span className="text-sm md:text-base font-semibold text-[#f8f9fa] mt-1">
                  Volunteer Tasks
                </span>
              </div>
              {/* Adoption Requests */}
              <div
                className="flex flex-col justify-center items-center text-center h-[108px] rounded-[16px] bg-[#689668] shadow-sm"
              >
                <span className="text-3xl lg:text-4xl font-semibold text-[#f8f9fa]">
                  {loading ? "..." : adoptionRequestsCount}
                </span>
                <span className="text-sm md:text-base font-semibold text-[#f8f9fa] mt-1">
                  Adoption Requests
                </span>
              </div>
            </section>

          </div>
        </div>

        {/* --- Segmented Pills and Cards --- */}
        <div className="w-full flex-1 bg-transparent">
          <div className="max-w-6xl mx-auto px-4 pb-12 flex flex-col gap-6">
            
            {/* Nav Pills Scrollable */}
            <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar items-center">
              <button className="whitespace-nowrap px-4 py-2 rounded-lg bg-[#3C3333] text-[#f8f9fa] text-xs md:text-sm font-bold shadow-sm" style={{fontFamily: '"Genty Sans", sans-serif'}}>
                Overview
              </button>
              <button onClick={()=>router.push('/admin/profiles')} className="whitespace-nowrap px-4 py-2 rounded-lg bg-[#DCB57E]/80 hover:bg-[#DCB57E] text-[#f4f4f4] text-xs md:text-sm font-bold shadow-sm transition" style={{fontFamily: '"Genty Sans", sans-serif'}}>
                Animal Profiles
              </button>
              <button onClick={()=>router.push('/admin/report')} className="whitespace-nowrap px-4 py-2 rounded-lg bg-[#5E9BBA]/80 hover:bg-[#5E9BBA] text-[#f4f4f4] text-xs md:text-sm font-bold shadow-sm transition" style={{fontFamily: '"Genty Sans", sans-serif'}}>
                Animal Reports
              </button>
              <button onClick={()=>router.push('/admin/volunteer')} className="whitespace-nowrap px-4 py-2 rounded-lg bg-[#C575AD]/80 hover:bg-[#C575AD] text-[#f4f4f4] text-xs md:text-sm font-bold shadow-sm transition" style={{fontFamily: '"Genty Sans", sans-serif'}}>
                Volunteer Tasks
              </button>
              <button onClick={()=>router.push('/admin/adoption')} className="whitespace-nowrap px-4 py-2 rounded-lg bg-[#689668]/80 hover:bg-[#689668] text-[#f4f4f4] text-xs md:text-sm font-bold shadow-sm transition" style={{fontFamily: '"Genty Sans", sans-serif'}}>
                Adoption Requests
              </button>
            </div>

                        {/* Grid 2x2 of Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full z-10">
              
              {/* CARD 1: Animal Profiles */}
              <div className="bg-[#DCB57E] rounded-[24px] overflow-hidden shadow-md flex flex-col h-[400px]">
                {/* Header */}
                <div className="px-5 py-4 flex gap-4 items-center">
                  <img src="/paws/paws1.png" className="w-[45px] h-[45px] opacity-100" style={{ filter: 'brightness(0) invert(1)' }}/>
                  <div>
                    <h3 className="text-white text-2xl font-normal tracking-wide" style={{fontFamily: '"Genty Sans", sans-serif'}}>Animal Profiles</h3>
                    <p className="text-[#4D3F2C] text-[12px] font-bold mt-0.5">View and Manage Animal Database</p>
                  </div>
                </div>
                {/* Content */}
                <div className="flex-1 flex flex-col bg-[#FCF9F5]">
                  <div className="flex-1 flex flex-col p-5 gap-4 overflow-y-auto no-scrollbar">
                    {recentAnimals.length === 0 ? <div className="text-sm text-gray-500 text-center py-4">No recent animals</div> : recentAnimals.slice(0, 3).map((a,i)=>(
                      <div key={i} className="flex items-center gap-4 w-full bg-transparent cursor-pointer group" onClick={()=>router.push(`/admin/profiles/${a.animal_id}`)}>
                        <div className="w-[60px] h-[60px] rounded-[14px] overflow-hidden shrink-0 bg-gray-200 shadow-sm">
                          {a.animal_photo ? <img src={a.animal_photo} className="w-full h-full object-cover"/> : null}
                        </div>
                        <div className="flex-1 overflow-hidden">
                          <p className="font-bold text-[#3C3333] text-[16px] leading-tight" style={{fontFamily: '"Genty Sans", sans-serif'}}>{a.animal_name || 'Unnamed'}</p>
                          <p className="text-[12px] text-[#A69999] font-bold mt-1 leading-none">{a.animal_breed || a.animal_species || 'Unknown'}</p>
                          <p className="text-[12px] text-[#A69999] font-bold mt-1 leading-none">Added: {new Date(a.created_at).toLocaleDateString()}</p>
                        </div>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3C3333" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:translate-x-1 transition-transform">
                          <path d="M5 12h14M12 5l7 7-7 7"/>
                        </svg>
                      </div>
                    ))}
                  </div>
                </div>
                {/* View All */}
                <div className="flex flex-col justify-center items-center py-[15px] px-[24px] gap-[10px] w-full mt-auto">
                  <button onClick={()=>router.push('/admin/profiles')} className="flex h-[40px] py-[8px] px-[16px] items-center justify-center gap-[10px] w-full rounded-[10px] bg-[#E6E6E6] border-[1.5px] border-[#3C3333] text-[#3C3333] text-[15px] font-bold hover:bg-white transition" style={{fontFamily: '"Genty Sans", sans-serif'}}>
                    View All Profiles
                  </button>
                </div>
              </div>

              {/* CARD 2: Animal Reports */}
              <div className="bg-[#5E9BBA] rounded-[24px] overflow-hidden shadow-md flex flex-col h-[400px]">
                {/* Header */}
                <div className="px-5 py-4 flex gap-4 items-center">
                  <img src="/nav/report.png" className="w-[45px] h-[45px] opacity-100" style={{ filter: 'brightness(0) invert(1)' }}/>
                  <div>
                    <h3 className="text-white text-2xl font-normal tracking-wide" style={{fontFamily: '"Genty Sans", sans-serif'}}>Animal Reports</h3>
                    <p className="text-[#213641] text-[12px] font-bold mt-0.5">Track Stray Findings and Reports</p>
                  </div>
                </div>
                {/* Content */}
                <div className="flex-1 flex flex-col bg-[#FCF9F5]">
                  <div className="flex-1 flex flex-col p-5 gap-4 overflow-y-auto no-scrollbar">
                    {recentReports.length === 0 ? <div className="text-sm text-gray-500 text-center py-4">No recent reports</div> : recentReports.slice(0, 3).map((r,i)=>(
                      <div key={i} className="flex items-center gap-4 w-full bg-transparent cursor-pointer group" onClick={()=>router.push(`/admin/report/${r.report_id}`)}>
                        <div className="w-[60px] h-[60px] rounded-[14px] overflow-hidden shrink-0 bg-gray-200 shadow-sm">
                          {r.photo_url ? <img src={r.photo_url} className="w-full h-full object-cover"/> : <div className="w-full h-full bg-[#5E9BBA]/20 flex items-center justify-center"><img src="/nav/report.png" className="w-8 h-8 opacity-50"/></div>}
                        </div>
                        <div className="flex-1 overflow-hidden">
                          <p className="font-bold text-[#3C3333] text-[16px] leading-tight flex items-center gap-1.5" style={{fontFamily: '"Genty Sans", sans-serif'}}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0">
                              <g clipPath="url(#clip0_1512_8553)">
                                <path d="M7.00008 12.8334C10.2217 12.8334 12.8334 10.2217 12.8334 7.00008C12.8334 3.77842 10.2217 1.16675 7.00008 1.16675C3.77842 1.16675 1.16675 3.77842 1.16675 7.00008C1.16675 10.2217 3.77842 12.8334 7.00008 12.8334Z" stroke={r.report_status==='Pending' ? '#DC2626' : '#689668'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M7 4.66675V7.00008" stroke={r.report_status==='Pending' ? '#DC2626' : '#689668'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M7 9.33325H7.00583" stroke={r.report_status==='Pending' ? '#DC2626' : '#689668'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              </g>
                              <defs>
                                <clipPath id="clip0_1512_8553">
                                  <rect width="14" height="14" fill="white"/>
                                </clipPath>
                              </defs>
                            </svg>
                            <span className="line-clamp-1">{r.report_title || 'Report'}</span>
                          </p>
                          <p className="text-[12px] text-[#A69999] font-bold mt-1 leading-none line-clamp-1">{r.animal_description}</p>
                          <p className="text-[12px] text-[#A69999] font-bold mt-1 leading-none line-clamp-1">{r.landmark || 'Unknown Location'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                {/* View All */}
                <div className="flex flex-col justify-center items-center py-[15px] px-[24px] gap-[10px] w-full mt-auto">
                  <button onClick={()=>router.push('/admin/report')} className="flex h-[40px] py-[8px] px-[16px] items-center justify-center gap-[10px] w-full rounded-[10px] bg-[#E6E6E6] border-[1.5px] border-[#3C3333] text-[#3C3333] text-[15px] font-bold hover:bg-white transition" style={{fontFamily: '"Genty Sans", sans-serif'}}>
                    View All Reports
                  </button>
                </div>
              </div>

              {/* CARD 3: Volunteer Requests */}
              <div className="bg-[#C575AD] rounded-[24px] overflow-hidden shadow-md flex flex-col h-[400px]">
                {/* Header */}
                <div className="px-5 py-4 flex gap-4 items-center">
                  <img src="/nav/user.png" className="w-[45px] h-[45px] opacity-100" style={{ filter: 'brightness(0) invert(1)' }}/>
                  <div>
                    <h3 className="text-white text-2xl font-normal tracking-wide" style={{fontFamily: '"Genty Sans", sans-serif'}}>Volunteer Requests</h3>
                    <p className="text-[#45293D] text-[12px] font-bold mt-0.5">View and Manage Volunteer Tasks and Requests</p>
                  </div>
                </div>
                {/* Content */}
                <div className="flex-1 flex flex-col bg-[#FCF9F5]">
                  <div className="flex-1 flex flex-col p-5 gap-4 overflow-y-auto no-scrollbar">
                    {recentVolunteers.length === 0 ? <div className="text-sm text-gray-500 text-center py-4">No recent volunteers</div> : recentVolunteers.slice(0, 3).map((v,i)=>(
                      <div key={i} className="flex items-center gap-4 w-full bg-transparent cursor-pointer group" onClick={()=>router.push(`/admin/volunteer`)}>
                        <div className="w-[60px] h-[60px] rounded-[14px] overflow-hidden shrink-0 bg-[#C575AD]/20 shadow-sm flex items-center justify-center text-3xl font-bold text-[#C575AD]" style={{fontFamily: '"Genty Sans", sans-serif'}}>
                          {v.call_title?.[0]?.toUpperCase()}
                        </div>
                        <div className="flex-1 overflow-hidden">
                          <p className="font-bold text-[#3C3333] text-[16px] leading-tight" style={{fontFamily: '"Genty Sans", sans-serif'}}>{v.call_title || 'Task'}</p>
                          <p className={`text-[12px] font-bold mt-1 leading-none ${v.call_status==='Active'?'text-[#5E9BBA]':'text-[#C575AD]'}`}>{v.call_status || 'Pending'}</p>
                          <p className="text-[12px] text-[#A69999] font-bold mt-1 leading-none">Added: {new Date(v.created_at).toLocaleDateString()}</p>
                        </div>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3C3333" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:translate-x-1 transition-transform">
                          <path d="M5 12h14M12 5l7 7-7 7"/>
                        </svg>
                      </div>
                    ))}
                  </div>
                </div>
                {/* View All */}
                <div className="flex flex-col justify-center items-center py-[15px] px-[24px] gap-[10px] w-full mt-auto">
                  <button onClick={()=>router.push('/admin/volunteer')} className="flex h-[40px] py-[8px] px-[16px] items-center justify-center gap-[10px] w-full rounded-[10px] bg-[#E6E6E6] border-[1.5px] border-[#3C3333] text-[#3C3333] text-[15px] font-bold hover:bg-white transition" style={{fontFamily: '"Genty Sans", sans-serif'}}>
                    View All Requests
                  </button>
                </div>
              </div>

              {/* CARD 4: Adoption Requests */}
              <div className="bg-[#689668] rounded-[24px] overflow-hidden shadow-md flex flex-col h-[400px]">
                {/* Header */}
                <div className="px-5 py-4 flex gap-4 items-center">
                  <svg width="45" height="45" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" className="opacity-100"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  <div>
                    <h3 className="text-white text-2xl font-normal tracking-wide" style={{fontFamily: '"Genty Sans", sans-serif'}}>Adoption Requests</h3>
                    <p className="text-[#243524] text-[12px] font-bold mt-0.5">View and Manage Adoption Requests</p>
                  </div>
                </div>
                {/* Content */}
                <div className="flex-1 flex flex-col bg-[#FCF9F5]">
                  <div className="flex-1 flex flex-col p-5 gap-4 overflow-y-auto no-scrollbar">
                    {recentAdoptions.length === 0 ? <div className="text-sm text-gray-500 text-center py-4">No recent adoption requests</div> : recentAdoptions.slice(0, 3).map((a,i)=>(
                      <div key={i} className="flex items-center gap-4 w-full bg-transparent cursor-pointer group" onClick={()=>router.push(`/admin/adoption`)}>
                        <div className="w-[60px] h-[60px] rounded-[14px] overflow-hidden shrink-0 bg-[#689668]/20 shadow-sm flex items-center justify-center text-3xl font-bold text-[#689668]" style={{fontFamily: '"Genty Sans", sans-serif'}}>
                          {a.applicant_name?.[0]?.toUpperCase()}
                        </div>
                        <div className="flex-1 overflow-hidden">
                          <p className="font-bold text-[#3C3333] text-[16px] leading-tight" style={{fontFamily: '"Genty Sans", sans-serif'}}>{a.applicant_name}</p>
                          <p className={`text-[12px] font-bold mt-1 leading-none ${a.status==='pending'?'text-[#DCB57E]':'text-[#689668]'}`}>{a.status}</p>
                          <p className="text-[12px] text-[#A69999] font-bold mt-1 leading-none">Added: {a.submitted_at ? new Date(a.submitted_at).toLocaleDateString() : 'Unknown'}</p>
                        </div>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3C3333" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:translate-x-1 transition-transform">
                          <path d="M5 12h14M12 5l7 7-7 7"/>
                        </svg>
                      </div>
                    ))}
                  </div>
                </div>
                {/* View All */}
                <div className="flex flex-col justify-center items-center py-[15px] px-[24px] gap-[10px] w-full mt-auto">
                  <button onClick={()=>router.push('/admin/adoption')} className="flex h-[40px] py-[8px] px-[16px] items-center justify-center gap-[10px] w-full rounded-[10px] bg-[#E6E6E6] border-[1.5px] border-[#3C3333] text-[#3C3333] text-[15px] font-bold hover:bg-white transition" style={{fontFamily: '"Genty Sans", sans-serif'}}>
                    View All Requests
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </main>
  );
}