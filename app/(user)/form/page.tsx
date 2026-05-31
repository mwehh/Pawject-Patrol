"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  Menu,
  LogIn,
  X,
  Facebook,
  Instagram,
  Twitter,
  Mail,
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import UserNotificationsBell from "@/components/UserNotificationsBell";

const MapView = dynamic(() => import("@/components/MapView"), { ssr: false });
import { supabase } from "@/utils/supabase/client";

// Global storage for photo file during form navigation
let globalPhotoFile: File | null = null;

export function setGlobalPhotoFile(file: File | null) {
  globalPhotoFile = file;
}

export function getGlobalPhotoFile() {
  return globalPhotoFile;
}

// Event type aliases
type InputChange = React.ChangeEvent<HTMLInputElement>;
type TextareaChange = React.ChangeEvent<HTMLTextAreaElement>;
type SelectChange = React.ChangeEvent<HTMLSelectElement>;


interface FieldProps {
  label: string;
  placeholder?: string;
  type?: string;
  value: string;
  onChange: (e: InputChange) => void;
  required?: boolean;
  error?: string;
}


interface SelectFieldProps {
  label: string;
  options: string[];
  value: string;
  onChange: (e: SelectChange) => void;
  required?: boolean;
  error?: string;
}


interface TextAreaProps {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (e: TextareaChange) => void;
  required?: boolean;
  error?: string;
}

