"use client";

import React, { useState } from "react";
import type { ScoredAnimal } from "@/types/pawfect-match";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { MapPin, PawPrint, Unlink2, X } from "lucide-react";
import { FaMars, FaVenus } from "react-icons/fa";

// Animal type definition (local copy for the component)
interface Animal {
  animal_id: string;
  animal_name?: string | null;
  animal_species?: string | null;
  animal_breed?: string | null;
  animal_age?: string | null;
  animal_gender?: string | null;
  animal_description?: string | null;
  animal_status?: string | null;
  animal_photo?: string | null;
  animal_affiliation?: string | null;
  animal_collar?: string | null;
  animal_theme?: string | null;
  created_at?: string | null;
  vaccination_status?: string | null;
  health_issues?: string | null;
}

const panelColors = ["#689668", "#DCB57E", "#5E9BBA", "#C575AD", "#8D52A7"];
const hoverColors: Record<string, string> = {
  "#689668": "#5E875E",
  "#DCB57E": "#C6A371",
  "#5E9BBA": "#558CA7",
  "#C575AD": "#B1699C",
  "#8D52A7": "#7F4A96",
};

function getThemeColor(theme: string | null): string {
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

export default function AnimalDetailModal({
  animal,
  onClose,
}: {
  animal: ScoredAnimal | Animal | null;
  onClose: () => void;
}) {
  const router = useRouter();
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
            className="absolute top-4 left-4 flex justify-center items-center rounded-full border border-white/60 backdrop-blur-md z-50 transition-all duration-200 hover:bg-white/20 hover:scale-105"
            style={{ width: "36px", height: "36px", background: "transparent" }}
          >
            <X className="w-5 h-5 text-white" />
          </button>

          {animal.animal_photo ? (
            <Image src={animal.animal_photo} alt={animal.animal_name || "Animal"} fill className="object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-400">No photo</div>
          )}

          <div
            className="absolute top-4 right-4 flex items-center justify-center rounded-full border border-white/60 backdrop-blur-md px-4 py-1 z-50 text-white"
            style={{ backgroundColor: "rgba(0,0,0,0.15)", fontFamily: '"Genty Sans", sans-serif', fontSize: 14, fontWeight: 600 }}
          >
            {animal.animal_status || "Ready for Adoption"}
          </div>

          <div className="absolute bottom-4 left-4 text-white drop-shadow-lg">
            <h2 className="text-3xl font-extrabold" style={{ fontFamily: '"Genty Sans", sans-serif' }}>{animal.animal_name || "Unnamed"}</h2>
            <p className="text-sm font-medium" style={{ fontFamily: '"Genty Sans", sans-serif' }}>{[animal.animal_breed].filter(Boolean).join(" • ") || "Unknown"}</p>
          </div>
        </div>

        <div className="p-6" style={{ fontFamily: '"Genty Sans", sans-serif', backgroundColor: color, color: "#E6E6E6" }}>
          <p className="mb-4 flex items-center gap-2"><MapPin className="w-4 h-4" /> {animal.animal_affiliation || "CSM"}</p>

          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="flex flex-col justify-between items-center flex-[1_0_0] rounded-[10px] border border-white/60 backdrop-blur-md text-center" style={{ height: 54, padding: "5px 9px", backgroundColor: "rgba(0,0,0,0.15)" }}>
              <PawPrint className="w-5 h-5 mx-auto" />
              <span className="text-xs">{animal.animal_species || "Unknown"}</span>
            </div>
            <div className="flex flex-col justify-between items-center flex-[1_0_0] rounded-[10px] border border-white/60 backdrop-blur-md text-center" style={{ height: 54, padding: "5px 9px", backgroundColor: "rgba(0,0,0,0.15)" }}>
              {animal.animal_gender === "Male" ? <FaMars className="w-5 h-5" /> : <FaVenus className="w-5 h-5" />}
              <span className="text-xs">{animal.animal_gender || "Unknown"}</span>
            </div>
            <div className="flex flex-col justify-between items-center flex-[1_0_0] rounded-[10px] border border-white/60 backdrop-blur-md text-center" style={{ height: 54, padding: "5px 9px", backgroundColor: "rgba(0,0,0,0.15)" }}>
              <Unlink2 className="w-5 h-5" />
              <span className="text-xs">{animal.animal_collar && animal.animal_collar.toLowerCase() !== "none" ? "Has Collar" : "No Collar"}</span>
            </div>
          </div>

          <div className="flex mb-4" style={{ padding: 5, justifyContent: "space-between", alignItems: "flex-start", alignSelf: "stretch", borderRadius: 6, border: "1px solid rgba(255,255,255,0.6)", background: hoverColor }}>
            <button onClick={() => setActiveTab("details")} className="flex-1 py-2 rounded font-semibold transition-all" style={{ backgroundColor: activeTab === "details" ? "#E6E6E6" : "transparent", color: activeTab === "details" ? hoverColor : "#E6E6E6" }}>Details</button>
            <button onClick={() => setActiveTab("health")} className="flex-1 py-2 rounded font-semibold transition-all" style={{ backgroundColor: activeTab === "health" ? "#E6E6E6" : "transparent", color: activeTab === "health" ? hoverColor : "#E6E6E6" }}>Health</button>
            <button onClick={() => setActiveTab("qr")} className="flex-1 py-2 rounded font-semibold transition-all" style={{ backgroundColor: activeTab === "qr" ? "#E6E6E6" : "transparent", color: activeTab === "qr" ? hoverColor : "#E6E6E6" }}>QR</button>
          </div>

          <div className="mt-4 text-sm min-h-[120px]">
            {activeTab === "details" && (
              <>
                {animal.animal_description ? (
                  <>
                    <p className="font-semibold mb-2">Physical Description:</p>
                    <p className="leading-relaxed text-justify">{animal.animal_description}</p>
                  </>
                ) : (
                  <p className="text-center py-8 opacity-70">No details available</p>
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
                  <p className="text-center py-8 opacity-70">No health information available</p>
                )}
              </div>
            )}
            {activeTab === "qr" && (
              <div className="flex flex-col sm:flex-row gap-4 items-start pb-4">
                <div className="bg-white p-2 rounded-lg shrink-0 mx-auto sm:mx-0 shadow-lg">
                  <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://pawjectpatrol.app/catalog/${animal.animal_id}`} alt="QR Code" width={100} height={100} className="rounded" style={{ backgroundColor: "white" }} />
                </div>
                <div className="flex-1 text-center sm:text-left mt-2 sm:mt-0">
                  <h3 className="text-lg font-bold mb-1 tracking-wide" style={{ fontFamily: '"Genty Sans", sans-serif' }}>Help ( {animal.animal_name} ) !</h3>
                  <p className="leading-relaxed text-xs opacity-90 drop-shadow-sm text-justify">{animal.animal_description || "He's a medium-sized, scruffy tan dog with patches of darker brown along his back and a white spot on his chest. One ear stands up while the other droops. His fur is dusty a"}</p>
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            {animal.animal_status?.toLowerCase() === "available for adoption" ? (
              <button onClick={() => router.push(`/adoption/${animal.animal_id}`)} className="rounded-full bg-[#8D52A7] px-5 py-3 font-semibold text-white transition hover:bg-[#7F4A96]">Adopt</button>
            ) : null}
            <button onClick={onClose} className="rounded-full border border-white/60 px-5 py-3 font-semibold text-white transition hover:bg-white/10">Close</button>
          </div>
        </div>
      </div>
    </div>
  );
}
