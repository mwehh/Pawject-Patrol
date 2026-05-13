"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Menu,
  LogIn,
  MapPin,
  PawPrint,
  Unlink2,
  ArrowRight,
  X,
  Facebook,
  Instagram,
  Twitter,
  Mail,
} from "lucide-react";
import { FaMars, FaVenus } from "react-icons/fa";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabase/client";
import Sidebar from "@/components/Sidebar";

// Panel colors
const panelColors = ["#689668", "#DCB57E", "#5E9BBA", "#C575AD", "#8D52A7"];

// Map of hover colors
const hoverColors: Record<string, string> = {
  "#689668": "#5E875E",
  "#DCB57E": "#C6A371",
  "#5E9BBA": "#558CA7",
  "#C575AD": "#B1699C",
  "#8D52A7": "#7F4A96",
};

// Helper: get random color not equal to last color
function getRandomColor(lastColor: string | null) {
  const filtered = panelColors.filter((c) => c !== lastColor);
  return filtered[Math.floor(Math.random() * filtered.length)];
}

// Helper: convert animal_theme name to hex color
function getThemeColor(theme: string | null): string {
  if (!theme) return "#689668"; // default green
  const themeMap: Record<string, string> = {
    blue: "#5E9BBA",
    green: "#689668",
    orange: "#DCB57E",
    pink: "#C575AD",
    purple: "#8D52A7",
  };
  return themeMap[theme.toLowerCase()] || "#689668";
}

// Animal type definition
interface Animal {
  animal_id: string;
  animal_name: string | null;
  animal_species: string | null;
  animal_breed: string | null;
  animal_age: string | null;
  animal_gender: string | null;
  animal_description: string | null;
  animal_status: string | null;
  animal_photo: string | null;
  animal_affiliation: string | null;
  animal_collar: string | null;
  animal_theme: string | null;
  created_at: string | null;
  vaccination_status?: string | null;
  health_issues?: string | null;
}