export default function ReportFormSample() {
  const router = useRouter();

  const [preview, setPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  const [resultMsg, setResultMsg] = useState<string | null>(null);
  const [lat, setLat] = useState<number | null>(7.0858);
  const [lng, setLng] = useState<number | null>(125.4853);

  const [submitting, setSubmitting] = useState(false);

  // Field error states
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const [reportTitle, setReportTitle] = useState("");
  const [reporterName, setReporterName] = useState("");
  const [animalType, setAnimalType] = useState("");
  const [gender, setGender] = useState("Unknown");
  const [dateSeen, setDateSeen] = useState("");
  const [physicalDescription, setPhysicalDescription] = useState("");
  const [otherInfo, setOtherInfo] = useState("");
  const [area, setArea] = useState("");
  const [landmark, setLandmark] = useState("");
  const [road, setRoad] = useState("");
  const [hasHealthIssues, setHasHealthIssues] = useState<boolean>(false);
  const [healthDetails, setHealthDetails] = useState<string>("");
  const [hasCollar, setHasCollar] = useState<boolean>(false);
  const [collarDetails, setCollarDetails] = useState<string>("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"basic" | "location" | "health">(
    "basic"
  );

  // Auth-connected sidebar state
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Handle user logout and redirect to login page
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  useEffect(() => {
    const savedData = sessionStorage.getItem("animalReportFormData");
    if (savedData) {
      try {
        const data = JSON.parse(savedData);
        setReportTitle(data.reportTitle || "");
        setReporterName(data.reporterName || "");
        setAnimalType(data.animalType || "");
        setGender(data.gender || "Unknown");
        setDateSeen(data.dateSeen || "");
        setPhysicalDescription(data.physicalDescription || "");
        setOtherInfo(data.otherInfo || "");
        setArea(data.area || "");
        setLandmark(data.landmark || "");
        setRoad(data.road || "");
        setHasHealthIssues(data.hasHealthIssues || false);
        setHealthDetails(data.healthDetails || "");
        setHasCollar(data.hasCollar || false);
        setCollarDetails(data.collarDetails || "");
        setLat(data.lat || 7.0858);
        setLng(data.lng || 125.4853);

        if (data.photoPreview) {
          setPreview(data.photoPreview);
        }

        // Restore photo file from base64 if present
        const base64 = sessionStorage.getItem('animalReportPhotoBase64');
        if (base64) {
          // Convert base64 to File object
          const arr = base64.split(",");
          if (arr.length === 2) {
            const mimeMatch = arr[0].match(/:(.*?);/);
            const mime = mimeMatch ? mimeMatch[1] : "image/jpeg";
            const bstr = atob(arr[1]);
            let n = bstr.length;
            const u8arr = new Uint8Array(n);
            while (n--) {
              u8arr[n] = bstr.charCodeAt(n);
            }
            const file = new File([u8arr], "photo.jpg", { type: mime });
            setPhotoFile(file);
          }
          sessionStorage.removeItem('animalReportPhotoBase64');
        }

        sessionStorage.removeItem("animalReportFormData");
      } catch (error) {
        console.error("Failed to restore form data:", error);
      }
    }
  }, []);

  // Fetch current user and keep sidebar info in sync
  useEffect(() => {
    const setupAuth = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);
      if (user) {
        const nameFromMeta =
          (user.user_metadata?.full_name as string) ||
          (user.user_metadata?.name as string) ||
          "";
        setUserName(nameFromMeta || user.email?.split("@")[0] || "");
        setUserEmail(user.email || "");
      } else {
        setUserName("");
        setUserEmail("");
      }
    };
    setupAuth();
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session?.user);
      if (session?.user) {
        const nameFromMeta =
          (session.user.user_metadata?.full_name as string) ||
          (session.user.user_metadata?.name as string) ||
          "";
        setUserName(nameFromMeta || session.user.email?.split("@")[0] || "");
        setUserEmail(session.user.email || "");
      } else {
        setUserName("");
        setUserEmail("");
      }
    });
    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  function grabCurrentLocation() {
    if (!navigator.geolocation) {
      setResultMsg("Geolocation unsupported.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
      },
      (err) => setResultMsg(`Location error: ${err.message}`),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }

  function handleMapClick(newLat: number, newLng: number) {
    setLat(newLat);
    setLng(newLng);
    setResultMsg(null);
  }


  async function handleConfirm() {
    const newErrors: { [key: string]: string } = {};

    // Basic Info Tab validations
    if (!reportTitle.trim()) {
      newErrors.reportTitle = "Please enter a report title.";
    }
    if (!reporterName.trim()) {
      newErrors.reporterName = "Please enter your name.";
    }
    if (!animalType.trim()) {
      newErrors.animalType = "Please enter the type of animal.";
    }
    if (!gender || gender === "Unknown") {
      newErrors.gender = "Please select a valid gender (not 'Unknown').";
    }
    if (!dateSeen || isNaN(Date.parse(dateSeen))) {
      newErrors.dateSeen = "Please enter a valid date for 'Date Seen'.";
    }
    if (!physicalDescription.trim()) {
      newErrors.physicalDescription = "Please enter a physical description.";
    }

    // Location Tab validations
    if (!area.trim()) {
      newErrors.area = "Please enter the area seen.";
    }
    if (!landmark.trim()) {
      newErrors.landmark = "Please enter a landmark near the location.";
    }
    if (!road.trim()) {
      newErrors.road = "Please enter the road or street name.";
    }
    if (lat == null || lng == null) {
      newErrors.location = "Please capture location.";
    }

    // Health Tab validations
    if (typeof hasHealthIssues !== "boolean") {
      newErrors.hasHealthIssues = "Please specify if the animal has health issues.";
    }
    if (hasHealthIssues && !healthDetails.trim()) {
      newErrors.healthDetails = "Please describe the health issues.";
    }
    if (typeof hasCollar !== "boolean") {
      newErrors.hasCollar = "Please specify if the animal has a collar.";
    }
    if (hasCollar && !collarDetails.trim()) {
      newErrors.collarDetails = "Please describe the collar.";
    }

    setErrors(newErrors);

    // Focus the first tab with an error
    if (Object.keys(newErrors).length > 0) {
      if (
        newErrors.reportTitle ||
        newErrors.reporterName ||
        newErrors.animalType ||
        newErrors.gender ||
        newErrors.dateSeen ||
        newErrors.physicalDescription
      ) {
        setActiveTab("basic");
      } else if (
        newErrors.area ||
        newErrors.landmark ||
        newErrors.road ||
        newErrors.location
      ) {
        setActiveTab("location");
      } else {
        setActiveTab("health");
      }
      return;
    }

    const formData: any = {
      reportTitle,
      reporterName,
      animalType,
      gender,
      dateSeen,
      physicalDescription,
      otherInfo,
      area,
      landmark,
      road,
      hasHealthIssues,
      healthDetails,
      hasCollar,
      collarDetails,
      lat,
      lng,
      photoPreview: preview,
    };

    sessionStorage.setItem("animalReportFormData", JSON.stringify(formData));

    // Store photo file globally for access on confirm page
    setGlobalPhotoFile(photoFile);

    const params = new URLSearchParams({
      reportTitle: reportTitle || "",
      reporterName: reporterName || "",
      animalType: animalType || "",
      gender: gender || "Unknown",
      dateSeen: dateSeen || "",
      physicalDescription: physicalDescription || "",
      area: area || "",
      landmark: landmark || "",
      road: road || "",
      healthIssues: hasHealthIssues ? healthDetails || "Yes" : "None",
      animalCollar: hasCollar ? collarDetails || "Has collar" : "None",
      otherInfo: otherInfo || "None",
      lat: (lat ?? 0).toString(),
      lng: (lng ?? 0).toString(),
      photoUrl: preview || "",
    });

    router.push(`/form/confirm?${params.toString()}`);
  }

  return (
    <main className="min-h-screen bg-[#E6E6E6]">
      {/* Sidebar */}
      <Sidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        userName={userName}
        userEmail={userEmail ?? undefined}
        router={router}
        variant="user"
      />
      <header className="flex items-center justify-between px-4 w-full h-[52px] bg-[#E6E6E6] mx-auto z-10">
        <div className="w-full max-w-[1200px] mx-auto flex items-center justify-between">
          <button
            className="p-2 hover:bg-gray-100 rounded-lg transition"
            onClick={() => setSidebarOpen(true)}
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
            Report Animal Form
          </h1>

          <p
            className="text-xs sm:text-sm md:text-md"
            style={{ color: "#3C3333", fontFamily: '"Genty Sans", sans-serif' }}
          >
            Fill up the details in the form to catalog another animal
          </p>
        </div>

        {/* Form Container */}
        <div
          className="rounded-xl bg-[#E1E69D] border-radius-[26px] border-1 border-[#3C3333] p-6"
          style={{
            display: "flex",
            minWidth: "327px",
            padding: "20px",
            flexDirection: "column",
            gap: "15px",
            alignSelf: "stretch",
          }}
        >
          {/* Tab Navigation */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setActiveTab("basic")}
              className={`flex-1 py-3 px-4 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
                activeTab === "basic"
                  ? "bg-[#8D52A7] text-white"
                  : "bg-[#C2C876] text-[#3C3333] hover:bg-[#b5bb6a]"
              }`}
            >
              <span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <path
                    d="M19 21V19C19 17.9391 18.5786 16.9217 17.8284 16.1716C17.0783 15.4214 16.0609 15 15 15H9C7.93913 15 6.92172 15.4214 6.17157 16.1716C5.42143 16.9217 5 17.9391 5 19V21"
                    stroke={activeTab === "basic" ? "#FFFFFF" : "#3C3333"}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M12 11C14.2091 11 16 9.20914 16 7C16 4.79086 14.2091 3 12 3C9.79086 3 8 4.79086 8 7C8 9.20914 9.79086 11 12 11Z"
                    stroke={activeTab === "basic" ? "#FFFFFF" : "#3C3333"}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <span className="hidden md:inline">Basic Info</span>
            </button>

            <button
              onClick={() => setActiveTab("location")}
              className={`flex-1 py-3 px-4 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
                activeTab === "location"
                  ? "bg-[#8D52A7] text-white"
                  : "bg-[#C2C876] text-[#3C3333] hover:bg-[#b5bb6a]"
              }`}
            >
              <span>
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
              </span>
              <span className="hidden md:inline">Location</span>
            </button>

            <button
              onClick={() => setActiveTab("health")}
              className={`flex-1 py-3 px-4 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
                activeTab === "health"
                  ? "bg-[#8D52A7] text-white"
                  : "bg-[#C2C876] text-[#3C3333] hover:bg-[#b5bb6a]"
              }`}
            >
              <span>
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
              </span>
              <span className="hidden md:inline">Health & Details</span>
            </button>
          </div>

          {/* Tab Content */}
          <div className="space-y-4">
            {/* Basic Info Tab  */}
            {activeTab === "basic" && (
              <div className="space-y-4">
                <Field
                  label="Report Title"
                  placeholder="Brief title for this report"
                  value={reportTitle}
                  onChange={(e: InputChange) => {
                    setReportTitle(e.target.value);
                    if (errors.reportTitle && e.target.value.trim()) {
                      setErrors((prev) => {
                        const { reportTitle, ...rest } = prev;
                        return rest;
                      });
                    }
                  }}
                  required
                  error={errors.reportTitle}
                />
                <Field
                  label="Reporter Name"
                  placeholder="Your name"
                  value={reporterName}
                  onChange={(e: InputChange) => {
                    setReporterName(e.target.value);
                    if (errors.reporterName && e.target.value.trim()) {
                      setErrors((prev) => {
                        const { reporterName, ...rest } = prev;
                        return rest;
                      });
                    }
                  }}
                  required
                  error={errors.reporterName}
                />
                <Field
                  label="Type of animal"
                  placeholder="Dog, Cat, etc."
                  value={animalType}
                  onChange={(e: InputChange) => {
                    setAnimalType(e.target.value);
                    if (errors.animalType && e.target.value.trim()) {
                      setErrors((prev) => {
                        const { animalType, ...rest } = prev;
                        return rest;
                      });
                    }
                  }}
                  required
                  error={errors.animalType}
                />
                <div className="grid grid-cols-2 gap-3">
                  <SelectField
                    label="Gender"
                    options={["Unknown", "Male", "Female"]}
                    value={gender}
                    onChange={(e: SelectChange) => {
                      setGender(e.target.value);
                      if (errors.gender && e.target.value !== "Unknown") {
                        setErrors((prev) => {
                          const { gender, ...rest } = prev;
                          return rest;
                        });
                      }
                    }}
                    required
                    error={errors.gender}
                  />
                  <Field
                    label="Date Seen"
                    type="date"
                    value={dateSeen}
                    onChange={(e: InputChange) => {
                      setDateSeen(e.target.value);
                      if (errors.dateSeen && e.target.value && !isNaN(Date.parse(e.target.value))) {
                        setErrors((prev) => {
                          const { dateSeen, ...rest } = prev;
                          return rest;
                        });
                      }
                    }}
                    required
                    error={errors.dateSeen}
                  />
                </div>

                <TextArea
                  label="Physical Description"
                  placeholder="Color, size, markings, etc."
                  value={physicalDescription}
                  onChange={(e: TextareaChange) => {
                    setPhysicalDescription(e.target.value);
                    if (errors.physicalDescription && e.target.value.trim()) {
                      setErrors((prev) => {
                        const { physicalDescription, ...rest } = prev;
                        return rest;
                      });
                    }
                  }}
                  required
                  error={errors.physicalDescription}
                />
                <div className="rounded-xl bg-[#E6E6E6] p-4 flex flex-col items-center justify-center">
                  <div
                    className="w-full h-[280px] rounded-lg bg-white flex items-center justify-center overflow-hidden cursor-pointer border-2 border-[#3C3333]"
                    onClick={() =>
                      document.getElementById("photo-input")?.click()
                    }
                  >
                    {preview ? (
                      <img
                        src={preview}
                        alt="Animal photo"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex flex-col items-center text-gray-600 text-sm gap-2">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="48"
                          height="48"
                          viewBox="0 0 48 48"
                          fill="none"
                        >
                          <path
                            d="M29 8H19L14 14H8C6.93913 14 5.92172 14.4214 5.17157 15.1716C4.42143 15.9217 4 16.9391 4 18V36C4 37.0609 4.42143 38.0783 5.17157 38.8284C5.92172 39.5786 6.93913 40 8 40H40C41.0609 40 42.0783 39.5786 42.8284 38.8284C43.5786 38.0783 44 37.0609 44 36V18C44 16.9391 43.5786 15.9217 42.8284 15.1716C42.0783 14.4214 41.0609 14 40 14H34L29 8Z"
                            stroke="#3C3333"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M24 32C27.3137 32 30 29.3137 30 26C30 22.6863 27.3137 20 24 20C20.6863 20 18 22.6863 18 26C18 29.3137 20.6863 32 24 32Z"
                            stroke="#3C3333"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        <span
                          style={{
                            color: "#3C3333",
                            fontFamily: '"Genty Sans", sans-serif',
                            fontSize: "16px",
                            fontWeight: 500,
                          }}
                        >
                          Picture
                        </span>
                      </div>
                    )}
                  </div>
                  <input
                    id="photo-input"
                    type="file"
                    accept=".jpg,.jpeg,.png,.svg"
                    className="hidden"
                    onChange={(e: InputChange) => {
                      const file = e.target.files?.[0];
                      if (!file) {
                        setPreview(null);
                        setPhotoFile(null);
                        return;
                      }
                      const url = URL.createObjectURL(file);
                      setPreview(url);
                      setPhotoFile(file);
                    }}
                  />
                  <p className="mt-3 text-xs text-[#000]">
                    Tap to upload (optional)
                  </p>
                </div>
              </div>
            )}

            {/* Location Tab - Details */}
            {activeTab === "location" && (
              <div className="space-y-4">
                <div className="space-y-3">
                  <div className="grid grid-cols-1 gap-3">
                    <Field
                      label="Area Seen"
                      placeholder="General area"
                      value={area}
                      onChange={(e: InputChange) => {
                        setArea(e.target.value);
                        if (errors.area && e.target.value.trim()) {
                          setErrors((prev) => {
                            const { area, ...rest } = prev;
                            return rest;
                          });
                        }
                      }}
                      required
                      error={errors.area}
                    />
                    <Field
                      label="Landmark Near Location"
                      placeholder="Known landmark"
                      value={landmark}
                      onChange={(e: InputChange) => {
                        setLandmark(e.target.value);
                        if (errors.landmark && e.target.value.trim()) {
                          setErrors((prev) => {
                            const { landmark, ...rest } = prev;
                            return rest;
                          });
                        }
                      }}
                      required
                      error={errors.landmark}
                    />
                    <Field
                      label="What Road?"
                      placeholder="Street / road name"
                      value={road}
                      onChange={(e: InputChange) => {
                        setRoad(e.target.value);
                        if (errors.road && e.target.value.trim()) {
                          setErrors((prev) => {
                            const { road, ...rest } = prev;
                            return rest;
                          });
                        }
                      }}
                      required
                      error={errors.road}
                    />
                  </div>
                </div>

                {/* Map */}
                <div className="rounded-xl bg-[#E6E6E6] p-4 mt-2">
                  {errors.location && <p className="text-xs text-red-600 mb-2">{errors.location}</p>}
                  <div className="rounded-lg h-64 bg-[#E1E69D] overflow-hidden relative z-0">
                    <div className="absolute inset-0 z-10">
                      <MapView
                        latitude={lat!}
                        longitude={lng!}
                        onLocationSelect={handleMapClick}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={grabCurrentLocation}
                      className="absolute bottom-14 right-3 px-3 py-1.5 rounded-md bg-[#8D52A7] text-white text-xs hover:bg-[#7B4692] shadow z-50"
                    >
                      Use My Location
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setLat(7.0858);
                        setLng(125.4853);
                      }}
                      className="absolute bottom-3 right-3 px-3 py-1.5 rounded-md bg-[#8D52A7] text-white text-xs hover:bg-[#7B4692] shadow z-50"
                    >
                      Return to UP Oblation
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Health & Details Tab */}
            {activeTab === "health" && (
              <div className="space-y-4">
                {/* Health Issues */}
                <div className="rounded-xl bg-[#E1E69D] p-4">
                  {errors.hasHealthIssues && <p className="text-xs text-red-600 mb-2">{errors.hasHealthIssues}</p>}
                  <label
                    className="block mb-2"
                    style={{
                      color: "#3C3333",
                      fontFamily: '"Genty Sans", sans-serif',
                      fontSize: "14px",
                      fontWeight: 500,
                    }}
                  >
                    Health Issues? <span style={{ color: 'red' }}>*</span>
                  </label>
                  <div className="flex flex-wrap items-center gap-4 text-sm mb-2">
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="radio"
                        name="health"
                        className="accent-[#8D52A7] outline-none"
                        checked={!hasHealthIssues}
                        onChange={() => setHasHealthIssues(false)}
                        required={!hasHealthIssues}
                      />
                      <span>No</span>
                    </label>
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="radio"
                        name="health"
                        className="accent-[#8D52A7] outline-none"
                        checked={hasHealthIssues}
                        onChange={() => setHasHealthIssues(true)}
                        required={hasHealthIssues}
                      />
                      <span>Yes</span>
                      {hasHealthIssues && (
                        <input
                          className="ml-4 w-[340px] max-w-full rounded-lg px-2 py-1 text-sm text-[#3C3333] outline-none focus:ring-2 focus:ring-[#8D52A7]"
                          style={{ backgroundColor: "#C2C876" }}
                          placeholder="Describe the health issues (e.g. injured, sick)"
                          value={healthDetails}
                          onChange={(e: InputChange) => {
                            setHealthDetails(e.target.value);
                            if (errors.healthDetails && e.target.value.trim()) {
                              setErrors((prev) => {
                                const { healthDetails, ...rest } = prev;
                                return rest;
                              });
                            }
                          }}
                          required
                        />
                      )}
                    </label>
                  </div>
                  {hasHealthIssues && errors.healthDetails && <p className="text-xs text-red-600 mt-1">{errors.healthDetails}</p>}
                </div>

                {/* Collar */}
                <div className="rounded-xl bg-[#E1E69D] p-4">
                  {errors.hasCollar && <p className="text-xs text-red-600 mb-2">{errors.hasCollar}</p>}
                  <label
                    className="block mb-2"
                    style={{
                      color: "#3C3333",
                      fontFamily: '"Genty Sans", sans-serif',
                      fontSize: "14px",
                      fontWeight: 500,
                    }}
                  >
                    Has Collar? <span style={{ color: 'red' }}>*</span>
                  </label>
                  <div className="flex flex-wrap items-center gap-4 text-sm mb-2">
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="radio"
                        name="collar"
                        className="accent-[#8D52A7] outline-none"
                        checked={!hasCollar}
                        onChange={() => setHasCollar(false)}
                        required={!hasCollar}
                      />
                      <span>No</span>
                    </label>
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="radio"
                        name="collar"
                        className="accent-[#8D52A7] outline-none"
                        checked={hasCollar}
                        onChange={() => setHasCollar(true)}
                        required={hasCollar}
                      />
                      <span>Yes</span>
                      {hasCollar && (
                        <input
                          className="ml-4 w-[340px] max-w-full rounded-lg px-2 py-1 text-sm text-[#3C3333] outline-none focus:ring-2 focus:ring-[#8D52A7]"
                          style={{ backgroundColor: "#C2C876" }}
                          placeholder="Describe the collar (e.g. color, tags)"
                          value={collarDetails}
                          onChange={(e: InputChange) => {
                            setCollarDetails(e.target.value);
                            if (errors.collarDetails && e.target.value.trim()) {
                              setErrors((prev) => {
                                const { collarDetails, ...rest } = prev;
                                return rest;
                              });
                            }
                          }}
                          required
                        />
                      )}
                    </label>
                  </div>
                  {hasCollar && errors.collarDetails && <p className="text-xs text-red-600 mt-1">{errors.collarDetails}</p>}
                </div>

                <TextArea
                  label="Any Other Information"
                  placeholder="Any additional details..."
                  value={otherInfo}
                  onChange={(e: TextareaChange) => setOtherInfo(e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="flex gap-3 mt-6">
            {activeTab !== "basic" && (
              <button
                onClick={() => {
                  if (activeTab === "location") setActiveTab("basic");
                  if (activeTab === "health") setActiveTab("location");
                }}
                type="button"
                className="flex-1 rounded-lg bg-[#E6E6E6] py-3 text-sm font-semibold text-[#3C3333] hover:bg-gray-300 transition"
              >
                Previous
              </button>
            )}
            <button
              onClick={
                activeTab === "health"
                  ? handleConfirm
                  : () =>
                      setActiveTab(
                        activeTab === "basic" ? "location" : "health"
                      )
              }
              type="button"
              className="flex-1 rounded-lg bg-[#8D52A7] py-3 text-sm font-semibold text-white hover:bg-[#7B4692] transition"
            >
              {activeTab === "health" ? "Confirm" : "Next"}
            </button>
          </div>
          {/* No more global resultMsg, errors are shown per field */}
        </div>
      </section>
    </main>
  );
}

function Field({ label, placeholder, type = "text", value, onChange, required = false, error }: FieldProps) {
  return (
    <div className="rounded-xl bg-[#E1E69D] p-4">
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
        className={`w-full rounded-lg px-3 py-2 text-sm text-[#3C3333] placeholder:rgba(60,51,51,0.6) focus:outline-none focus:ring-2 focus:ring-[#3C3333] ${error ? 'border border-red-500' : ''}`}
        style={{ backgroundColor: "#C2C876" }}
      />
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}

function SelectField({ label, options, value, onChange, required = false, error }: SelectFieldProps) {
  return (
    <div className="rounded-xl bg-[#E1E69D] p-4">
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
      <select
        value={value}
        onChange={onChange}
        required={required}
        className={`w-full rounded-lg px-3 py-2 text-sm text-[#3C3333] focus:outline-none focus:ring-2 focus:ring-[#3C3333] ${error ? 'border border-red-500' : ''}`}
        style={{ backgroundColor: "#C2C876" }}
      >
        {options.map((o: string) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}

function TextArea({ label, placeholder, value, onChange, required = false, error }: TextAreaProps) {
  return (
    <div className="rounded-xl bg-[#E1E69D] p-4">
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
        className={`w-full rounded-lg px-3 py-2 text-sm text-[#3C3333] placeholder:rgba(60,51,51,0.6) focus:outline-none focus:ring-2 focus:ring-[#3C3333] ${error ? 'border border-red-500' : ''}`}
        style={{ backgroundColor: "#C2C876" }}
      />
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}