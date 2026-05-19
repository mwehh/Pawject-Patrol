"use client";

import React, { useMemo, useState } from "react";
import { X, Sparkles, Search, Loader2 } from "lucide-react";
import { supabase } from "@/utils/supabase/client";
import type {
  AnimalRecord,
  BreedTraitMap,
  LifestyleData,
  ScoredAnimal,
} from "@/types/pawfect-match";
import PawfectMatchResults from "@/components/PawfectMatchResults";

type PawfectMatchModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function PawfectMatchModal({ isOpen, onClose }: PawfectMatchModalProps) {
  const [userInput, setUserInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lifestyle, setLifestyle] = useState<LifestyleData | null>(null);
  const [results, setResults] = useState<ScoredAnimal[]>([]);

  const exampleChips = useMemo(() => ["small cat", "calm dog", "playful", "family pet"], []);

  function normalizeBreedSearch(value: string | null | undefined) {
    return (value ?? "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  async function fetchBreedTraits(animals: AnimalRecord[], lifestyleData: LifestyleData) {
    const groupedBreeds = animals.reduce(
      (accumulator, animal) => {
        const breed = animal.animal_breed?.trim();
        if (!breed) return accumulator;

        const normalizedBreed = breed.toLowerCase();
        const species = (animal.animal_species ?? "").toLowerCase();

        if (species === "dog") {
          accumulator.dog.add(normalizedBreed);
        } else if (species === "cat") {
          accumulator.cat.add(normalizedBreed);
        } else {
          accumulator.any.add(normalizedBreed);
        }

        return accumulator;
      },
      {
        dog: new Set<string>(),
        cat: new Set<string>(),
        any: new Set<string>(),
      },
    );

    const breedTraitMap: BreedTraitMap = {};

    const fetchMap = async (breeds: string[], petType: "dog" | "cat" | "any") => {
      if (!breeds.length) return;

      const response = await fetch("/api/adoption/fetch-breed-data", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ breeds, pet_type: petType }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch breed traits");
      }

      const map = (await response.json()) as BreedTraitMap;
      Object.assign(breedTraitMap, map);
    };

    if (lifestyleData.pet_type === "dog") {
      await fetchMap(Array.from(groupedBreeds.dog), "dog");
    } else if (lifestyleData.pet_type === "cat") {
      await fetchMap(Array.from(groupedBreeds.cat), "cat");
    } else {
      await Promise.all([
        fetchMap(Array.from(groupedBreeds.dog), "dog"),
        fetchMap(Array.from(groupedBreeds.cat), "cat"),
        fetchMap(Array.from(groupedBreeds.any), "any"),
      ]);
    }

    return breedTraitMap;
  }

  async function handleFindMatches(inputOverride?: string) {
    const prompt = (inputOverride ?? userInput).trim();
    if (!prompt || isLoading) return;

    setIsLoading(true);
    setError(null);
    setResults([]);

    try {
      const intentResponse = await fetch("/api/adoption/parse-intent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userInput: prompt }),
      });

      if (!intentResponse.ok) {
        throw new Error("Failed to parse adopter intent");
      }

      const parsedLifestyle = (await intentResponse.json()) as LifestyleData;
      setLifestyle(parsedLifestyle);

      const preferredBreedSearch = normalizeBreedSearch(parsedLifestyle.preferred_breed);

      const baseQuery = supabase
        .from("animal")
        .select(
          `
          animal_id,
          animal_name,
          animal_species,
          animal_breed,
          animal_description,
          animal_status,
          animal_photo,
          animal_gender,
          health_issues,
          vaccination_status
        `,
        )
        .eq("animal_status", "Available for Adoption")
        .order("created_at", { ascending: false })
        .limit(100);

      const fetchAnimalRows = async () => {
        const collected = new Map<string, AnimalRecord>();

        if (preferredBreedSearch) {
          const breedQuery = supabase
            .from("animal")
            .select(
              `
              animal_id,
              animal_name,
              animal_species,
              animal_breed,
              animal_description,
              animal_status,
              animal_photo,
              animal_gender,
              health_issues,
              vaccination_status
            `,
            )
            .eq("animal_status", "Available for Adoption")
            .or(
              `animal_breed.ilike.%${preferredBreedSearch}%,animal_name.ilike.%${preferredBreedSearch}%,animal_description.ilike.%${preferredBreedSearch}%`,
            )
            .limit(25);

          const { data: breedAnimals, error: breedError } = await breedQuery;

          if (breedError) {
            throw new Error(breedError.message);
          }

          (breedAnimals ?? []).forEach((animal) => {
            collected.set(animal.animal_id, animal as AnimalRecord);
          });
        }

        const { data: animals, error: animalsError } = await baseQuery;

        if (animalsError) {
          throw new Error(animalsError.message);
        }

        (animals ?? []).forEach((animal) => {
          collected.set(animal.animal_id, animal as AnimalRecord);
        });

        return Array.from(collected.values());
      };

      const animalRecords = await fetchAnimalRows();

      const filteredAnimals =
        parsedLifestyle.pet_type !== "any"
          ? animalRecords.filter((animal) =>
              (animal.animal_species ?? "").toLowerCase().includes(parsedLifestyle.pet_type),
            )
          : animalRecords;

      if (!filteredAnimals.length) {
        throw new Error("No matching animals were found in the adoption database.");
      }

      const breedTraits = await fetchBreedTraits(filteredAnimals, parsedLifestyle);

      const scoreResponse = await fetch("/api/adoption/score", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          lifestyle: parsedLifestyle,
          animals: filteredAnimals,
          breedTraits,
        }),
      });

      if (!scoreResponse.ok) {
        throw new Error("Failed to score adoption matches");
      }

      const scoredAnimals = (await scoreResponse.json()) as ScoredAnimal[];
      setResults(scoredAnimals);
    } catch (fetchError) {
      console.error(fetchError);
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : "Something went wrong while finding matches.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[95vh] w-full max-w-2xl flex-col gap-4 overflow-y-auto rounded-2xl border border-white/70 bg-white px-6 py-6 shadow-[0_20px_60px_rgba(91,45,126,0.22)]"
        onClick={(e) => e.stopPropagation()}
        style={{ fontFamily: '"Genty Sans", sans-serif' }}
      >
        <div className="flex w-full items-start justify-between gap-4">
          <div className="flex items-center gap-3 text-gray-800">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-purple-100 text-purple-700">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold sm:text-2xl">Find Your Pawfect Match</h2>
              <p className="text-sm text-gray-500">
                Share your lifestyle and we&apos;ll rank the best companions.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-gray-500 transition hover:bg-gray-100 hover:text-gray-800"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="rounded-2xl bg-linear-to-br from-purple-50 via-white to-amber-50 p-5">
          <div className="flex flex-col gap-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">What kind of companion are you looking for?</h3>
              <p className="text-sm text-gray-500">
                Describe your home, schedule, and personality preferences.
              </p>
            </div>

            <textarea
              value={userInput}
              onChange={(event) => setUserInput(event.target.value)}
              className="min-h-36 w-full resize-none rounded-2xl border border-gray-200 bg-white p-4 text-gray-700 shadow-sm outline-none transition focus:border-[#8D52A7] focus:ring-2 focus:ring-[#8D52A7]/15"
              placeholder="I want a calm dog, I live in an apartment, I work 8 hours a day, I have no prior pet experience..."
            />

            <div className="flex flex-wrap gap-2">
              <span className="self-center text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
                Examples
              </span>
              {exampleChips.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => setUserInput(chip)}
                  className="rounded-full border border-[#8D52A7]/30 bg-white px-3 py-1.5 text-xs font-semibold text-[#8D52A7] transition hover:bg-[#8D52A7]/10"
                >
                  {chip}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => handleFindMatches()}
              disabled={isLoading}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#8D52A7] px-5 py-3 font-semibold text-white shadow-[0_12px_28px_rgba(141,82,167,0.25)] transition hover:bg-[#7F4A96] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Finding the Pawfect Match...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4" />
                  Find Matches
                </>
              )}
            </button>
          </div>
        </div>

        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        {lifestyle && !results.length ? (
          <div className="rounded-2xl border border-purple-100 bg-purple-50/70 px-4 py-3 text-sm text-purple-800">
            Latest lifestyle profile captured. We&apos;ll compare it against animals currently listed for adoption.
          </div>
        ) : null}

        {results.length ? <PawfectMatchResults results={results} /> : null}
      </div>
    </div>
  );
}
