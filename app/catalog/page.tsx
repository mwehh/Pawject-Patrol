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
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/utils/supabase/client";
import Sidebar from "@/components/Sidebar";
import PawfectMatchModal from "@/components/PawfectMatchModal";
import AnimalDetailModal from "@/components/AnimalDetailModal";

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

// AnimalDetailModal extracted to components/AnimalDetailModal.tsx

// Catalog Page Component
export default function CatalogPage() {
  // State variables
  const [filter, setFilter] = useState<"all" | "cat" | "dog">("all");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
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
  const [pawfectMatchOpen, setPawfectMatchOpen] = useState(false);

  useEffect(() => {
    if (searchParams?.get("pawfectmatch") === "true") {
      setPawfectMatchOpen(true);
      // Optional: clear the param from the URL so it doesn't reopen on refresh
      if (typeof window !== "undefined") {
        window.history.replaceState({}, '', '/catalog');
      }
    }
  }, [searchParams]);

  // If opened via QR (or direct link) like /catalog?animal_id=..., auto-open the modal.
  useEffect(() => {
    const animalId = searchParams.get("animal_id");
    if (!animalId) return;
    if (loading) return;
    if (selectedAnimal) return;

    const found = animals.find((a) => String(a.animal_id) === String(animalId));
    if (found) setSelectedAnimal(found);
  }, [searchParams, animals, loading, selectedAnimal]);

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
        <div className="max-w-6xl mx-auto px-4 py-0 pl-6 pr-6">
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
                      src={pet.animal_photo || "/paws/paws1.png"}
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

      {/* Pawfect Match Modal */}
      <PawfectMatchModal
        isOpen={pawfectMatchOpen}
        onClose={() => setPawfectMatchOpen(false)}
      />
    </>
  );
}