"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, BadgeCheck } from "lucide-react";
import AnimalDetailModal from "@/components/AnimalDetailModal";
import { supabase } from "@/utils/supabase/client";
import type { ScoredAnimal } from "@/types/pawfect-match";

type PawfectMatchResultsProps = {
  results: ScoredAnimal[];
};

function scoreTone(score: number) {
  if (score > 75) return "green";
  if (score >= 50) return "amber";
  return "rose";
}

function scoreClasses(score: number) {
  switch (scoreTone(score)) {
    case "green":
      return {
        track: "bg-emerald-100",
        fill: "bg-emerald-500",
        badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
      };
    case "amber":
      return {
        track: "bg-amber-100",
        fill: "bg-amber-500",
        badge: "bg-amber-50 text-amber-700 border-amber-200",
      };
    default:
      return {
        track: "bg-rose-100",
        fill: "bg-rose-500",
        badge: "bg-rose-50 text-rose-700 border-rose-200",
      };
  }
}

export default function PawfectMatchResults({ results }: PawfectMatchResultsProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<ScoredAnimal | null>(null);
  const [detailed, setDetailed] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<"details" | "match" | "adopt">("details");

  const activeClasses = useMemo(() => scoreClasses(selected?.score ?? 0), [selected]);

  if (!results.length) return null;

  return (
    <div className="mt-2 grid gap-4">
      {results.map((animal) => {
        const classes = scoreClasses(animal.score);

        return (
          <button
            key={animal.animal_id}
            type="button"
            onClick={async () => {
              setSelected(animal);
              setActiveTab("details");
              setDetailed(null);
              try {
                const { data, error } = await supabase.from("animal").select("*").eq("animal_id", animal.animal_id).single();
                if (error) {
                  console.warn("Error fetching animal details:", error);
                } else if (data) {
                  setDetailed({ ...data, score: animal.score, explanation: animal.explanation });
                }
              } catch (e) {
                console.warn("Failed to fetch animal details", e);
              }
            }}
            className="group overflow-hidden rounded-2xl border border-white/70 bg-white text-left shadow-[0_10px_30px_rgba(141,82,167,0.12)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_36px_rgba(141,82,167,0.18)]"
          >
            <div className="grid gap-0 md:grid-cols-[160px_1fr]">
              <div className="relative h-48 min-h-[180px] bg-purple-50 md:h-full">
                {animal.animal_photo ? (
                  <Image
                    src={animal.animal_photo}
                    alt={animal.animal_name || "Animal"}
                    fill
                    className="object-cover transition duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center bg-linear-to-br from-purple-100 to-amber-100 text-sm font-medium text-slate-500">
                    No photo available
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-4 p-5 md:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-purple-500">
                      Pawfect Match
                    </p>
                    <h3 className="mt-1 text-xl font-bold text-slate-900">
                      {animal.animal_name || "Unnamed animal"}
                    </h3>
                    <p className="mt-1 text-sm text-slate-600">
                      {[animal.animal_breed, animal.animal_species]
                        .filter(Boolean)
                        .join(" • ") || "Breed and species unavailable"}
                    </p>
                  </div>

                  <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-semibold ${classes.badge}`}>
                    <BadgeCheck className="h-4 w-4" />
                    {animal.score}% match
                  </div>
                </div>

                <div>
                  <div className={`h-2 w-full overflow-hidden rounded-full ${classes.track}`}>
                    <div
                      className={`h-full rounded-full ${classes.fill}`}
                      style={{ width: `${Math.max(0, Math.min(100, animal.score))}%` }}
                    />
                  </div>
                </div>

                <p className="text-sm leading-6 text-slate-700">
                  {animal.explanation}
                </p>

                <div className="flex items-center gap-2 text-sm font-semibold text-purple-600 transition group-hover:text-purple-700">
                  <span>View full profile</span>
                  <ArrowRight className="h-4 w-4" />
                </div>
              </div>
            </div>
          </button>
        );
      })}

      {selected ? (
        <AnimalDetailModal animal={detailed ?? selected} onClose={() => { setSelected(null); setDetailed(null); }} />
      ) : null}
    </div>
  );
}