// Animal Detail Modal Component
function AnimalDetailModal({
  animal,
  onClose,
}: {
  animal: Animal | null;
  onClose: () => void;
}) {
  const [activeTab, setActiveTab] = useState<"details" | "health" | "qr">("details");

  if (!animal) return null;

  const color = getThemeColor(animal.animal_theme);
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
          {/* Close Button - Top Left */}
          <button
            onClick={onClose}
            className="
             absolute top-4 left-4 
             flex justify-center items-center 
             rounded-full 
             border border-white/60 
             backdrop-blur-md
             z-50
             transition-all duration-200
             hover:bg-white/20
             hover:scale-105
             "
            style={{
              width: "35.988px",
              height: "35.988px",
              paddingRight: "0.016px",
              background: "transparent",
              borderRadius: "35289400px",
            }}
          >
            <X className="w-5 h-5 text-white" />
          </button>

          {/* Animal Photo */}
          {animal.animal_photo ? (
            <Image
              src={animal.animal_photo}
              alt={animal.animal_name || "Animal"}
              fill
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-400">
              No photo
            </div>
          )}

          {/* Status Pill - Top Right */}
          <div
            className="absolute top-4 right-4 flex items-center justify-center rounded-full border border-white/60 backdrop-blur-md px-4 py-1 z-50 text-white"
            style={{
              backgroundColor: "rgba(0,0,0,0.15)",
              fontFamily: '"Genty Sans", sans-serif',
              fontSize: "14px",
              fontWeight: 600,
            }}
          >
            {animal.animal_status || "Ready for Adoption"}
          </div>

          {/* Name Overlay */}
          <div className="absolute bottom-4 left-4 text-white drop-shadow-lg">
            <h2
              className="text-3xl font-extrabold"
              style={{ fontFamily: '"Genty Sans", sans-serif' }}
            >
              {animal.animal_name || "Unnamed"}
            </h2>
            <p
              className="text-sm font-medium"
              style={{ fontFamily: '"Genty Sans", sans-serif' }}
            >
              {[animal.animal_breed].filter(Boolean).join(" • ") || "Unknown"}
            </p>
          </div>
        </div>

        {/* Content Section */}
        <div
          className="p-6"
          style={{
            fontFamily: '"Genty Sans", sans-serif',
            backgroundColor: color,
            color: "#E6E6E6",
          }}
        >
          <p className="mb-4 flex items-center gap-2">
            <MapPin className="w-4 h-4" /> {animal.animal_affiliation || "CSM"}
          </p>

          {/* Quick Info Pills */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {/* Pill 1 */}
            <div
              className="flex flex-col justify-between items-center flex-[1_0_0] rounded-[10px] border border-white/60 backdrop-blur-md text-center"
              style={{
                height: "53.999px",
                padding: "5px 9px",
                backgroundColor: "rgba(0,0,0,0.15)",
              }}
            >
              <PawPrint className="w-5 h-5 mx-auto" />
              <span className="text-xs">
                {animal.animal_species || "Unknown"}
              </span>
            </div>

            {/* Pill 2 */}
            <div
              className="flex flex-col justify-between items-center flex-[1_0_0] rounded-[10px] border border-white/60 backdrop-blur-md text-center"
              style={{
                height: "53.999px",
                padding: "5px 9px",
                backgroundColor: "rgba(0,0,0,0.15)",
              }}
            >
              {animal.animal_gender === "Male" ? (
                <FaMars className="w-5 h-5" />
              ) : (
                <FaVenus className="w-5 h-5" />
              )}
              <span className="text-xs">
                {animal.animal_gender || "Unknown"}
              </span>
            </div>

            {/* Pill 3 */}
            <div
              className="flex flex-col justify-between items-center flex-[1_0_0] rounded-[10px] border border-white/60 backdrop-blur-md text-center"
              style={{
                height: "53.999px",
                padding: "5px 9px",
                backgroundColor: "rgba(0,0,0,0.15)",
              }}
            >
              <Unlink2 className="w-5 h-5" />
              <span className="text-xs">
                {animal.animal_collar &&
                animal.animal_collar.toLowerCase() !== "none"
                  ? "Has Collar"
                  : "No Collar"}
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
                backgroundColor:
                  activeTab === "details"
                    ? "#E6E6E6"
                    : "transparent",
                color: activeTab === "details" ? hoverColor : "#E6E6E6",
              }}
            >
              Details
            </button>
            <button
              onClick={() => setActiveTab("health")}
              className="flex-1 py-2 rounded font-semibold transition-all"
              style={{
                backgroundColor:
                  activeTab === "health"
                    ? "#E6E6E6"
                    : "transparent",
                color: activeTab === "health" ? hoverColor : "#E6E6E6",
              }}
            >
              Health
            </button>
            <button
              onClick={() => setActiveTab("qr")}
              className="flex-1 py-2 rounded font-semibold transition-all"
              style={{
                backgroundColor:
                  activeTab === "qr"
                    ? "#E6E6E6"
                    : "transparent",
                color: activeTab === "qr" ? hoverColor : "#E6E6E6",
              }}
            >
              QR
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
                    {animal.health_issues && animal.health_issues.toLowerCase() !== "none" && (
                      <div>
                        <p className="font-semibold mb-1">Health Issues:</p>
                        <p className="leading-relaxed">{animal.health_issues}</p>
                      </div>
                    )}
                    {(!animal.health_issues || animal.health_issues.toLowerCase() === "none") && animal.vaccination_status && (
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
            {activeTab === "qr" && (
              <div className="flex flex-col sm:flex-row gap-4 items-start pb-4">
                <div className="bg-white p-2 rounded-lg flex-shrink-0 mx-auto sm:mx-0 shadow-lg">
                  {/* Using a free QR generation API to build a real QR code matching the mock */}
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://pawjectpatrol.app/catalog/${animal.animal_id}`}
                    alt="QR Code"
                    width={100}
                    height={100}
                    className="rounded"
                    style={{ backgroundColor: "white" }}
                  />
                </div>
                <div className="flex-1 text-center sm:text-left mt-2 sm:mt-0">
                  <h3 className="text-lg font-bold mb-1 tracking-wide" style={{ fontFamily: '"Genty Sans", sans-serif' }}>
                    Help ( {animal.animal_name} ) !
                  </h3>
                  <p className="leading-relaxed text-xs opacity-90 drop-shadow-sm text-justify">
                    {animal.animal_description ||
                      "He's a medium-sized, scruffy tan dog with patches of darker brown along his back and a white spot on his chest. One ear stands up while the other droops. His fur is dusty a"}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Catalog Page Component
export default function CatalogPage() {
  // State variables
  const [filter, setFilter] = useState<"all" | "cat" | "dog">("all");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // User info state for sidebar
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  // Sidebar variant state
  const [sidebarVariant, setSidebarVariant] = useState<"user" | "admin" | "guest">("guest");
  // Search state
  const [search, setSearch] = useState("");

  // Modal state
  const [selectedAnimal, setSelectedAnimal] = useState<Animal | null>(null);

  useEffect(() => {
    // Check if the user is authenticated and set sidebar variant
    const checkAuthAndVariant = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);
      if (user) {
        setUserEmail(user.email || "");
        const nameFromMeta =
          user.user_metadata?.full_name || user.user_metadata?.name || "";
        setUserName(nameFromMeta || user.email?.split("@")[0] || "");
        // Determine variant
        if (user.email && user.email.endsWith("@up.edu.ph")) {
          setSidebarVariant("user");
        } else {
          // Check admin table
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
        setUserName("");
        setUserEmail("");
        setSidebarVariant("guest");
      }
    };
    checkAuthAndVariant();
    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setIsAuthenticated(!!session?.user);
      if (session?.user) {
        setUserEmail(session.user.email || "");
        const nameFromMeta =
          session.user.user_metadata?.full_name ||
          session.user.user_metadata?.name ||
          "";
        setUserName(nameFromMeta || session.user.email?.split("@")[0] || "");
        // Determine variant
        if (session.user.email && session.user.email.endsWith("@up.edu.ph")) {
          setSidebarVariant("user");
        } else {
          // Check admin table
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
        setUserName("");
        setUserEmail("");
        setSidebarVariant("guest");
      }
    });
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Fetch animals on mount
  useEffect(() => {
    // Make API call to fetch animals
    const fetchAnimals = async () => {
      // Set loading and error states
      setLoading(true);
      setError(null);

      // Fetch animals from Supabase (animal table only, not join)
      const { data, error } = await supabase
        .from("animal")
        .select("*")
        .order("created_at", { ascending: false });

      // Handle errors or set animals
      if (error) {
        setError(error.message);
        setAnimals([]);
      } else {
        setAnimals((data || []) as Animal[]);
      }

      // Finalize loading state
      setLoading(false);
    };
    // Start fetching animals
    fetchAnimals();
  }, []);

  // Filter animals based on selected filter and search
  const filteredAnimals = animals.filter((animal) => {
    // Filter by species
    if (filter !== "all") {
      const species = (animal.animal_species || "").toLowerCase();
      if (species !== filter) return false;
    }
    // Filter by search (name, breed, species, gender)
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      if (
        !(animal.animal_name || "").toLowerCase().includes(q) &&
        !(animal.animal_breed || "").toLowerCase().includes(q) &&
        !(animal.animal_species || "").toLowerCase().includes(q) &&
        !(animal.animal_gender || "").toLowerCase().includes(q)
      ) {
        return false;
      }
    }
    return true;
  });

  return (
    <>
      <main className="min-h-screen bg-[#E6E6E6]">
        {/* Sidebar */}
        <Sidebar
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          userName={userName}
          userEmail={userEmail ?? undefined}
          router={router}
          variant={sidebarVariant}
        />

        {/* Determine Sidebar variant after admin check */}
        {/* The Sidebar above will be re-rendered with the correct variant after admin check below */}
        {/* Admin/user/guest logic for Sidebar variant */}
        {/* This logic is handled in useEffect, so we can set a state for sidebarVariant */}
        <div className="max-w-6xl mx-auto px-4 py-0 pl-[24px] pr-[24px]">
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
              {/* Login/Logout Button */}
              <button
                className="p-2 hover:bg-gray-100 rounded-lg transition"
                onClick={async () => {
                  // If not authenticated, go to /login
                  if (!isAuthenticated) {
                    router.push("/login");
                    return;
                  }
                  // Check if admin by querying admin table
                  const { data: { user } } = await supabase.auth.getUser();
                  if (user) {
                    const { data: adminData, error } = await supabase
                      .from('admin')
                      .select('auth_id')
                      .eq('auth_id', user.id)
                      .single();
                    if (adminData && !error) {
                      // Admin: logout and go to /admin/login
                      await supabase.auth.signOut();
                      router.replace("/admin/login");
                      return;
                    }
                  }
                  // User: logout and go to /login
                  await supabase.auth.signOut();
                  router.replace("/login");
                }}
                aria-label={isAuthenticated ? "Logout" : "Login"}
              >
                  <LogIn className="w-6 h-6 text-gray-800" />
              </button>
            </div>
          </div>
          {/* Page header below navigation, styled like animal profile form */}
          <header className="flex flex-col items-start justify-center py-6 mb-6">
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
              Animal Catalog
            </h1>
            <p
              className="text-xs sm:text-sm md:text-md"
              style={{
                color: "#3C3333",
                fontFamily: '"Genty Sans", sans-serif',
              }}
            >
              Browse all animals available for adoption and care
            </p>
          </header>

          {/* Filter Buttons and Search input in one row */}
          <div className="flex flex-wrap gap-2 mb-6 items-center justify-between">
            <div className="flex gap-2">
              <button
                onClick={() => setFilter("all")}
                className={`px-6 py-2 rounded-full font-medium transition-all ${
                  filter === "all"
                    ? "bg-purple-600 text-white shadow-lg"
                    : "bg-white text-gray-700 hover:bg-purple-50 border border-gray-200"
                }`}
              >
                All Animals
              </button>
              <button
                onClick={() => setFilter("cat")}
                className={`px-6 py-2 rounded-full font-medium transition-all ${
                  filter === "cat"
                    ? "bg-purple-600 text-white shadow-lg"
                    : "bg-white text-gray-700 hover:bg-purple-50 border border-gray-200"
                }`}
              >
                🐱 Cats
              </button>
              <button
                onClick={() => setFilter("dog")}
                className={`px-4 py-2 rounded-full font-medium transition-all ${
                  filter === "dog"
                    ? "bg-purple-600 text-white shadow-lg"
                    : "bg-white text-gray-700 hover:bg-purple-50 border border-gray-200"
                }`}
              >
                🐶 Dogs
              </button>
            </div>
            <div className="flex-1 flex justify-end min-w-[300px] mt-4">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, breed, or species..."
                className="w-full max-w-sm px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
              />
            </div>
          </div>

          {/* Pet Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAnimals.map((pet: Animal) => {
              // Convert animal_theme name to hex color
              const color = getThemeColor(pet.animal_theme);
              const pillHover = hoverColors[color] || "#000";
              return (
                <div
                  key={pet.animal_id}
                  className="shadow-lg hover:shadow-xl transition rounded-2xl overflow-hidden flex flex-col h-full bg-transparent"
                >
                  {/* Image Section */}
                  <div className="relative h-64 w-full bg-white">
                    <Image
                      src={pet.animal_photo || "/default-animal.jpg"}
                      alt={pet.animal_name || "Animal"}
                      fill
                      className="object-cover"
                    />
                    <div className="absolute bottom-3 left-3 text-white">
                      <h3 className="text-xl font-extrabold"
              style={{ fontFamily: '"Genty Sans", sans-serif' }}>
                        {pet.animal_name}
                      </h3>
                      <p className="text-sm font-medium drop-shadow">
                        {pet.animal_breed}
                      </p>
                    </div>
                  </div>

                  {/* Colored Panel - fills bottom, no white space */}
                  <div
                    className="flex-1 flex flex-col justify-between p-5 rounded-b-2xl"
                    style={{
                      backgroundColor: color,
                      color: "#E6E6E6",
                      fontFamily: '"Genty Sans", sans-serif',
                      fontSize: "15px",
                      fontStyle: "normal",
                      fontWeight: 500,
                      lineHeight: "20px",
                      minHeight: "180px",
                      marginTop: "-1px", // Remove gap between image and panel
                    }}
                  >
                    <p className="mb-3 flex items-center gap-2">
                      <MapPin className="w-4 h-4" />{" "}
                      {pet.animal_affiliation || "CSM"}
                    </p>

                    <div className="grid grid-cols-3 gap-3 mb-4 text-center">
                      {[
                        {
                          icon: <PawPrint className="w-5 h-5 mx-auto" />,
                          label: pet.animal_species,
                        },
                        {
                          icon:
                            pet.animal_gender === "Male" ? (
                              <FaMars className="w-5 h-5 mx-auto" />
                            ) : (
                              <FaVenus className="w-5 h-5 mx-auto" />
                            ),
                          label: pet.animal_gender,
                        },
                        {
                          icon: <Unlink2 className="w-5 h-5 mx-auto" />,
                          label:
                            pet.animal_collar &&
                            pet.animal_collar.toLowerCase() !== "none"
                              ? "Has Collar"
                              : "Has No Collar",
                        },
                      ].map((pill, i) => (
                        <div
                          key={i}
                          className="
                            flex flex-col justify-between items-center 
                            flex-[1_0_0] 
                            rounded-[10px] 
                            border border-white/60 
                            backdrop-blur-md 
                            text-center
                            "
                          style={{
                            height: "53.999px",
                            padding: "5px 9px",
                            backgroundColor: "rgba(0,0,0,0.15)",
                            color: "#E6E6E6",
                          }}
                        >
                          {pill.icon}
                          <span className="text-xs">{pill.label}</span>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={() => setSelectedAnimal(pet)}
                      className="color-[#E6E6E6] flex items-center gap-2 hover:opacity-80 transition"
                    >
                      View Details{" "}
                      <ArrowRight className="w-6 h-6 color-[#E6E6E6]" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredAnimals.length === 0 && (
            <div className="text-center py-16">
              <p className="text-gray-500 text-lg">
                No animals found in this category.
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Animal Detail Modal */}
      <AnimalDetailModal
        animal={selectedAnimal}
        onClose={() => setSelectedAnimal(null)}
      />
    </>
  );
}