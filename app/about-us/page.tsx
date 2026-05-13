"use client";

import {
  Menu,
  LogIn,
  Mail,
  Phone,
  MapPin,
  Instagram,
  Twitter,
  Facebook,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabase/client";
import Sidebar from "@/components/Sidebar";
import AdminNotificationsBell from "@/components/AdminNotificationsBell";
import UserNotificationsBell from "@/components/UserNotificationsBell";


export default function Home() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [sidebarVariant, setSidebarVariant] = useState<"user" | "admin" | "guest">("guest");

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace(sidebarVariant === "admin" ? "/admin/login" : "/login");
  };

  // Fetch user info and set sidebar variant
  useEffect(() => {
    const fetchUserAndVariant = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);
      if (user) {
        setUserName(user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@") [0] || "");
        setUserEmail(user.email || "");
        if (user.email && user.email.endsWith("@up.edu.ph")) {
          setSidebarVariant("user");
        } else {
          // Check if admin by querying the admin table using auth_id
          const { data: adminData, error } = await supabase
            .from('admin')
            .select('auth_id')
            .eq('auth_id', user.id)
            .single();
          if (adminData && !error) {
            setSidebarVariant("admin");
          } else {
            setSidebarVariant("user");
          }
        }
      } else {
        setSidebarVariant("guest");
      }
    };
    fetchUserAndVariant();
    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setIsAuthenticated(!!session?.user);
      if (session?.user) {
        setUserName(session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email?.split("@") [0] || "");
        setUserEmail(session.user.email || "");
        if (session.user.email && session.user.email.endsWith("@up.edu.ph")) {
          setSidebarVariant("user");
        } else {
          const { data: adminData, error } = await supabase
            .from('admin')
            .select('auth_id')
            .eq('auth_id', session.user.id)
            .single();
          if (adminData && !error) {
            setSidebarVariant("admin");
          } else {
            setSidebarVariant("user");
          }
        }
      } else {
        setSidebarVariant("guest");
      }
    });
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <main className="relative min-h-screen bg-[#E1E69D] flex flex-col items-center overflow-hidden">
      {/* Sidebar */}
      <Sidebar 
        sidebarOpen={sidebarOpen} 
        setSidebarOpen={setSidebarOpen} 
        userName={userName} 
        userEmail={userEmail} 
        variant={sidebarVariant} 
        router={router} 
      />

      {/* --- Hero Container--- */}
      <div className="relative w-full flex flex-col items-center overflow-hidden">
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
            className="absolute hidden lg:block w-full h-auto top-[-20vh]"
          >
            <path
              d="M1624 187C1624 298.562 1176.24 389 623.898 389C71.5543 389 -376.209 298.562 -376.209 187C-376.209 75.4385 71.5543 -15 623.898 -15C1176.24 -15 1624 75.4385 1624 187Z"
              fill="#C2C876"
            />
          </svg>
        </div>

        {/* Header  */}
        <header className="flex items-center justify-between px-4 w-full h-[52px] bg-[#E6E6E6] mx-auto z-10">
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
            <div className="flex items-center gap-2">
              {isAuthenticated && sidebarVariant === "admin" ? (
                <AdminNotificationsBell />
              ) : null}

              {isAuthenticated && sidebarVariant === "user" ? (
                <UserNotificationsBell />
              ) : null}

              {isAuthenticated ? (
                <>
                  <button
                    onClick={handleLogout}
                    className="hidden md:flex items-center gap-2 bg-[#8D52A7] hover:bg-[#7B4692] text-white px-4 py-2 rounded-lg transition-colors font-medium text-sm"
                    style={{ fontFamily: '"Genty Sans", sans-serif' }}
                  >
                    <span>Logout</span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
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
                </>
              ) : (
                <button
                  className="p-2 hover:bg-gray-100 rounded-lg transition"
                  onClick={() => router.push("/login")}
                  aria-label="Login"
                >
                  <LogIn className="w-6 h-6 text-gray-800" />
                </button>
              )}
            </div>
          </div>
        </header>

        {/* --- Main Card --- */}
        <div
          className="
            relative 
            w-[90%] 
            max-w-3xl lg:max-w-6xl
            bg-[#E6E6E6] 
            rounded-3xl 
            mt-6 
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
          {/* Back to Home Button */}
          <div className="absolute bottom-[-20px] sm:bottom-[-24px] md:bottom-[-20px] flex justify-center">
            <Button
              className="flex w-[155px] sm:w-[165px] md:w-[175px] h-[35px] sm:h-[38px] md:h-[40px] px-4 py-2 items-start gap-[10px] bg-[#8D52A7] hover:bg-[#7B4692] text-white font-bold text-sm sm:text-base rounded-lg shadow-lg transition-all"
              onClick={() => router.push(sidebarVariant === "admin" ? "/admin" : "/")}
            >
              Back to Home
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
                    if (item.target === "top") {
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
                fontFamily: 'Help_Loyola Round, "Kawaii RT", sans-serif',
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
                  fontFamily: 'Help_Loyola Round, "Kawaii RT", sans-serif',
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
                  fontFamily: 'Help_Loyola Round, "Kawaii RT", sans-serif',
                }}
              >
                A compassionate and informed community committed to fostering
                kindness, empathy, and respect for all animals through
                education, responsible pet ownership, and collaborative efforts.
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
                  fontFamily: 'Help_Loyola Round, "Kawaii RT", sans-serif',
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
                  fontFamily: 'Help_Loyola Round, "Kawaii RT", sans-serif',
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
                fontFamily: 'Help_Loyola Round, "Kawaii RT", sans-serif',
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
                fontFamily: 'Help_Loyola Round, "Kawaii RT", sans-serif',
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
                fontFamily: 'Help_Loyola Round, "Kawaii RT", sans-serif',
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