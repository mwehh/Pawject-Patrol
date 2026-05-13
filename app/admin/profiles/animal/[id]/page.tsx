"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import {
  Menu,
  LogIn,
  MapPin,
  X,
  Facebook,
  Instagram,
  Twitter,
  Mail,
} from "lucide-react";
import { supabase } from "@/utils/supabase/client";
import { deleteAnimalProfile } from "@/actions/profiles/admin";
import Sidebar from "@/components/Sidebar";

// Animal type definition
type Animal = {
  animal_id: string;
  animal_name: string | null;
  animal_species: string | null;
  animal_breed: string | null;
  animal_gender: string | null;
  animal_description: string | null;
  animal_status: string | null;
  animal_photo: string | null;
  created_at: string | null;
  animal_location?: string | null;
  vaccination_status?: string | null;
  recorder_name?: string | null;
  animal_theme?: string | null;
  date_seen?: string | null;
  area?: string | null;
  landmark?: string | null;
  road?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  health_issues?: string | null;
  animal_collar?: string | null;
  other_information?: string | null;
};

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

export default function AdminAnimalDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string | undefined;

  const [animal, setAnimal] = useState<Animal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // User info state for sidebar
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    if (!id) return;

    let active = true;

    const fetchOne = async () => {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("animal")
        .select("*")
        .eq("animal_id", id)
        .maybeSingle();

      if (!active) return;

      if (error) {
        setError(error.message);
        setAnimal(null);
      } else {
        setAnimal(data as Animal);
      }

      setLoading(false);
    };
    fetchOne();

    return () => {
      active = false;
    };
  }, [id]);

  // Fetch current user and verify admin privileges for sidebar display
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

				// Verify admin table contains this user
				const { data: adminData, error: adminError } = await supabase
					.from("admin")
					.select("auth_id")
					.eq("auth_id", user.id)
					.single();

				if (!mounted) return;

				if (adminError || !adminData) {
					router.replace("/admin/login");
					return;
				}
			} catch (e) {
				console.error("Admin check failed:", e);
				if (mounted) router.replace("/admin/login");
			}
		};

		checkAdmin();

		return () => {
			mounted = false;
		};
	}, [router]);

  const handleDelete = async () => {
    if (!id) return;

    setDeleting(true);

    try {
      const res = await deleteAnimalProfile(id);

      if (res.success) {
        router.push("/admin/profiles");
      } else {
        setError(res.error || "Failed to delete animal");
        setShowDeleteConfirm(false);
      }
    } catch (err: any) {
      setError(err?.message || "Unexpected error");
      setShowDeleteConfirm(false);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#E1E69D] p-4">
        <div
          className="text-center py-24"
          style={{ color: "#3C3333", fontFamily: '"Genty Sans", sans-serif' }}
        >
          Loading...
        </div>
      </main>
    );
  }

  if (error || !animal) {
    return (
      <main className="min-h-screen bg-[#E1E69D] p-4">
        <div
          className="text-center py-24"
          style={{ color: "#3C3333", fontFamily: '"Genty Sans", sans-serif' }}
        >
          {error ? `Error: ${error}` : "Animal not found."}
        </div>
      </main>
    );
  }

  const themeColor = getThemeColor(animal.animal_theme);

  // Handle user logout and redirect to login page
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
                  {animal.animal_id}
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
              Submitted on{" "}
              {animal.created_at
                ? new Date(animal.created_at).toLocaleDateString()
                : "—"}
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

          {/* Right Side: Edit & Delete Icons (Aligned to Bottom Right) */}
          <div className="flex gap-2 self-end">
            {/* Edit Button */}
            <Link
              href={`/admin/profiles/animal/${animal.animal_id}/edit`}
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
            </Link>

            {/* Delete Button */}
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex justify-center items-center w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 transition"
              aria-label="Delete"
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
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                <line x1="10" y1="11" x2="10" y2="17"></line>
                <line x1="14" y1="11" x2="14" y2="17"></line>
              </svg>
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
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <path
                    d="M11 6C12.1046 6 13 5.10457 13 4C13 2.89543 12.1046 2 11 2C9.89542 2 8.99999 2.89543 8.99999 4C8.99999 5.10457 9.89542 6 11 6Z"
                    stroke="#fff"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M18 10C19.1046 10 20 9.10457 20 8C20 6.89543 19.1046 6 18 6C16.8954 6 16 6.89543 16 8C16 9.10457 16.8954 10 18 10Z"
                    stroke="#fff"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M20 18C21.1046 18 22 17.1046 22 16C22 14.8954 21.1046 14 20 14C18.8954 14 18 14.8954 18 16C18 17.1046 18.8954 18 20 18Z"
                    stroke="#fff"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M8.99999 10C9.6566 10 10.3068 10.1293 10.9134 10.3806C11.52 10.6319 12.0712 11.0002 12.5355 11.4645C12.9998 11.9288 13.3681 12.48 13.6194 13.0866C13.8707 13.6932 14 14.3434 14 15V18.5C13.9997 19.3365 13.6999 20.1452 13.1548 20.7796C12.6097 21.4141 11.8554 21.8324 11.0286 21.9587C10.2017 22.085 9.35695 21.9111 8.64729 21.4683C7.93763 21.0255 7.41001 20.3432 7.15999 19.545C6.73333 18.1683 5.83333 17.2667 4.45999 16.84C3.66218 16.5901 2.98016 16.0629 2.53735 15.3538C2.09455 14.6446 1.92021 13.8004 2.04588 12.9739C2.17155 12.1473 2.58893 11.3931 3.2225 10.8476C3.85607 10.3021 4.66396 10.0015 5.49999 10H8.99999Z"
                    stroke="#fff"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Animal Information
              </h3>
              <div className="grid grid-cols-2 items-start gap-[10px] self-stretch text-xs">
                <div>
                  <p className="opacity-90">Type of Animal</p>
                  <p className="font-bold">{animal.animal_species || "—"}</p>
                </div>
                <div>
                  <p className="opacity-90">Gender</p>
                  <p className="font-bold">{animal.animal_gender || "—"}</p>
                </div>
                {animal.animal_breed && (
                  <div className="col-span-2">
                    <p className="opacity-90">Breed</p>
                    <p className="font-bold">{animal.animal_breed}</p>
                  </div>
                )}
                <div>
                  <p className="opacity-90">Physical Description</p>
                  <p className="font-bold">
                    {animal.animal_description || "No description provided"}
                  </p>
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
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="none"
                  >
                    <path
                      d="M15.8334 17.5V15.8333C15.8334 14.9493 15.4822 14.1014 14.8571 13.4763C14.232 12.8512 13.3841 12.5 12.5001 12.5H7.50008C6.61603 12.5 5.76818 12.8512 5.14306 13.4763C4.51794 14.1014 4.16675 14.9493 4.16675 15.8333V17.5"
                      stroke="white"
                      strokeWidth="1.66667"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M10.0001 9.16667C11.841 9.16667 13.3334 7.67428 13.3334 5.83333C13.3334 3.99238 11.841 2.5 10.0001 2.5C8.15913 2.5 6.66675 3.99238 6.66675 5.83333C6.66675 7.67428 8.15913 9.16667 10.0001 9.16667Z"
                      stroke="white"
                      strokeWidth="1.66667"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Recorder
                </h3>
                <p className="flex flex-col items-start gap-[10px] self-stretch text-xs">
                  {animal.recorder_name}
                </p>
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
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="none"
                  >
                    <path
                      d="M6.66675 1.6665V4.99984"
                      stroke="#FFF"
                      strokeWidth="1.66667"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M13.3333 1.6665V4.99984"
                      stroke="#FFF"
                      strokeWidth="1.66667"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M15.8333 3.3335H4.16667C3.24619 3.3335 2.5 4.07969 2.5 5.00016V16.6668C2.5 17.5873 3.24619 18.3335 4.16667 18.3335H15.8333C16.7538 18.3335 17.5 17.5873 17.5 16.6668V5.00016C17.5 4.07969 16.7538 3.3335 15.8333 3.3335Z"
                      stroke="#FFF"
                      strokeWidth="1.66667"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M2.5 8.3335H17.5"
                      stroke="#FFF"
                      strokeWidth="1.66667"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Date Seen
                </h3>
                <p className="flex flex-col items-start gap-[10px] self-stretch text-xs">
                  {new Date(animal.date_seen).toLocaleDateString()}
                </p>
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
              <button
                onClick={() => {
                  const iframe = document.getElementById('mapFrame') as HTMLIFrameElement;
                  if (iframe) {
                    iframe.src = `https://www.openstreetmap.org/export/embed.html?bbox=${Number(animal.longitude) - 0.01},${Number(animal.latitude) - 0.01},${Number(animal.longitude) + 0.01},${Number(animal.latitude) + 0.01}&layer=mapnik&marker=${animal.latitude},${animal.longitude}`;
                  }
                }}
                className="absolute bottom-4 right-4 bg-white hover:bg-gray-100 rounded-lg shadow-lg px-3 py-2 transition-all border border-gray-300 z-10 flex items-center gap-2"
                style={{ fontFamily: '"Genty Sans", sans-serif' }}
                title="Recenter Map"
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
                  <circle cx="12" cy="12" r="10" />
                  <circle cx="12" cy="12" r="3" />
                  <line x1="12" y1="1" x2="12" y2="5" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="7.05" y2="7.05" />
                  <line x1="16.95" y1="16.95" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="5" y2="12" />
                  <line x1="19" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="7.05" y2="16.95" />
                  <line x1="16.95" y1="7.05" x2="19.78" y2="4.22" />
                </svg>
                <span className="text-sm font-medium text-gray-700">Recenter</span>
              </button>
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
              {/* Health Icon */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
              >
                <path
                  d="M1.66675 7.91711C1.66677 6.98977 1.94808 6.08426 2.47353 5.32016C2.99898 4.55606 3.74385 3.96932 4.60976 3.63744C5.47567 3.30556 6.42188 3.24414 7.32343 3.46131C8.22497 3.67848 9.03944 4.16401 9.65925 4.85377C9.7029 4.90045 9.75568 4.93767 9.81431 4.96311C9.87294 4.98855 9.93617 5.00168 10.0001 5.00168C10.064 5.00168 10.1272 4.98855 10.1859 4.96311C10.2445 4.93767 10.2973 4.90045 10.3409 4.85377C10.9588 4.15952 11.7734 3.66991 12.6764 3.45011C13.5795 3.2303 14.528 3.29073 15.3958 3.62334C16.2636 3.95596 17.0096 4.54498 17.5343 5.31203C18.0591 6.07907 18.3378 6.98774 18.3334 7.91711C18.3334 9.82544 17.0834 11.2504 15.8334 12.5004L11.2567 16.9279C11.1015 17.1063 10.91 17.2495 10.6951 17.3482C10.4802 17.4468 10.2468 17.4986 10.0103 17.5001C9.77386 17.5016 9.53979 17.4528 9.32365 17.3569C9.10752 17.261 8.91427 17.1201 8.75675 16.9438L4.16675 12.5004C2.91675 11.2504 1.66675 9.83377 1.66675 7.91711Z"
                  stroke="#fff"
                  strokeWidth="1.66667"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Health & Identification
            </h3>

            <div className="flex flex-col items-start gap-[12px] self-stretch text-sm">
              {/* Vaccination Status */}
              <div className="flex flex-col items-start gap-1 w-full pb-2">
                <span className="text-gray-500 text-xs">
                  Vaccination Status
                </span>
                <span className="font-medium text-gray-900">
                  {animal.vaccination_status || "Unknown"}
                </span>
              </div>

              {/* Health Issues (Toggle) */}
              <div className="flex justify-between items-center w-full py-2 border-b border-gray-200/50">
                <span className="text-gray-500 text-xs">Health Issues</span>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold ${
                    animal.health_issues && animal.health_issues.toLowerCase() !== "none"
                      ? "bg-blue-100 text-blue-600"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {animal.health_issues && animal.health_issues.toLowerCase() !== "none" ? "Yes" : "No"}
                </span>
              </div>

              {animal.health_issues && animal.health_issues.toLowerCase() !== "none" && (
                <div className="flex flex-col items-start gap-1 w-full pb-2">
                  <span className="text-gray-500 text-xs">
                    Health Description
                  </span>
                  <span className="font-medium text-gray-900">{animal.health_issues}</span>
                </div>
              )}

              {/* Has Collar (Toggle) */}
              <div className="flex justify-between items-center w-full py-2 border-b border-gray-200/50">
                <span className="text-gray-500 text-xs">Has Collar</span>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold ${
                    animal.animal_collar &&
                    animal.animal_collar.toLowerCase() !== "none"
                      ? "bg-blue-100 text-blue-600"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {animal.animal_collar &&
                  animal.animal_collar.toLowerCase() !== "none"
                    ? "Yes"
                    : "No"}
                </span>
              </div>

              {animal.animal_collar &&
                animal.animal_collar.toLowerCase() !== "none" && (
                  <div className="flex flex-col items-start gap-1 w-full pt-1">
                    <span className="text-gray-500 text-xs">
                      Collar Details
                    </span>
                    <span className="font-medium text-gray-900">{animal.animal_collar}</span>
                  </div>
                )}
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
              {/* Additional Info Icon */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
              >
                <path
                  d="M12.4999 1.66699H4.99992C4.55789 1.66699 4.13397 1.84259 3.82141 2.15515C3.50885 2.46771 3.33325 2.89163 3.33325 3.33366V16.667C3.33325 17.109 3.50885 17.5329 3.82141 17.8455C4.13397 18.1581 4.55789 18.3337 4.99992 18.3337H14.9999C15.4419 18.3337 15.8659 18.1581 16.1784 17.8455C16.491 17.5329 16.6666 17.109 16.6666 16.667V5.83366L12.4999 1.66699Z"
                  stroke="#FFF"
                  strokeWidth="1.66667"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M11.6667 1.66699V5.00033C11.6667 5.44235 11.8423 5.86628 12.1549 6.17884C12.4675 6.4914 12.8914 6.66699 13.3334 6.66699H16.6667"
                  stroke="#FFF"
                  strokeWidth="1.66667"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M8.33341 7.5H6.66675"
                  stroke="#FFF"
                  strokeWidth="1.66667"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M13.3334 10.833H6.66675"
                  stroke="#FFF"
                  strokeWidth="1.66667"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Additional Information
            </h3>
            <p className="flex flex-col items-start gap-[10px] self-stretch text-xs text-gray-700">
              {animal.other_information || "No additional information provided"}
            </p>
          </div>

          {/* QR CARD */}
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
                  d="M12.4999 1.66699H4.99992C4.55789 1.66699 4.13397 1.84259 3.82141 2.15515C3.50885 2.46771 3.33325 2.89163 3.33325 3.33366V16.667C3.33325 17.109 3.50885 17.5329 3.82141 17.8455C4.13397 18.1581 4.55789 18.3337 4.99992 18.3337H14.9999C15.4419 18.3337 15.8659 18.1581 16.1784 17.8455C16.491 17.5329 16.6666 17.109 16.6666 16.667V5.83366L12.4999 1.66699Z"
                  stroke="#FFF"
                  strokeWidth="1.66667"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M11.6667 1.66699V5.00033C11.6667 5.44235 11.8423 5.86628 12.1549 6.17884C12.4675 6.4914 12.8914 6.66699 13.3334 6.66699H16.6667"
                  stroke="#FFF"
                  strokeWidth="1.66667"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M8.33341 7.5H6.66675"
                  stroke="#FFF"
                  strokeWidth="1.66667"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M13.3334 10.833H6.66675"
                  stroke="#FFF"
                  strokeWidth="1.66667"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              QR
            </h3>
            <div className="flex flex-row items-center gap-6 self-stretch w-full overflow-hidden">
              <div className="flex-shrink-0 bg-white p-2 rounded-lg inline-flex items-center justify-center">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(typeof window !== 'undefined' ? `${window.location.origin}/catalog/${animal.animal_id}` : '')}`}
                  alt="QR Code"
                  className="w-24 h-24 sm:w-32 sm:h-32 object-contain"
                />
              </div>
              <p className="flex-1 min-w-0 break-words leading-relaxed text-xs sm:text-sm text-gray-700">
                {animal.other_information || "No additional information provided."}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 pb-6">
          <button
            onClick={() => router.push("/admin/profiles")}
            className="flex-1 py-3 rounded-xl text-white transition-all"
            style={{
              backgroundColor: themeColor,
              fontFamily: '"Genty Sans", sans-serif',
            }}
          >
            ← Back
          </button>

          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="flex-1 py-3 rounded-xl transition-all font-bold text-sm"
            style={{
              backgroundColor: "#E6E6E6",
              color: "#8D52A7",
              fontFamily: '"Genty Sans", sans-serif',
            }}
          >
            Delete
          </button>

          <button
            onClick={() => router.push(`/admin/profiles/animal/${animal.animal_id}/edit`)}
            className="flex-1 py-3 rounded-xl text-white transition-all font-bold text-sm"
            style={{
              backgroundColor: "#8D52A7",
              fontFamily: '"Genty Sans", sans-serif',
            }}
          >
            Edit
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-transparent bg-opacity-90 flex items-center justify-center z-50 p-4">
          <div
            className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6"
            style={{ fontFamily: '"Genty Sans", sans-serif' }}
          >
            <h3 className="text-lg mb-2" style={{ color: "#3C3333" }}>
              Delete Animal Profile
            </h3>
            <p className="text-sm mb-6" style={{ color: "#3C3333" }}>
              Are you sure you want to delete{" "}
              <strong>{animal.animal_name}</strong>? This action cannot be
              undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="px-6 py-2 rounded-lg text-sm transition-all disabled:opacity-50"
                style={{ backgroundColor: "#E6E6E6", color: "#3C3333" }}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-6 py-2 rounded-lg text-white text-sm font-semibold hover:opacity-90 transition-all disabled:opacity-50"
                style={{ backgroundColor: "#DC2626" }}
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

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
