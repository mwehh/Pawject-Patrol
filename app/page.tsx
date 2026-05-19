"use client";

import { Menu, LogIn, FileText, PawPrint, User, MapPin, Phone, Calendar, X, Facebook, Instagram, Twitter, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabase/client";
import Sidebar from "@/components/Sidebar";
import UserNotificationsBell from "@/components/UserNotificationsBell";
import { 
  getUserDashboardStats, 
  getCommunityStats, 
  getUserRecentReports,
  getUpcomingVolunteerCalls,
  getRecentCatalogAnimals
} from "@/actions/dashboard/user";
import dynamic from "next/dynamic";

export default function Home() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false); // Add mounted state
  // State for user info
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    setMounted(true); // Set mounted true after hydration

    // Check if the user is authenticated
    const checkAuth = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);
      setLoading(false);
      if (user) {
        setUserEmail(user.email || "");
        // Try to get name from user metadata, fallback to email username
        const nameFromMeta =
          user.user_metadata?.full_name || user.user_metadata?.name || "";
        setUserName(nameFromMeta || user.email?.split("@")[0] || "");
      } else {
        setUserName("");
        setUserEmail("");
      }
    };

    checkAuth();

    // Listen for auth state changes (like logout)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session?.user);
      if (session?.user) {
        setUserEmail(session.user.email || "");
        const nameFromMeta =
          session.user.user_metadata?.full_name ||
          session.user.user_metadata?.name ||
          "";
        setUserName(nameFromMeta || session.user.email?.split("@")[0] || "");
      } else {
        setUserName("");
        setUserEmail("");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      // Safe to use window here
      // e.g., window.scrollTo(0, 0);
    }
  }, []);

  // Return loading state
  if (loading) {
    return (
      <main className="min-h-dvh bg-[#E1E69D] flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </main>
    );
  }

  // If authenticated, show user dashboard instead
  if (isAuthenticated) {
    return <UserDashboard />;
  }

  return (
    <main className="relative min-h-vh bg-[#E1E69D] flex flex-col items-center overflow-hidden">
      {/* Sidebar */}
      <Sidebar 
        sidebarOpen={sidebarOpen} 
        setSidebarOpen={setSidebarOpen} 
        userName={userName} 
        userEmail={userEmail} 
        variant={"guest"} 
        router={router} 
      />

      {/* --- Hero Container--- */}
      <div className="relative w-full min-h-dvh flex flex-col items-center overflow-hidden">
        {/* Ellipse Background */}
        <div className="relative w-full flex justify-center z-0">
          {/* Mobile SVG */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 375 389"
            className="absolute top-0 sm:hidden w-[600px] h-auto top-[-26vh]"
          >
            <path
              d="M475.783 187C475.783 298.562 344.602 389 182.783 389C20.9632 389 -110.217 298.562 -110.217 187C-110.217 75.4385 20.9632 -15 182.783 -15C344.602 -15 475.783 75.4385 475.783 187Z"
              fill="#C2C876"
            />
          </svg>

          {/* Tablet SVG */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 768 389"
            className="absolute hidden sm:block lg:hidden w-[900px] h-auto top-[-8vh] z-0"
          >
            <path
              d="M974.403 187C974.403 298.562 705.745 389 374.339 389C42.9326 389 -225.725 298.562 -225.725 187C-225.725 75.4385 42.9326 -15 374.339 -15C705.745 -15 974.403 75.4385 974.403 187Z"
              fill="#C2C876"
            />
          </svg>

          {/* Desktop SVG */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 1280 389"
            fill="none"
            preserveAspectRatio="none"
            // Changed md:block to lg:block
            className="absolute hidden lg:block w-full h-auto top-[1vh]"
          >
            <path
              d="M1624 187C1624 298.562 1176.24 389 623.898 389C71.5543 389 -376.209 298.562 -376.209 187C-376.209 75.4385 71.5543 -15 623.898 -15C1176.24 -15 1624 75.4385 1624 187Z"
              fill="#C2C876"
            />
          </svg>
        </div>

        {/* Header  */}
        <header className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 w-full h-[52px] bg-[#E6E6E6] mx-auto z-50">
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
                className="flex-shrink-0"
              />
            </div>
            <Link href="/login" className="p-2 hover:bg-gray-100 rounded-lg transition">
              <LogIn className="w-6 h-6 text-gray-800" />
            </Link>
          </div>
        </header>

        {/* Flex Wrapper for Vertically Centering Content */}
        <div className="flex-1 w-full flex flex-col items-center justify-center relative z-10 pt-[52px] pb-10">
          {/* --- Main Card --- */}
          <div
            className="
              relative 
              w-[90%] 
              max-w-3xl lg:max-w-6xl
              bg-[#E6E6E6] 
              rounded-3xl 
              shadow-lg 
              flex 
              flex-col 
              justify-between 
              items-center 
              px-4 
              pt-6 pb-8 lg:pt-8 lg:pb-12 
              z-10
              transition-all
            "
          >
            {/* YFA Logo */}
            <div>
              <Image
                src="/YFALogo.png"
                alt="Youth For Animals Logo"
                width={92}
                height={77}
                className="mx-auto"
              />
            </div>

            {/* Moodboard / Main Logo */}
            <div className="mb-4 w-full flex justify-center">
              <Image
                src="/Moodboard2.png"
                alt="Pawject Patrol large logo"
                width={321}
                height={165}
                className="mx-auto object-contain -mt-2 scale-[1.8] sm:scale-[1.3] md:scale-[1.5]"
                priority
              />
            </div>

          {/* Login Button */}
            <Button
              asChild
              className="relative z-10 w-[155px] sm:w-[165px] md:w-[175px] h-[35px] sm:h-[38px] md:h-[40px] bg-[#8D52A7] hover:bg-[#7B4692] text-white font-bold text-sm sm:text-base rounded-lg transition-all lg:-mb-2"
            >
              <Link href="/login">Login</Link>
            </Button>
            {/* View Catalog Button */}
            <div className="absolute bottom-[-20px] sm:bottom-[-24px] md:bottom-[-20px] flex justify-center">
              <Button className="flex w-[155px] sm:w-[165px] md:w-[175px] h-[35px] sm:h-[38px] md:h-[40px] px-4 py-2 items-start gap-[10px] bg-[#8D52A7] hover:bg-[#7B4692] text-white font-bold text-sm sm:text-base rounded-lg shadow-lg transition-all">
                <Link href="/catalog">View Catalog</Link>
              </Button>
            </div>
          </div>

          {/* --- Navigation Section --- */}
          <div className="px-0 pb-0 mt-16 w-full flex justify-center z-10">
            <div className="w-[90%] max-w-6xl bg-[#E6E6E6] rounded-2xl shadow-md p-4 sm:p-5 transition-all">
              <div className="grid grid-cols-2 gap-y-4 gap-x-4 sm:gap-y-6 md:grid-cols-4 md:gap-x-6">
                {[
                  { label: "Home", icon: "/PawPrint.png", target: "top" },
                  { label: "About Us", icon: "/PawPrint.png", target: "about-us" },
                  { label: "Mission", icon: "/PawPrint.png", target: "mission" },
                  { label: "Vision", icon: "/PawPrint.png", target: "vision" },
                  { label: "Goals", icon: "/PawPrint.png", target: "goals" },
                ].filter((item, idx) => idx < 4).map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    className="flex flex-col items-center justify-center text-center focus:outline-none"
                    onClick={() => {
                      if (typeof window !== "undefined" && item.target === "top") {
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      } else {
                        const el = document.getElementById(item.target);
                        if (el) {
                          el.scrollIntoView({ behavior: "smooth", block: "start" });
                        }
                      }
                    }}
                    aria-label={item.label}
                  >
                    <div className="w-10 h-6 flex items-center justify-center">
                      <Image
                        src={item.icon}
                        alt={`${item.label} Icon`}
                        width={24}
                        height={24}
                        className="object-contain"
                      />
                    </div>
                    <span className="font-semibold text-gray-800 text-sm sm:text-base mt-1">
                      {item.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Background Image Officers */}
      <div className="relative w-full h-[300px] sm:h-[320px] md:h-[554px] lg:h-[1080px] overflow-hidden z-0 mt-6 sm:mt-10">
        {/* --- MOBILE IMAGE --- */}
        <Image
          src="/YFA_BG2.png"
          alt="YFA Landing Background Mobile"
          fill
          priority
          className="
      block md:hidden
      object-cover
      object-center
      transition-all duration-500 ease-in-out
    "
        />

        {/* --- DESKTOP IMAGE --- */}
        <Image
          src="/YFA_BG.png"
          alt="YFA Landing Background Desktop"
          fill
          priority
          className="
      hidden md:block
      object-cover
      object-center
      transition-all duration-500 ease-in-out
    "
        />
      </div>

      {/* About Us, Mission, Vision, and Goals Section */}
      <section className="relative w-full flex flex-col items-center -mt-12 sm:-mt-16 md:-mt-10 z-10 px-0">
        <div className="w-full max-w-none flex flex-col gap-0">
          {/* About Us */}
          <div id="about-us" className="bg-[#8D52A7] text-[#FFFFFF] p-7 sm:p-8 lg:p-12 xl:p-20 rounded-t-3xl shadow-xl scroll-mt-24">
            <h2
              className="leading-[36px] flex items-center gap-6"
              style={{
                color: "#E6E6E6",
                fontFamily: '"Kawaii RT", sans-serif',
                fontSize: "36px",
                fontWeight: 400,
              }}
            >
              <div className="flex flex-col items-start flex-shrink-0 w-[72px] h-[72px] pt-[16px] px-[16px] pb-0 rounded-2xl bg-white/20">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 40 40"
                  fill="none"
                  className="w-10 h-10"
                >
                  <path
                    d="M34.0333 7.6333C33.1972 6.79426 32.2037 6.12853 31.1097 5.67428C30.0157 5.22003 28.8429 4.98621 27.6583 4.98621C26.4738 4.98621 25.3009 5.22003 24.207 5.67428C23.113 6.12853 22.1195 6.79426 21.2833 7.6333L20 8.9333L18.7167 7.6333C17.8805 6.79426 16.887 6.12853 15.793 5.67428C14.6991 5.22003 13.5262 4.98621 12.3417 4.98621C11.1571 4.98621 9.98426 5.22003 8.89029 5.67428C7.79632 6.12853 6.80279 6.79426 5.96666 7.6333C2.43332 11.1666 2.21666 17.1333 6.66666 21.6666L20 35L33.3333 21.6666C37.7833 17.1333 37.5667 11.1666 34.0333 7.6333Z"
                    stroke="#E6E6E6"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              ABOUT US
            </h2>
            <p
              className="text-sm sm:text-base leading-relaxed mt-2"
              style={{
                fontFamily: '"Genty Sans", "Help_Loyola Round", "Kawaii RT", sans-serif',
              }}
            >
              Foster kindness, compassion, and respect for all animal life.
              Raise awareness about the shared capacity to feel pain between
              humans and animals, highlighting the importance of treating
              animals with kindness and empathy.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row">
            {/* Mission */}
            <div id="mission" className="bg-[#C575AD] text-[#FFFFFF] p-7 sm:p-8 lg:p-12 xl:p-20 sm:w-1/2 scroll-mt-24">
              <h2
                className="leading-[36px] flex items-center gap-6"
                style={{
                  color: "#E6E6E6",
                  fontFamily: '"Kawaii RT", sans-serif',
                  fontSize: "36px",
                  fontWeight: 400,
                }}
              >
                <div className="flex flex-col items-start flex-shrink-0 w-[72px] h-[72px] pt-[16px] px-[16px] pb-0 rounded-2xl bg-white/20">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 40 40"
                    fill="none"
                    className="w-10 h-10"
                  >
                    <path
                      d="M3.33334 20C3.33334 20 8.33334 8.33337 20 8.33337C31.6667 8.33337 36.6667 20 36.6667 20C36.6667 20 31.6667 31.6667 20 31.6667C8.33334 31.6667 3.33334 20 3.33334 20Z"
                      stroke="#E6E6E6"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M20 25C22.7614 25 25 22.7614 25 20C25 17.2386 22.7614 15 20 15C17.2386 15 15 17.2386 15 20C15 22.7614 17.2386 25 20 25Z"
                      stroke="#E6E6E6"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                OUR MISSION
              </h2>
              <p
                className="text-sm sm:text-base leading-relaxed mt-2"
                style={{
                  fontFamily: '"Genty Sans", "Help_Loyola Round", "Kawaii RT", sans-serif',
                }}
              >
                Foster kindness, compassion, and respect for all animal life.
                Raise awareness about the shared capacity to feel pain between
                humans and animals, highlighting the importance of treating
                animals with kindness and empathy.
              </p>
            </div>

            {/* Vision */}
            <div id="vision" className="bg-[#5E9BBA] text-[#FFFFFF] p-7 sm:p-8 lg:p-12 xl:p-20 sm:w-1/2 scroll-mt-24">
              <h2
                className="leading-[36px] flex items-center gap-6"
                style={{
                  color: "#E6E6E6",
                  fontFamily: '"Kawaii RT", sans-serif',
                  fontSize: "36px",
                  fontWeight: 400,
                }}
              >
                <div className="flex flex-col items-start flex-shrink-0 w-[72px] h-[72px] pt-[16px] px-[16px] pb-0 rounded-2xl bg-white/20">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 40 40"
                    fill="none"
                    className="w-10 h-10"
                  >
                    <path
                      d="M3.33334 19.9999C3.33334 19.9999 8.33334 8.33325 20 8.33325C31.6667 8.33325 36.6667 19.9999 36.6667 19.9999C36.6667 19.9999 31.6667 31.6666 20 31.6666C8.33334 31.6666 3.33334 19.9999 3.33334 19.9999Z"
                      stroke="#E6E6E6"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M20 25C22.7614 25 25 22.7614 25 20C25 17.2386 22.7614 15 20 15C17.2386 15 15 17.2386 15 20C15 22.7614 17.2386 25 20 25Z"
                      stroke="#E6E6E6"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                OUR VISION
              </h2>
              <p
                className="text-sm sm:text-base leading-relaxed mt-2"
                style={{
                  fontFamily: '"Genty Sans", "Help_Loyola Round", "Kawaii RT", sans-serif',
                }}
              >
                A compassionate and informed community committed to fostering
                kindness, empathy, and respect for all animals through
                education, responsible pet ownership, and collaborative
                efforts.
              </p>
            </div>
          </div>
          {/* Goals */}
          <div id="goals" className="bg-[#689668] text-[#FFFFFF] p-7 sm:p-8 lg:p-12 xl:p-20 scroll-mt-24">
            <h2
              className="leading-[36px] flex items-center gap-6"
              style={{
                color: "#E6E6E6",
                fontFamily: '"Kawaii RT", sans-serif',
                fontSize: "36px",
                fontWeight: 400,
              }}
            >
              <div className="flex flex-col items-start flex-shrink-0 w-[72px] h-[72px] pt-[16px] px-[16px] pb-0 rounded-2xl bg-white/20">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 40 40"
                  fill="none"
                  className="w-10 h-10"
                >
                  <path
                    d="M36.6667 18.4666V19.9999C36.6646 23.594 35.5008 27.0911 33.3489 29.9696C31.1969 32.8482 28.1721 34.9541 24.7256 35.9731C21.279 36.9921 17.5954 36.8698 14.2241 35.6242C10.8528 34.3787 7.97441 32.0768 6.01825 29.0617C4.0621 26.0467 3.13297 22.48 3.36945 18.8938C3.60592 15.3075 4.99533 11.8938 7.33045 9.16173C9.66558 6.42964 12.8213 4.52557 16.327 3.73351C19.8326 2.94145 23.5004 3.30383 26.7833 4.7666"
                    stroke="#E6E6E6"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M36.6667 6.6665L20 23.3498L15 18.3498"
                    stroke="#E6E6E6"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              OUR GOALS
            </h2>

            <div className="flex flex-col gap-3 mt-2">
              <p
                className="text-sm sm:text-base leading-relaxed p-3"
                style={{
                  borderRadius: "16px",
                  opacity: "0.95",
                  background: "rgba(230, 230, 230, 0.10)",
                  fontFamily: 'Help_Loyola Round, "Kawaii RT", sans-serif',
                }}
              >
                YFA-UPMin will serve as the primary contact organization for the
                Philippine Animal Welfare Society (PAWS) in coordinating
                disaster relief efforts within the area.
              </p>

              <p
                className="text-sm sm:text-base leading-relaxed p-3"
                style={{
                  borderRadius: "16px",
                  opacity: "0.95",
                  background: "rgba(230, 230, 230, 0.10)",
                  fontFamily: '"Genty Sans", "Help_Loyola Round", "Kawaii RT", sans-serif',
                }}
              >
                YFA-UPMin, in collaboration with the university, will actively
                implement various programs and activities established by PAWS to
                further the cause of animal welfare nationwide.
              </p>

              <p
                className="text-sm sm:text-base leading-relaxed p-3"
                style={{
                  borderRadius: "16px",
                  opacity: "0.95",
                  background: "rgba(230, 230, 230, 0.10)",
                  fontFamily: '"Genty Sans", "Help_Loyola Round", "Kawaii RT", sans-serif',
                }}
              >
                YFA-UPMin will actively engage university students in these
                activities, providing them with opportunities to develop
                leadership skills, volunteer in the community, and make a
                positive impact on animal welfare.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#D4E088] text-[#333] pt-8 pb-6 relative overflow-hidden w-full">
        {/* --- SVG Background Shape (Mobile) --- */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 375 139"
          fill="none"
          preserveAspectRatio="none"
          className="absolute bottom-0 left-0 w-full h-20 sm:hidden"
        >
          <path
            d="M479 202C479 313.562 347.819 404 186 404C24.1806 404 -107 313.562 -107 202C-107 90.4385 24.1806 0 186 0C347.819 0 479 90.4385 479 202Z"
            fill="#C2C876"
          />
        </svg>

        {/* --- SVG Background Shape (Tablet & Up) --- */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 768 139"
          fill="none"
          preserveAspectRatio="none"
          className="hidden absolute bottom-0 left-0 w-full h-20 sm:block"
        >
          <path
            d="M980.992 202C980.992 313.562 712.334 404 380.928 404C49.5218 404 -219.136 313.562 -219.136 202C-219.136 90.4385 49.5218 0 380.928 0C712.334 0 980.992 90.4385 980.992 202Z"
            fill="#C2C876"
          />
        </svg>

        <div className="relative z-10 max-w-6xl mx-auto px-6 flex flex-col sm:flex-row justify-between gap-8">
          <div className="flex-1">
            <div className="flex items-center mb-4">
              <Image
                src="/YFALogo.png"
                alt="Youth for Animals Logo"
                width={120}
                height={120}
              />
            </div>
            <p
              className="text-sm sm:text-base leading-relaxed mb-4 max-w-sm"
              style={{
                fontFamily: '"Genty Sans", "Help_Loyola Round", "Kawaii RT", sans-serif',
              }}
            >
              Youth for Animals - UP Mindanao is dedicated to fostering
              kindness, compassion, and respect for all forms of animal life.
            </p>
            <div className="flex items-center gap-3">
              <a
                href="https://www.facebook.com/YFAUPMin"
                className="bg-[#C575AD] p-2 rounded-full text-white hover:opacity-80"
              >
                <Facebook size={18} />
              </a>
              <a
                href="#"
                className="bg-[#8D52A7] p-2 rounded-full text-white hover:opacity-80"
              >
                <Instagram size={18} />
              </a>
              <a
                href="#"
                className="bg-[#5E9BBA] p-2 rounded-full text-white hover:opacity-80"
              >
                <Twitter size={18} />
              </a>
              <a
                href="mailto:yfaupmindanao@gmail.com"
                className="bg-[#9BBF94] p-2 rounded-full text-white hover:opacity-80"
              >
                <Mail size={18} />
              </a>
            </div>
          </div>

          <div>
            <h3 className="font-bold text-lg mb-3 text-[#4E4E4E]">
              Quick Links
            </h3>
            <ul
              className="space-y-1 text-sm"
              style={{
                fontFamily: '"Genty Sans", "Help_Loyola Round", "Kawaii RT", sans-serif',
              }}
            >
              <li>
                <button
                  type="button"
                  className="hover:underline bg-transparent p-0 m-0 border-0 text-inherit cursor-pointer"
                  onClick={() => {
                    const el = document.getElementById("about-us");
                    if (el) {
                      el.scrollIntoView({ behavior: "smooth", block: "start" });
                    }
                  }}
                >
                  About Us
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className="hover:underline bg-transparent p-0 m-0 border-0 text-inherit cursor-pointer"
                  onClick={() => {
                    const el = document.getElementById("mission");
                    if (el) {
                      el.scrollIntoView({ behavior: "smooth", block: "start" });
                    }
                  }}
                >
                  Our Mission
                </button>
              </li>
<li>
                <a href="#" className="hover:underline">
                  Programs
                </a>
              </li>
              <li>
                <a href="#" className="hover:underline">
                  Get Involved
                </a>
              </li>
              <li>
                <a href="#" className="hover:underline">
                  Contact
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold text-lg mb-3 text-[#4E4E4E]">
              Contact Us
            </h3>
            <ul
              className="space-y-2 text-sm"
              style={{
                fontFamily: '"Genty Sans", "Help_Loyola Round", "Kawaii RT", sans-serif',
              }}
            >
              <li className="flex items-center gap-2">
                <Mail size={16} className="text-[#8D52A7]" />
                yfaupmindanao@gmail.com
              </li>
              <li className="flex items-center gap-2">
                <Phone size={16} className="text-[#5E9BBA]" />
                +1 (555) 123-4567
              </li>
              <li className="flex items-center gap-2">
                <MapPin size={16} className="text-[#689668]" />
                UP Mindanao, Bago Oshiro, Davao City
              </li>
            </ul>
          </div>
        </div>
      </footer>
    </main>
  );
}

// Type definitions
type ReportData = {
  report_id: string;
  report_title: string | null;
  reporter_name: string | null;
  animal_name: string | null;
  animal_type: string | null;
  animal_gender: string | null;
  date_seen: string | null;
  animal_description: string | null;
  area: string | null;
  landmark: string | null;
  road: string | null;
  health_issues: string | null;
  animal_collar: string | null;
  other_information: string | null;
  latitude: number | null;
  longitude: number | null;
  report_status: string | null;
  photo_url: string | null;
  created_at: string | null;
};

type VolunteerCall = {
  call_id: string;
  call_title: string | null;
  call_starttime: string | null;
  call_endtime: string | null;
  call_location: string | null;
  capacity: number | null;
  call_status: string | null;
};

type CatalogAnimal = {
  animal_id: string;
  animal_name: string | null;
  animal_species: string | null;
  animal_breed: string | null;
  animal_gender: string | null;
  animal_description: string | null;
  animal_status: string | null;
  animal_photo: string | null;
  area: string | null;
  animal_collar: string | null;
  animal_theme: string | null;
  vaccination_status?: string | null;
  health_issues?: string | null;
  created_at: string | null;
};

const MapView = dynamic(() => import('../components/MapView'), { ssr: false });

export function UserDashboard() {
  const [activeVolunteerIdx, setActiveVolunteerIdx] = useState(0);
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [communityStats, setCommunityStats] = useState<any>(null);
  const [recentReports, setRecentReports] = useState<ReportData[]>([]);
  const [volunteerCalls, setVolunteerCalls] = useState<VolunteerCall[]>([]);
  const [userJoinedCalls, setUserJoinedCalls] = useState<string[]>([]);
  const [catalogAnimals, setCatalogAnimals] = useState<CatalogAnimal[]>([]);
  const [selectedReport, setSelectedReport] = useState<ReportData | null>(null);
  const [selectedCatalogAnimal, setSelectedCatalogAnimal] = useState<CatalogAnimal | null>(null);
  const [showAllReports, setShowAllReports] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);

 const handleOpenReport = (report: ReportData) => {
    setSelectedReport(report);
    setIsModalOpen(true);
  };

  const handleCloseReport = () => {
    setIsModalOpen(false);
    setSelectedReport(null);
  };

  useEffect(() => {
    let isMounted = true;

    const checkUser = async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();
      if (!isMounted) return;

      if (error || !user) {
        router.replace("/login");
        return;
      }

      setUserEmail(user.email ?? null);
      const name = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'User';
      setUserName(name);
      
      // Fetch all dashboard data
      const [statsData, communityData, reportsData, volunteersData, catalogData] = await Promise.all([
        getUserDashboardStats(),
        getCommunityStats(),
        getUserRecentReports(50),
        getUpcomingVolunteerCalls(50),
        getRecentCatalogAnimals(3)
      ]);
      
      if (isMounted) {
        setStats(statsData);
        setCommunityStats(communityData);
        setRecentReports(reportsData.data || []);
        setVolunteerCalls(volunteersData.data || []);
        setUserJoinedCalls(volunteersData.userJoined || []);
        setCatalogAnimals(catalogData.data || []);
        setLoading(false);
      }
    };

    checkUser();

    return () => {
      isMounted = false;
    };
  }, [router]);

  // Handle user logout
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/");
  };

  // Helper functions
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

    // Format time as 08:00:00 AM
  const formatTime = (dateString?: string | null) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '';
    let hour = d.getHours();
    const minute = d.getMinutes().toString().padStart(2, '0');
    const second = d.getSeconds().toString().padStart(2, '0');
    const ampm = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12;
    if (hour === 0) hour = 12;
    const hourStr = hour.toString().padStart(2, '0');
    return `${hourStr}:${minute}:${second} ${ampm}`;
  }

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    } catch {
      return dateStr;
    }
  };

  const getStatusColor = (status: string | null) => {
    switch (status?.toLowerCase()) {
      case 'accepted': return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-amber-100 text-amber-800 border-amber-200';
    }
  };

  const getThemeColor = (theme: string | null): string => {
    const themeMap: Record<string, string> = {
      blue: "#5E9BBA",
      green: "#689668",
      orange: "#DCB57E",
      pink: "#C575AD",
      purple: "#8D52A7",
    };
    return themeMap[theme?.toLowerCase() || ''] || "#689668";
  };

  // Report Detail Modal Component (Tabbed, Admin Style)
  const ReportDetailsModal = ({ report, isOpen, onClose }: { report: ReportData | null; isOpen: boolean; onClose: () => void }) => {
    const [activeTab, setActiveTab] = useState<'overview' | 'animalinfo' | 'location' | 'health'>('overview');
    // For recentering the map
    const [mapKey, setMapKey] = useState(0);
    // For image modal
    const [isImageModalOpen, setIsImageModalOpen] = useState(false);
    if (!report || !isOpen) return null;

    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto" onClick={onClose}>
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden max-w-2xl w-full my-8 relative" onClick={e => e.stopPropagation()}>
          {/* Header Section (Purple) */}
          <div className="w-full p-6" style={{ backgroundColor: '#8D52A7' }}>
            <div className="flex w-full flex-col gap-1">
              <div className="flex w-full items-center justify-between">
                <p className="text-xs text-white opacity-80" style={{ fontFamily: 'Genty Sans, sans-serif' }}>
                  Report ID: {report.report_id}
                </p>
                <button
                  onClick={onClose}
                  className="flex justify-center items-center rounded-full border border-white/60 backdrop-blur-md z-50 transition-all duration-200 hover:bg-white/20 hover:scale-105 ml-2"
                  style={{ width: '36px', height: '36px', background: 'transparent' }}
                  aria-label="Close"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
              <h2 className="text-2xl font-bold text-white" style={{ fontFamily: 'Genty Sans, sans-serif' }}>
                {report.report_title || 'Untitled Report'}
              </h2>
              <div className="flex w-full items-center justify-between">
                <p className="text-sm text-white opacity-90 m-0" style={{ fontFamily: 'Genty Sans, sans-serif' }}>
                  {report.animal_type || 'Animal'} • {report.animal_gender || 'Unknown'}
                </p>
                <span className="text-sm font-semibold px-3 py-1 rounded-full ml-2" style={{
                  backgroundColor: report.report_status === 'Accepted' ? '#9BBF94' : report.report_status === 'Rejected' ? '#FCA5A5' : '#FDE68A',
                  color: report.report_status === 'Accepted' ? '#166534' : report.report_status === 'Rejected' ? '#991B1B' : '#92400E',
                  fontFamily: 'Genty Sans, sans-serif',
                }}>
                  {report.report_status || 'Pending'}
                </span>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex flex-wrap md:flex-nowrap w-full items-start bg-[#E6E6E6] p-2 gap-2">
            {/* Overview Tab */}
            <button
              onClick={() => setActiveTab('overview')}
              className="flex justify-center items-center gap-1 transition rounded-2xl w-[calc(50%-4px)] md:w-auto md:flex-1"
              style={{ backgroundColor: activeTab === 'overview' ? '#8D52A7' : '#E6E6E6', height: '42px', padding: '10px' }}
              aria-label="Overview"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke={activeTab === 'overview' ? '#FFFFFF' : '#3C3333'} strokeWidth="2" />
                <line x1="12" y1="8" x2="12" y2="12" stroke={activeTab === 'overview' ? '#FFFFFF' : '#3C3333'} strokeWidth="2" strokeLinecap="round" />
                <circle cx="12" cy="16" r="1" fill={activeTab === 'overview' ? '#FFFFFF' : '#3C3333'} />
              </svg>
            </button>
            {/* Animal Info Tab */}
            <button
              onClick={() => setActiveTab('animalinfo')}
              className="flex justify-center items-center gap-1 transition rounded-2xl w-[calc(50%-4px)] md:w-auto md:flex-1"
              style={{ backgroundColor: activeTab === 'animalinfo' ? '#8D52A7' : '#E6E6E6', height: '42px', padding: '10px' }}
              aria-label="Animal Info"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="8" r="4" stroke={activeTab === 'animalinfo' ? '#FFFFFF' : '#3C3333'} strokeWidth="2" />
                <path d="M4 20c0-2.21 3.58-4 8-4s8 1.79 8 4" stroke={activeTab === 'animalinfo' ? '#FFFFFF' : '#3C3333'} strokeWidth="2" />
              </svg>
            </button>
            {/* Location Tab */}
            <button
              onClick={() => setActiveTab('location')}
              className="flex justify-center items-center gap-1 transition rounded-2xl w-[calc(50%-4px)] md:w-auto md:flex-1"
              style={{ backgroundColor: activeTab === 'location' ? '#8D52A7' : '#E6E6E6', height: '42px', padding: '10px' }}
              aria-label="Location"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M3 6L9 3L15 6L21 3V18L15 21L9 18L3 21V6Z" stroke={activeTab === 'location' ? '#FFFFFF' : '#3C3333'} strokeWidth="2" />
                <path d="M9 3V18" stroke={activeTab === 'location' ? '#FFFFFF' : '#3C3333'} strokeWidth="2" />
                <path d="M15 6V21" stroke={activeTab === 'location' ? '#FFFFFF' : '#3C3333'} strokeWidth="2" />
              </svg>
            </button>
            {/* Health Tab */}
            <button
              onClick={() => setActiveTab('health')}
              className="flex justify-center items-center gap-1 transition rounded-2xl w-[calc(50%-4px)] md:w-auto md:flex-1"
              style={{ backgroundColor: activeTab === 'health' ? '#8D52A7' : '#E6E6E6', height: '42px', padding: '10px' }}
              aria-label="Health"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M11 2C10.47 2 9.96 2.21 9.59 2.59C9.21 2.96 9 3.47 9 4V9H4C3.47 9 2.96 9.21 2.59 9.59C2.21 9.96 2 10.47 2 11V13C2 14.1 2.9 15 4 15H9V20C9 21.1 9.9 22 11 22H13C13.53 22 14.04 21.79 14.41 21.41C14.79 21.04 15 20.53 15 20V15H20C20.53 15 21.04 14.79 21.41 14.41C21.79 14.04 22 13.53 22 13V11C22 10.47 21.79 9.96 21.41 9.59C21.04 9.21 20.53 9 20 9H15V4C15 3.47 14.79 2.96 14.41 2.59C14.04 2.21 13.53 2 13 2H11Z" stroke={activeTab === 'health' ? '#FFFFFF' : '#3C3333'} strokeWidth="2" />
              </svg>
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex flex-col w-full p-6 gap-[24px]" style={{ fontFamily: 'Genty Sans, sans-serif' }}>
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <>
                <div className="flex h-[200px] pl-0 justify-center items-center self-stretch">
                  <div className="w-full h-full rounded-2xl flex items-center justify-center overflow-hidden" style={{ backgroundColor: '#8D52A7', aspectRatio: '1', cursor: report.photo_url ? 'pointer' : 'default' }}
                    onClick={() => { if (report.photo_url) setIsImageModalOpen(true); }}
                  >
                    {report.photo_url ? (
                      <img src={report.photo_url} alt={report.report_title || 'Report'} className="w-full h-full object-cover transition-transform duration-200 hover:scale-105" />
                    ) : (
                      <svg className="w-16 h-16 text-white opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    )}
                  </div>
                  {/* Image Modal */}
                  {isImageModalOpen && report.photo_url && (
                    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80" onClick={() => setIsImageModalOpen(false)}>
                      <button
                        className="fixed top-6 right-6 rounded-full p-2 shadow z-[100000]"
                        style={{ lineHeight: 0 }}
                        onClick={e => { e.stopPropagation(); setIsImageModalOpen(false); }}
                        aria-label="Close image modal"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="white" className="w-6 h-6">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                      <div className="relative max-w-3xl w-full flex items-center justify-center" onClick={e => e.stopPropagation()}>
                        <img src={report.photo_url} alt={report.report_title || 'Report'} className="max-h-[80vh] max-w-full rounded-2xl shadow-2xl" />
                      </div>
                    </div>
                  )}
                </div>
                <div className="w-full">
                  <p className="text-sm mb-1" style={{ color: '#4A5565' }}>Recorded By</p>
                  <p className="text-sm font-medium" style={{ color: '#3C3333' }}>{report.reporter_name}</p>
                </div>
                {report.date_seen && (
                  <div className="w-full">
                    <p className="text-sm mb-1" style={{ color: '#4A5565' }}>Date Seen</p>
                    <p className="text-sm font-medium" style={{ color: '#3C3333' }}>{formatDate(report.date_seen)}</p>
                  </div>
                )}
                {report.area && (
                  <div className="w-full">
                    <p className="text-sm mb-1" style={{ color: '#4A5565' }}>Location</p>
                    <p className="text-sm font-medium" style={{ color: '#3C3333' }}>{report.area}</p>
                  </div>
                )}
                <div className="w-full">
                  <p className="text-sm mb-1" style={{ color: '#4A5565' }}>Summary</p>
                  <p className="text-sm leading-relaxed" style={{ color: '#3C3333' }}>{ report.other_information || report.animal_description || 'No summary provided'}</p>
                </div>
              </>
            )}

            {/* Animal Info Tab */}
            {activeTab === 'animalinfo' && (
              <>
                <div className="w-full gap-[24px]">
                  {report.animal_type && (
                    <div className="w-full ">
                      <p className="text-sm mb-1" style={{ color: '#4A5565' }}>Type of Animal</p>
                      <p className="text-sm font-medium" style={{ color: '#3C3333' }}>{report.animal_type}</p>
                    </div>
                  )}
                </div>
                <div className="w-full">
                  <p className="text-sm mb-1" style={{ color: '#4A5565' }}>Gender</p>
                  <p className="text-sm font-medium" style={{ color: '#3C3333' }}>{report.animal_gender}</p>
                </div>
                <div className="w-full">
                  <p className="text-sm mb-1" style={{ color: '#4A5565' }}>Physical Description</p>
                  <p className="text-sm leading-relaxed" style={{ color: '#3C3333' }}>{report.animal_description || report.other_information || 'No Description provided'}</p>
                </div>
              </>
            )}

            {/* Location Tab */}
            {activeTab === 'location' && (
              <div className="w-full space-y-4">
                <div>
                  <p className="text-sm mb-1" style={{ color: '#4A5565' }}>Area Seen</p>
                  <p className="text-sm font-medium" style={{ color: '#3C3333' }}>{report.area || '—'}</p>
                </div>
                <div>
                  <p className="text-sm mb-1" style={{ color: '#4A5565' }}>Nearby Landmarks</p>
                  <p className="text-sm font-medium" style={{ color: '#3C3333' }}>{report.landmark || '—'}</p>
                </div>
                <div>
                  <p className="text-sm mb-1" style={{ color: '#4A5565' }}>Road/Street</p>
                  <p className="text-sm font-medium" style={{ color: '#3C3333' }}>{report.road || '—'}</p>
                </div>
                {typeof report.latitude === 'number' && typeof report.longitude === 'number' && !isNaN(report.latitude) && !isNaN(report.longitude) && (
                  <div className="relative w-full h-64 rounded-xl overflow-hidden border border-gray-300">
                    <MapView latitude={report.latitude} longitude={report.longitude} key={mapKey + '-' + report.latitude + ',' + report.longitude} />
                    {/* Recenter button is placed last to ensure highest stacking context */}
                    <button
                      type="button"
                      className="absolute top-3 right-3 z-[9999] bg-white/90 hover:bg-white text-primary-700 border border-gray-300 rounded-lg px-3 py-1 text-xs font-semibold shadow transition"
                      style={{ pointerEvents: 'auto', zIndex: 9999 }}
                      onClick={e => {
                        e.stopPropagation();
                        setMapKey(prev => prev + 1);
                      }}
                    >
                      Recenter
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Health Tab */}
            {activeTab === 'health' && (
              <div className="w-full space-y-4">
                <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                  <p className="text-sm" style={{ color: '#3C3333' }}>Health Issues</p>
                  <span className="px-3 py-1 rounded-full text-sm font-medium" style={{
                    backgroundColor: report.health_issues && report.health_issues !== 'None' && report.health_issues !== '' ? '#DBEAFE' : '#F3F4F6',
                    color: report.health_issues && report.health_issues !== 'None' && report.health_issues !== '' ? '#1E40AF' : '#6B7280',
                  }}>{report.health_issues && report.health_issues !== 'None' && report.health_issues !== '' ? 'Yes' : 'No'}</span>
                </div>
                {report.health_issues && (
                  <div className="pl-4">
                    <p className="text-sm mb-1" style={{ color: '#4A5565' }}>Health Issues</p>
                    <p className="text-sm font-medium" style={{ color: '#3C3333' }}>{report.health_issues || 'Not specified'}</p>
                  </div>
                )}
                <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                  <p className="text-sm" style={{ color: '#3C3333' }}>Has Collar</p>
                  <span className="px-3 py-1 rounded-full text-sm font-medium" style={{
                    backgroundColor: report.animal_collar && report.animal_collar !== 'None' && report.animal_collar !== '' ? '#DBEAFE' : '#F3F4F6',
                    color: report.animal_collar && report.animal_collar !== 'None' && report.animal_collar !== '' ? '#1E40AF' : '#6B7280',
                  }}>{report.animal_collar && report.animal_collar !== 'None' && report.animal_collar !== '' ? 'Yes' : 'No'}</span>
                </div>
                {report.animal_collar && (
                  <div className="pl-4">
                    <p className="text-sm mb-1" style={{ color: '#4A5565' }}>Collar Details</p>
                    <p className="text-sm" style={{ color: '#3C3333' }}>{report.animal_collar || 'Not specified'}</p>
                  </div>
                )}
              </div>
            )}
            {/* Close Button */}
            <button
              onClick={onClose}
              className="w-full mt-6 py-3 rounded-lg font-semibold transition hover:opacity-90"
              style={{ backgroundColor: '#3C3333', color: '#E6E6E6' }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Catalog Animal Detail Modal Component
  const CatalogAnimalModal = ({ animal, onClose }: { animal: CatalogAnimal | null; onClose: () => void }) => {
    const [activeTab, setActiveTab] = useState<"details" | "health">("details");
    
    if (!animal) return null;

    const color = getThemeColor(animal.animal_theme);
    const hoverColors: Record<string, string> = {
      "#689668": "#5E875E",
      "#DCB57E": "#C6A371",
      "#5E9BBA": "#558CA7",
      "#C575AD": "#B1699C",
      "#8D52A7": "#7F4A96",
    };
    const hoverColor = hoverColors[color] || color;

    return (
      <div
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto"
        onClick={onClose}
      >
        <div
          className="bg-white rounded-2xl shadow-2xl overflow-hidden max-w-2xl w-full my-8 relative"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Image Section */}
          <div className="relative h-80 w-full overflow-hidden">
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 left-4 flex justify-center items-center rounded-full border border-white/60 backdrop-blur-md z-50 transition-all duration-200 hover:bg-white/20 hover:scale-105"
              style={{
                width: "36px",
                height: "36px",
                background: "transparent",
              }}
            >
              <X className="w-5 h-5 text-white" />
            </button>

            {/* Animal Photo */}
            {animal.animal_photo ? (
              <img
                src={animal.animal_photo}
                alt={animal.animal_name || 'Animal'}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: color }}>
                <PawPrint className="w-16 h-16 text-white/50" />
              </div>
            )}

            {/* Title Overlay */}
            <div className="absolute bottom-4 left-4 text-white drop-shadow-lg">
              <h2 className="text-3xl font-extrabold" style={{ fontFamily: '"Genty Sans", sans-serif' }}>
                {animal.animal_name || 'Unknown'}
              </h2>
              <p className="text-sm font-medium" style={{ fontFamily: '"Genty Sans", sans-serif' }}>
                {animal.animal_breed || 'Unknown'}
              </p>
            </div>
          </div>

          {/* Content Section */}
          <div className="p-6" style={{ fontFamily: '"Genty Sans", sans-serif', backgroundColor: color, color: '#E6E6E6' }}>
            <p className="mb-4 flex items-center gap-2">
              <MapPin className="w-4 h-4" /> {animal.area || 'CSM'}
            </p>

            {/* Quick Info Pills */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              {/* Pill 1 - Species */}
              <div
                className="flex flex-col justify-between items-center flex-[1_0_0] rounded-[10px] border border-white/60 backdrop-blur-md text-center"
                style={{
                  height: "53.999px",
                  padding: "5px 9px",
                  backgroundColor: "rgba(0,0,0,0.15)",
                }}
              >
                <PawPrint className="w-5 h-5 mx-auto" />
                <span className="text-xs">{animal.animal_species || 'Unknown'}</span>
              </div>

              {/* Pill 2 - Gender */}
              <div
                className="flex flex-col justify-between items-center flex-[1_0_0] rounded-[10px] border border-white/60 backdrop-blur-md text-center"
                style={{
                  height: "53.999px",
                  padding: "5px 9px",
                  backgroundColor: "rgba(0,0,0,0.15)",
                }}
              >
                {animal.animal_gender?.toLowerCase() === 'male' ? (
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20 4v6h-2V7.425l-3.975 3.95q.475.7.725 1.488T15 14.5q0 2.3-1.6 3.9T9.5 20q-2.3 0-3.9-1.6T4 14.5q0-2.3 1.6-3.9T9.5 9q.825 0 1.625.237t1.475.738L16.575 6H14V4h6zM9.5 11q-1.45 0-2.475 1.025T6 14.5q0 1.45 1.025 2.475T9.5 18q1.45 0 2.475-1.025T13 14.5q0-1.45-1.025-2.475T9.5 11z"/>
                  </svg>
                ) : (
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 4q2.3 0 3.9 1.6T17.5 9.5q0 1.425-.575 2.7T15.3 14.5l.7.7V18h2.5v2H16v2.5h-2V20H11.5v-2H14v-2.8l-.7-.7q-1.05.65-2.325 1.075T8.5 16q-2.3 0-3.9-1.6T3 10.5q0-2.3 1.6-3.9T8.5 5q2.3 0 3.9 1.6T14 10.5q0 .825-.237 1.625T13.025 13.6l.7.7.7-.7q.575-1.05.825-2.1T15.5 9.5q0-1.45-1.025-2.475T12 6q-1.45 0-2.475 1.025T8.5 9.5q0 1.45 1.025 2.475T12 13z"/>
                  </svg>
                )}
                <span className="text-xs">{animal.animal_gender || 'Unknown'}</span>
              </div>

              {/* Pill 3 - Collar */}
              <div
                className="flex flex-col justify-between items-center flex-[1_0_0] rounded-[10px] border border-white/60 backdrop-blur-md text-center"
                style={{
                  height: "53.999px",
                  padding: "5px 9px",
                  backgroundColor: "rgba(0,0,0,0.15)",
                }}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
                <span className="text-xs">
                  {animal.animal_collar && animal.animal_collar.toLowerCase() !== 'none'
                    ? 'Has Collar'
                    : 'Has No Collar'}
                </span>
              </div>
            </div>

            {/* Tab Slider */}
            <div
              className="flex mb-4"
              style={{
                padding: "5px",
                justifyContent: "space-between",
                alignItems: "flex-start",
                alignSelf: "stretch",
                borderRadius: "6px",
                border: "1px solid rgba(255, 255, 255, 0.60)",
                background: hoverColor,
              }}
            >
              <button
                onClick={() => setActiveTab("details")}
                className="flex-1 py-2 rounded font-semibold transition-all"
                style={{
                  backgroundColor: activeTab === "details" ? "rgba(255, 255, 255, 0.25)" : "transparent",
                  color: "#E6E6E6",
                }}
              >
                Details
              </button>
              <button
                onClick={() => setActiveTab("health")}
                className="flex-1 py-2 rounded font-semibold transition-all"
                style={{
                  backgroundColor: activeTab === "health" ? "rgba(255, 255, 255, 0.25)" : "transparent",
                  color: "#E6E6E6",
                }}
              >
                Health
              </button>
            </div>

            {/* Content based on active tab */}
            <div className="mt-4 text-sm min-h-[120px]">
              {activeTab === "details" && (
                <>
                  {animal.animal_description ? (
                    <>
                      <p className="font-semibold mb-2">Physical Description:</p>
                      <p className="leading-relaxed text-justify">
                        {animal.animal_description}
                      </p>
                    </>
                  ) : (
                    <p className="text-center py-8 opacity-70">
                      No details available
                    </p>
                  )}
                </>
              )}
              {activeTab === "health" && (
                <div className="space-y-4">
                  {animal.vaccination_status || animal.health_issues ? (
                    <>
                      {animal.vaccination_status && (
                        <div>
                          <p className="font-semibold mb-1">Vaccination Status:</p>
                          <p className="leading-relaxed">{animal.vaccination_status}</p>
                        </div>
                      )}
                      {animal.health_issues && animal.health_issues.toLowerCase() !== 'none' && (
                        <div>
                          <p className="font-semibold mb-1">Health Issues:</p>
                          <p className="leading-relaxed">{animal.health_issues}</p>
                        </div>
                      )}
                      {(!animal.health_issues || animal.health_issues.toLowerCase() === 'none') && animal.vaccination_status && (
                        <div>
                          <p className="font-semibold mb-1">Health Issues:</p>
                          <p className="leading-relaxed">None</p>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-center py-8 opacity-70">
                      No health information available
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <main className="relative min-h-screen flex flex-col items-center overflow-hidden bg-[#E1E69D]">
      {/* Sidebar */}
      <Sidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        userName={userName}
        userEmail={userEmail ?? undefined}
        router={router}
        variant="user"
      />
      <div className="relative z-10 w-full flex flex-col items-center flex-1">
        <header className="flex items-center justify-between px-4 w-full h-[52px] bg-[#E6E6E6] mx-auto">
          <div className="w-full max-w-[1400px] mx-auto flex items-center justify-between">
            <button
              className="p-2 hover:bg-gray-100 rounded-lg transition"
              onClick={() => setSidebarOpen(true)}
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
        </header>

        <div className="max-w-6xl mx-auto px-4 py-6 w-full">
          {/* Wrapper Container */}
          <div className="bg-[#E1E69D] rounded-2xl p-2 md:p-5 lg:p-8 pl-[24px] pr-[24px]">
            {/* Welcome Message */}
            <div className="flex-1 flex flex-col gap-4 mb-6">
              <h1
                className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl"
                style={{
                  color: "#E6E6E6",
                  WebkitTextStrokeWidth: ".5px",
                  WebkitTextStrokeColor: "#000",
                  fontFamily: '"Kawaii RT", sans-serif',
                  fontStyle: "normal",
                  lineHeight: "normal",
                  outlineColor: "#3C3333",
                }}
              >
                Welcome back,{" "}
                {userName
                  .split(" ")
                  .map((word, idx, arr) => {
                    const colors = ["#5E9BBA", "#C2C876", "#C575AD"];
                    // Only add space if not the last word
                    return (
                      <span key={idx} style={{ color: colors[idx % colors.length] }}>
                        {word}{idx < arr.length - 1 ? " " : ""}
                      </span>
                    );
                  })}
                <span style={{ color: "#C575AD" }}>!</span>
              </h1>

              <p
                className="text-[12px] sm:text-[12px] md:text-[14px]"
                style={{
                  color: "#45556C",
                  fontFamily: '"Genty Sans", sans-serif',
                }}
              >
                Track your contributions and stay updated with community
                activities.
              </p>
            </div>

            {/* --- Dashboard Cards --- */}
            <div className="w-full flex-1">
              <div className="flex flex-col md:flex-row gap-3 md:gap-4 gap-6 justify-center">
                {/* Report Submitted Card */}
                <a
                  className="flex flex-1 justify-between w-full box-border"
                  style={{
                    display: "flex",
                    height: "118.087px",
                    padding: "25.044px 25.044px 25.044px",
                    alignItems: "center",
                    borderRadius: "14px",
                    border: "1.052px solid #5E9BBA",
                    background: "#FFF",
                    boxShadow:
                      "0 10px 15px -3px rgba(0, 0, 0, 0.10), 0 4px 6px -4px rgba(0, 0, 0, 0.10)",
                    textDecoration: "none",
                  }}
                >
                  {/* Left Side: Icon Stacked on Title */}
                  <div className="flex flex-col justify-between">
                    {/* Icon */}
                    <FileText className="text-[#5E9BBA] w-[32px] h-[32px]" />
                    {/* Title */}
                    <h2
                      className="text-lg"
                      style={{
                        color: "#3C3333",
                        fontFamily: '"Genty Sans", sans-serif',
                      }}
                    >
                      Reports Submitted
                    </h2>
                  </div>

                  {/* Right Side: The Count/Number */}
                  <div
                    className="text-6xl font-bold"
                    style={{
                      color: "#5E9BBA",
                      fontFamily: '"Genty Sans", sans-serif',
                    }}
                  >
                    {loading ? <span className="animate-pulse">...</span> : stats?.totalReports || 0}
                  </div>
                </a>
                {/* Reports Accepted Card */}
                <a
                  className="flex flex-1 justify-between w-full box-border"
                  style={{
                    display: "flex",
                    height: "118.087px",
                    padding: "25.044px 25.044px 25.044px",
                    alignItems: "center",
                    borderRadius: "14px",
                    border: "1.052px solid #689668",
                    background: "#FFF",
                    boxShadow:
                      "0 10px 15px -3px rgba(0, 0, 0, 0.10), 0 4px 6px -4px rgba(0, 0, 0, 0.10)",
                    textDecoration: "none",
                  }}
                >
                  {/* Left Side: Icon Stacked on Title */}
                  <div className="flex flex-col justify-between">
                    {/* Icon */}
                    <PawPrint className="text-[#689668] w-[32px] h-[32px]" />

                    {/* Title */}
                    <h2
                      className="text-lg"
                      style={{
                        color: "#3C3333",
                        fontFamily: '"Genty Sans", sans-serif',
                      }}
                    >
                      Reports Accepted
                    </h2>
                  </div>

                  {/* Right Side: The Count/Number */}
                  <div
                    className="text-6xl font-bold"
                    style={{
                      color: "#689668",
                      fontFamily: '"Genty Sans", sans-serif',
                    }}
                  >
                    {loading ? <span className="animate-pulse">...</span> : stats?.acceptedReports || 0}
                  </div>
                </a>
                {/* Volunteer Joined Card */}
                <a
                  className="flex flex-1 justify-between w-full box-border"
                  style={{
                    display: "flex",
                    height: "118.087px",
                    padding: "25.044px 25.044px 25.044px",
                    alignItems: "center",
                    borderRadius: "14px",
                    border: "1.052px solid #C575AD",
                    background: "#FFF",
                    boxShadow:
                      "0 10px 15px -3px rgba(0, 0, 0, 0.10), 0 4px 6px -4px rgba(0, 0, 0, 0.10)",
                    textDecoration: "none",
                  }}
                >
                  {/* Left Side: Icon Stacked on Title */}
                  <div className="flex flex-col justify-between">
                    {/* Icon */}
                    <User className="text-[#C575AD] w-[32px] h-[32px]" />

                    {/* Title */}
                    <h2
                      className="text-lg"
                      style={{
                        color: "#3C3333",
                        fontFamily: '"Genty Sans", sans-serif',
                      }}
                    >
                      Volunteers Joined
                    </h2>
                  </div>

                  {/* Right Side: The Count/Number */}
                  <div
                    className="text-6xl font-bold"
                    style={{
                      color: "#C575AD",
                      fontFamily: '"Genty Sans", sans-serif',
                    }}
                  >
                    {loading ? <span className="animate-pulse">...</span> : stats?.volunteersJoined || 0}
                  </div>
                </a>
              </div>

              {/* Volunteer Opportunities Card */}
              <div className="relative flex flex-col items-start gap-[15.989px] mt-8">

                {/* Header Row for My Volunteer Opportunities */}
                <div className="flex items-center justify-between w-full">
                  <h3
                    style={{
                      color: "#5D4037",
                      fontFamily: '"Genty Sans", sans-serif',
                      fontSize: "24px",
                      fontStyle: "normal",
                      fontWeight: 500,
                      lineHeight: "32px",
                      width: "327px",
                    }}
                  >
                    My Volunteer Opportunities
                  </h3>

                  {/* Search Button */}
                  <Link
                    href="/volunteer"
                    style={{
                      display: "flex",
                      width: "106px",
                      height: "46px",
                      justifyContent: "center",
                      alignItems: "center",
                      gap: "10px",
                      borderRadius: "16px",
                      background: "#8D52A7",
                      border: "none",
                      cursor: "pointer",
                      color: "white",
                    }}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle cx="11" cy="11" r="7" stroke="white" strokeWidth="2" />
                      <line x1="16.5" y1="16.5" x2="21" y2="21" stroke="white" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </Link>
                </div>

                {/* Card Wrapper  */}
                <div className="relative w-full">
                  {/* Left/Right Buttons: Only show if not loading and more than one opportunity */}
                  {(!loading && volunteerCalls.length > 1) && (
                    <>
                      {/* Left Button */}
                      <button
                        className="absolute left-0 top-1/2 z-20 -translate-y-1/2 -translate-x-1/2 w-12 h-12 rounded-full bg-white border-2 border-[#8D52A7] flex items-center justify-center hover:bg-gray-50 shadow-md transition-transform active:scale-95"
                        onClick={() => setActiveVolunteerIdx((prev) => prev > 0 ? prev - 1 : volunteerCalls.length - 1)}
                        disabled={volunteerCalls.length === 0}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                        >
                          <path
                            d="M15 18L9 12L15 6"
                            stroke="#8D52A7"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>

                      {/* Right Button  */}
                      <button
                        className="absolute right-0 top-1/2 z-20 -translate-y-1/2 translate-x-1/2 w-12 h-12 rounded-full bg-white border-2 border-[#8D52A7] flex items-center justify-center hover:bg-gray-50 shadow-md transition-transform active:scale-95"
                        onClick={() => setActiveVolunteerIdx((prev) => prev < volunteerCalls.length - 1 ? prev + 1 : 0)}
                        disabled={volunteerCalls.length === 0}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                        >
                          <path
                            d="M9 18L15 12L9 6"
                            stroke="#8D52A7"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                    </>
                  )}

                  {/* The Card Content */}
                    {loading ? (
                      <div className="flex items-center justify-center w-full"
                        style={{
                          display: "flex",
                          padding: "24px",
                          flexDirection: "column",
                          justifyContent: "space-between",
                          gap: "24px",
                          borderRadius: "14px",
                          border: "1px solid #8D52A7",
                          background: "#E6E6E6",
                          boxSizing: "border-box",
                          width: "100%",
                        }}
                      >
                        <span className="animate-pulse text-lg text-gray-500">Loading opportunities...</span>
                      </div>
                    ) : (
                      volunteerCalls[activeVolunteerIdx] && volunteerCalls[activeVolunteerIdx].call_id ? (
                        <div
                          key={volunteerCalls[activeVolunteerIdx]?.call_id || 'active'}
                          style={{
                            display: "flex",
                            padding: "24px",
                            flexDirection: "column",
                            justifyContent: "space-between",
                            gap: "24px",
                            borderRadius: "14px",
                            border: "1px solid #8D52A7",
                            background: "#E6E6E6",
                            boxSizing: "border-box",
                            marginRight: "40px",
                            marginLeft: "40px",
                          }}
                        >
                          {/* Title */}
                          <h2
                            className="text-2xl"
                            style={{
                              color: "#8D52A7",
                              fontFamily: '"Genty Sans", sans-serif',
                              fontSize: "24px",
                            }}
                          >
                            {volunteerCalls[activeVolunteerIdx]?.call_title}
                          </h2>

                          {/* Event Details */}
                          <div className="flex flex-col gap-3 w-full">
                            {/* Date Row */}
                            <div className="flex items-center gap-3">
                              {/* Date Icon */}
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="20"
                                height="20"
                                viewBox="0 0 16 16"
                                fill="none"
                                className="shrink-0" // Prevents icon from squishing
                              >
                                <g clipPath="url(#clip0_date)">
                                  <path
                                    d="M5.33008 1.33252V3.99739"
                                    stroke="#8B5CA6"
                                    strokeWidth="1.33243"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                  <path
                                    d="M10.6592 1.33252V3.99739"
                                    stroke="#8B5CA6"
                                    strokeWidth="1.33243"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                  <path
                                    d="M12.6585 2.66504H3.33146C2.59557 2.66504 1.99902 3.26159 1.99902 3.99747V13.3245C1.99902 14.0604 2.59557 14.6569 3.33146 14.6569H12.6585C13.3944 14.6569 13.9909 14.0604 13.9909 13.3245V3.99747C13.9909 3.26159 13.3944 2.66504 12.6585 2.66504Z"
                                    stroke="#8B5CA6"
                                    strokeWidth="1.33243"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                  <path
                                    d="M1.99902 6.66211H13.9909"
                                    stroke="#8B5CA6"
                                    strokeWidth="1.33243"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </g>
                                <defs>
                                  <clipPath id="clip0_date">
                                    <rect
                                      width="15.9892"
                                      height="15.9892"
                                      fill="white"
                                    />
                                  </clipPath>
                                </defs>
                              </svg>

                              {/* Date Text */}
                              <span
                                className="text-sm"
                                style={{
                                  color: "#3C3333",
                                  fontFamily: '"Genty Sans", sans-serif',
                                }}
                              >
                                {(() => {
                                  const start = volunteerCalls[activeVolunteerIdx]?.call_starttime;
                                  const end = volunteerCalls[activeVolunteerIdx]?.call_endtime;
                                  if (!end) return formatDate(start);
                                  const startDate = start ? new Date(start) : null;
                                  const endDate = end ? new Date(end) : null;
                                  const sameDay = startDate && endDate &&
                                    startDate.getFullYear() === endDate.getFullYear() &&
                                    startDate.getMonth() === endDate.getMonth() &&
                                    startDate.getDate() === endDate.getDate();
                                  if (sameDay) {
                                    return formatDate(start);
                                  } else {
                                    return `${formatDate(start)} - ${formatDate(end)}`;
                                  }
                                })()}
                              </span>
                            </div>

                            {/* Time Row */}
                            <div className="flex items-center gap-3">
                              {/* Time Icon */}
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="20"
                                height="20"
                                viewBox="0 0 16 16"
                                fill="none"
                                className="shrink-0"
                              >
                                <g clipPath="url(#clip0_time)">
                                  <path
                                    d="M7.96191 3.98096V7.96183L10.6158 9.28878"
                                    stroke="#8B5CA6"
                                    strokeWidth="1.32696"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                  <path
                                    d="M7.96193 14.5967C11.6262 14.5967 14.5967 11.6262 14.5967 7.96193C14.5967 4.29764 11.6262 1.32715 7.96193 1.32715C4.29764 1.32715 1.32715 4.29764 1.32715 7.96193C1.32715 11.6262 4.29764 14.5967 7.96193 14.5967Z"
                                    stroke="#8B5CA6"
                                    strokeWidth="1.32696"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </g>
                                <defs>
                                  <clipPath id="clip0_time">
                                    <rect
                                      width="15.9235"
                                      height="15.9235"
                                      fill="white"
                                    />
                                  </clipPath>
                                </defs>
                              </svg>

                              {/* Time Text */}
                              <span
                                className="text-sm"
                                style={{
                                  color: "#3C3333",
                                  fontFamily: '"Genty Sans", sans-serif',
                                }}
                              >
                                {formatTime(volunteerCalls[activeVolunteerIdx]?.call_starttime)}
                                {volunteerCalls[activeVolunteerIdx]?.call_endtime ? (
                                  <>
                                    {' - '}
                                    {formatTime(volunteerCalls[activeVolunteerIdx]?.call_endtime)}
                                  </>
                                ) : null}
                              </span>
                            </div>

                            {/* Location Row */}
                            <div className="flex items-center gap-3">
                              {/* Location Icon */}
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="20"
                                height="20"
                                viewBox="0 0 16 16"
                                fill="none"
                                className="shrink-0"
                              >
                                <g clipPath="url(#clip0_location)">
                                  <path
                                    d="M13.3245 6.66225C13.3245 9.98868 9.63433 13.453 8.39517 14.5229C8.27973 14.6098 8.13921 14.6567 7.99477 14.6567C7.85034 14.6567 7.70982 14.6098 7.59438 14.5229C6.35521 13.453 2.66504 9.98868 2.66504 6.66225C2.66504 5.24872 3.22656 3.89308 4.22608 2.89356C5.2256 1.89404 6.58124 1.33252 7.99477 1.33252C9.40831 1.33252 10.7639 1.89404 11.7635 2.89356C12.763 3.89308 13.3245 5.24872 13.3245 6.66225Z"
                                    stroke="#8B5CA6"
                                    strokeWidth="1.33243"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                  <path
                                    d="M7.99474 8.66088C9.09857 8.66088 9.99339 7.76605 9.99339 6.66222C9.99339 5.5584 9.09857 4.66357 7.99474 4.66357C6.89092 4.66357 5.99609 5.5584 5.99609 6.66222C5.99609 7.76605 6.89092 8.66088 7.99474 8.66088Z"
                                    stroke="#8B5CA6"
                                    strokeWidth="1.33243"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </g>
                                <defs>
                                  <clipPath id="clip0_location">
                                    <rect
                                      width="15.9892"
                                      height="15.9892"
                                      fill="white"
                                    />
                                  </clipPath>
                                </defs>
                              </svg>
                              <span
                                className="text-sm"
                                style={{
                                  color: "#3C3333",
                                  fontFamily: '"Genty Sans", sans-serif',
                                }}>
                                {volunteerCalls[activeVolunteerIdx]?.call_location}
                              </span>
                            </div>
                          </div>

                          {/* View Button */}
                          <button
                            className="w-full text-white text-lg rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                            style={{
                              backgroundColor: "#8D52A7",
                              padding: "12px 0",
                              fontFamily: '"Genty Sans", sans-serif',
                            }}
                            onClick={() => router.push(`/volunteer/${volunteerCalls[activeVolunteerIdx]?.call_id}`)}
                          >
                            View
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
                              <path d="M5 12h14" />
                              <path d="M12 5l7 7-7 7" />
                            </svg>
                          </button>
                        </div>
                      ) : (
                        <div
                          className="flex flex-col items-center justify-center w-full box-border"
                          style={{
                            height: "auto",
                            padding: "25.044px 25.044px 25.044px",
                            borderRadius: "14px",
                            border: "1.052px solid #8D52A7",
                            background: "#FFF",
                            boxShadow:
                              "0 10px 15px -3px rgba(0, 0, 0, 0.10), 0 4px 6px -4px rgba(0, 0, 0, 0.10)",
                            width: "100%"
                          }}
                        >
                          <PawPrint className="text-[#8D52A7] w-[32px] h-[32px] mb-2" />
                          <h2 className="mb-1 text-base sm:text-lg md:text-xl lg:text-2xl font-semibold text-[#3C3333] break-words whitespace-normal">
                            My Volunteer Opportunities
                          </h2>
                          <div className="text-gray-500 text-center text-sm mb-3">
                            No volunteer opportunities found.
                          </div>
                          <Link
                            href="/volunteer"
                            className="mt-1 px-4 py-2 rounded-lg bg-[#8D52A7] text-white font-semibold hover:bg-[#7B4692] transition"
                          >
                            Browse Opportunities
                          </Link>
                        </div>
                      )
                    )}
                  
                {/* Pagination Dots */}
                <div className="flex items-center justify-center gap-2 w-full mt-2">
                  {volunteerCalls.map((_, idx) => (
                    <div
                      key={idx}
                      className={
                        idx === activeVolunteerIdx
                          ? "w-8 h-2.5 rounded-full bg-[#8D52A7]"
                          : "w-2.5 h-2.5 rounded-full bg-[#8D52A7] opacity-30"
                      }
                    ></div>
                  ))}
                </div>
              </div>

              {/* Recent Reports Section */}
              <div className="flex flex-col items-start gap-[16px] self-stretch mt-8">
                {/* Header Row (Kept exactly as requested) */}
                <div className="flex items-center justify-between w-full">
                  <h3 className="text-[#5D4037] font-['Genty_Sans'] text-[24px] font-medium leading-[32px] w-[327px] not-italic">
                    My Recent Reports
                  </h3>

                  {/* + Button */}
                  <Link
                    href="/form"
                    style={{
                      display: "flex",
                      width: "106px",
                      height: "46px",
                      justifyContent: "center",
                      alignItems: "center",
                      gap: "10px",
                      borderRadius: "16px",
                      background: "#8D52A7",
                      border: "none",
                      cursor: "pointer",
                      color: "white",
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
                        d="M12 5V19M5 12H19"
                        stroke="white"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </Link>
                </div>

                {/* Stacked List Container */}
                <div className="flex flex-col gap-3 w-full">
                  {/* Recent Reports List */}
                  { loading ? (
                    <div
                      className="flex items-center justify-center w-full box-border"
                      style={{
                        minHeight: "100px", // or match your card height
                        padding: "25.044px",
                        borderRadius: "14px",
                        border: "1.052px solid #5E9BBA",
                        background: "#FFF",
                        boxShadow: "0 10px 15px -3px rgba(0,0,0,0.10), 0 4px 6px -4px rgba(0,0,0,0.10)",
                      }}
                    >
                      <span className="animate-pulse text-lg text-gray-500">Loading reports...</span>
                    </div>
                  ) : recentReports.length === 0 ? (
                    <div
                      className="flex flex-col items-center justify-center w-full box-border"
                      style={{
                        height: "auto",
                        padding: "25.044px 25.044px 25.044px",
                        borderRadius: "14px",
                        border: "1.052px solid #5E9BBA",
                        background: "#FFF",
                        boxShadow:
                          "0 10px 15px -3px rgba(0, 0, 0, 0.10), 0 4px 6px -4px rgba(0, 0, 0, 0.10)",
                      }}
                    >
                      <FileText className="text-[#5E9BBA] w-[32px] h-[32px] mb-2" />
                      <h2
                        className="text-lg mb-1"
                        style={{
                          color: "#3C3333",
                          fontFamily: '"Genty Sans", sans-serif',
                        }}
                      >
                        My Recent Reports
                      </h2>
                      <div className="text-gray-500 text-center text-sm mb-3">
                        No recent reports found.
                      </div>
                      <Link
                        href="/form"
                        className="mt-1 px-4 py-2 rounded-lg bg-[#5E9BBA] text-white font-semibold hover:bg-[#4A7A97] transition"
                        onClick={() => router.push('/form')}
                      >
                        File Report
                      </Link>
                    </div>
                  ) : (
                    recentReports.slice(0, 3).map((report) => (
                      <div key={report.report_id} className="flex items-start justify-between p-3 bg-white rounded-xl border border-gray-200 shadow-sm w-full">
                        <div className="flex gap-3">
                          {/* Thumbnail */}
                          {report.photo_url ? (
                            <img
                              src={report.photo_url}
                              alt="Report Thumbnail"
                              className="w-[60px] h-[60px] rounded-lg object-cover bg-gray-200"
                            />
                          ) : (
                            <div className="w-[60px] h-[60px] rounded-lg object-cover bg-gray-200 flex items-center justify-center text-gray-400">
                              No Image
                            </div>
                          )}

                          {/* Text Details */}
                          <div className="flex flex-col gap-0.5">
                            <h4 className="text-[#3C3333] text-sm leading-tight font-['Genty_Sans']">
                              {report.report_title || "Untitled Report"}
                            </h4>
                            <span className="text-[#3C3333] text-xs font-['Genty_Sans'] flex items-center gap-1">
                              {/* Type Icon: PawPrint */}
                              <PawPrint size={12} color="gray" className="inline-block align-middle" />
                              {report.animal_type || "Unknown"} ({report.animal_gender || "Unknown"})
                            </span>
                            <span className="text-gray-500 text-[10px] leading-tight font-['Genty_Sans'] flex items-center gap-1">
                              {/* Area Icon */}
                              <svg width="12" height="12" fill="none" viewBox="0 0 24 24"><path d="M12 21c-4.418 0-8-4.03-8-9a8 8 0 0 1 16 0c0 4.97-3.582 9-8 9Z" stroke="gray" strokeWidth="2"/><circle cx="12" cy="12" r="3" stroke="gray" strokeWidth="2"/></svg>
                              {report.area || "Unknown"}{report.landmark ? ` - near ${report.landmark}` : ""}
                            </span>
                            <span className="text-gray-500 text-[10px] leading-tight font-['Genty_Sans'] flex items-center gap-1">
                              {/* Created At Icon */}
                              <svg width="12" height="12" fill="none" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" stroke="gray" strokeWidth="2"/><path d="M16 2v4M8 2v4M3 10h18" stroke="gray" strokeWidth="2"/></svg>
                              {typeof window !== 'undefined' && report.created_at ? `${formatDate(report.created_at)}, ${formatTime(report.created_at)}` : ''}
                            </span>

                            {/* Status Badge */}
                            <span className={`text-[10px] px-2 py-0.5 rounded-full w-fit mt-1 font-['Genty_Sans'] ${getStatusColor(report.report_status)}`}>
                              {report.report_status || "Pending"}
                            </span>
                          </div>
                        </div>

                        {/* View Button */}
                        <button
                          className="flex text-white text-xs rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2 self-center"
                          style={{
                            backgroundColor: "#8D52A7",
                            padding: "8px 8px",
                            fontFamily: '"Genty Sans", sans-serif',
                          }}
                          onClick={() => handleOpenReport(report)}
                        >
                          View
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M5 12h14" />
                            <path d="M12 5l7 7-7 7" />
                          </svg>
                        </button>
                      </div>
                    ))
                  )}
                </div>
                <ReportDetailsModal
                  report={selectedReport}
                  isOpen={isModalOpen}
                  onClose={handleCloseReport}
                />

                {/* Quick Actions Section */}
                <div className="flex flex-col items-start gap-[15.989px] mt-8">
                  <h3
                    style={{
                      color: "#5D4037",
                      fontFamily: '"Genty Sans", sans-serif',
                      fontSize: "24px",
                      fontStyle: "normal",
                      fontWeight: 500,
                      lineHeight: "32px",
                      width: "327px",
                    }}
                  >
                    Quick Actions
                  </h3>
                </div>
                <div className=" flex flex-col gap-6 md:flex-row gap-3 md:gap-4 justify-center w-full">
                  {/* Animal Profiles QA Card*/}
                  <Link
                    href="/catalog"
                    className="flex-1
      relative flex justify-between w-full
      box-border overflow-hidden
      h-[147px] p-[25px]
      items-center rounded-[14px]
      shadow-lg bg-[#DCB57E]
    "
                  >
                    {/* Content Container */}
                    <div className="flex flex-col items-start gap-1 z-10">
                      {/* Icon */}
                      <img
                        className="w-[32px] h-[32px]"
                        src="/paws/paws1.png"
                        alt="paw"
                      />
                      {/* Title */}
                      <h2
                        className="text-lg m-0 leading-tight"
                        style={{
                          color: "white",
                          fontFamily: '"Genty Sans", sans-serif',
                        }}
                      >
                        Animal Profiles
                      </h2>
                      {/* Subtitle */}
                      <p
                        className="text-xs m-0"
                        style={{
                          color: "#3C3333",
                          fontFamily: '"Genty Sans", sans-serif',
                        }}
                      >
                        View and explore animal profiles
                      </p>
                    </div>

                    {/* Decorative SVG */}
                    <div className="absolute bottom-0 right-[-10px] z-0 opacity-80 pointer-events-none">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="135"
                        height="146"
                        viewBox="0 0 135 146"
                        fill="none"
                      >
                        <path
                          d="M102.5 42.0226C102.5 30.7288 86.3353 21.767 66.6246 24.3751C37.6888 28.1938 24.4663 73.1738 25.6246 81.2501C26.4446 86.962 43.3058 95.2413 63.0986 89.3751C76.0238 85.5401 83.1886 77.5938 87.1246 69.0626"
                          stroke="#A5885F"
                          strokeWidth="4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M82 113.75V117.812"
                          stroke="#A5885F"
                          strokeWidth="4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M115.312 132.031H130.688L123 138.125L115.312 132.031Z"
                          stroke="#A5885F"
                          strokeWidth="4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M45.3051 91.3821C42.4364 100.163 40.9898 109.197 41.0001 118.268C41.0001 152.165 77.7156 170.625 123 170.625C168.285 170.625 205 152.165 205 118.268C205 109.647 203.34 100.393 199.947 91.3821M105.206 41.9659C111.067 41.0531 117.027 40.6041 123 40.6252C130.995 40.6252 138.375 41.5027 145.15 43.1115"
                          stroke="#A5885F"
                          strokeWidth="4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                  </Link>

                  {/* Animal Report QA Card */}
                  <Link
                    href="/form"
                    className="
      flex-1 relative flex justify-between w-full
      box-border overflow-hidden
      h-[147px] p-[25px]
      items-center rounded-[14px]
      shadow-lg bg-[#5E9BBA]
    "
                  >
                    {/* Content Container */}
                    <div className="flex flex-col items-start gap-1 z-10">
                      {/* Icon */}
                      <img
                        className="w-[32px] h-[32px] color-white"
                        src="/nav/report.png"
                        alt="report"
                      />

                      {/* Title */}
                      <h2
                        className="text-lg m-0 leading-tight"
                        style={{
                          color: "white",
                          fontFamily: '"Genty Sans", sans-serif',
                        }}
                      >
                        Animal Reports
                      </h2>

                      {/* Subtitle */}
                      <p
                        className="text-xs m-0"
                        style={{
                          color: "#213641",
                          fontFamily: '"Genty Sans", sans-serif',
                        }}
                      >
                        Report animals and view status
                      </p>
                    </div>

                    {/* Decorative SVG */}
                    <div className="absolute bottom-0 right-[-10px] z-0 opacity-80 pointer-events-none">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="124"
                        height="120"
                        viewBox="0 0 124 120"
                        fill="none"
                      >
                        <path
                          d="M108.146 12.0835H44.7497C40.7935 12.0835 36.9994 13.3566 34.202 15.6226C31.4046 17.8887 29.833 20.9621 29.833 24.1668V120.834C29.833 124.038 31.4046 127.112 34.202 129.378C36.9994 131.644 40.7935 132.917 44.7497 132.917H134.25C138.206 132.917 142 131.644 144.797 129.378C147.595 127.112 149.166 124.038 149.166 120.834V45.3127L108.146 12.0835Z"
                          stroke="#47748C"
                          strokeWidth="4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M104.417 12.0835V48.3335H149.167"
                          stroke="#47748C"
                          strokeWidth="4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                  </Link>
                  {/* Volunteer Request QA Card */}
                  <Link
                    href="/volunteer"
                    className=" flex-1
      relative flex justify-between w-full
      box-border overflow-hidden
      h-[147px] p-[25px]
      items-center rounded-[14px]
      shadow-lg bg-[#C575AD]
    "
                  >
                    {/* Content Container */}
                    <div className="flex flex-col items-start gap-1 z-10">
                      {/* Icon */}
                      <img
                        src="/nav/user.png"
                        alt="user"
                        className="w-[32px] h-[32px] color-white"
                      />

                      {/* Title */}
                      <h2
                        className="text-lg m-0 leading-tight"
                        style={{
                          color: "white",
                          fontFamily: '"Genty Sans", sans-serif',
                        }}
                      >
                        Volunteer Request
                      </h2>

                      {/* Subtitle */}
                      <p
                        className="text-xs m-0"
                        style={{
                          color: "#45293D",
                          fontFamily: '"Genty Sans", sans-serif',
                        }}
                      >
                        View and explore volunteer opportunities
                      </p>
                    </div>

                    {/* Decorative SVG */}
                    <div className="absolute bottom-0 right-[-10px] z-0 opacity-80 pointer-events-none">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="118"
                        height="134"
                        viewBox="0 0 118 134"
                        fill="none"
                      >
                        <path
                          d="M134.25 82.0418V44.7502C134.25 40.794 132.679 36.9999 129.881 34.2025C127.084 31.4051 123.29 29.8335 119.334 29.8335C115.378 29.8335 111.583 31.4051 108.786 34.2025C105.989 36.9999 104.417 40.794 104.417 44.7502"
                          stroke="#945882"
                          strokeWidth="4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M104.416 74.5832V29.8332C104.416 25.877 102.845 22.0829 100.047 19.2855C97.2499 16.4881 93.4558 14.9165 89.4997 14.9165C85.5435 14.9165 81.7494 16.4881 78.952 19.2855C76.1546 22.0829 74.583 25.877 74.583 29.8332V44.7498"
                          stroke="#945882"
                          strokeWidth="4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M74.5833 78.3127V44.7502C74.5833 40.794 73.0118 36.9999 70.2143 34.2025C67.4169 31.4051 63.6228 29.8335 59.6667 29.8335C55.7105 29.8335 51.9164 31.4051 49.119 34.2025C46.3216 36.9999 44.75 40.794 44.75 44.7502V104.417"
                          stroke="#945882"
                          strokeWidth="4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M134.25 59.6667C134.25 55.7105 135.821 51.9164 138.619 49.119C141.416 46.3216 145.21 44.75 149.166 44.75C153.122 44.75 156.917 46.3216 159.714 49.119C162.511 51.9164 164.083 55.7105 164.083 59.6667V104.417C164.083 120.241 157.797 135.418 146.607 146.607C135.417 157.797 120.241 164.083 104.416 164.083H89.4996C68.6163 164.083 55.9371 157.669 44.8242 146.631L17.9742 119.781C15.4081 116.939 14.0331 113.219 14.1341 109.391C14.2351 105.563 15.8042 101.921 18.5166 99.2179C21.229 96.5151 24.8769 94.9589 28.7051 94.8715C32.5332 94.7841 36.2484 96.1721 39.0813 98.7483L52.208 111.875"
                          stroke="#945882"
                          strokeWidth="4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>{" "}
                    </div>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>

      {/* Footer */}
      <footer className="py-6 border-t">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <p className="text-xs text-gray-500" style={{ fontFamily: '"Genty Sans", sans-serif' }}>
            Pawject Patrol — Youth For Animals UP Mindanao
          </p>
        </div>
      </footer>
    </main>
  );
}