import { NextResponse } from "next/server";
import type { BreedTraitMap, BreedTraits } from "@/types/pawfect-match";

export const runtime = "nodejs";

type BreedApiResponse = {
	energy_level?: number;
	energy?: number;
	adaptability?: number;
	grooming_needs?: number;
	grooming?: number;
	social_needs?: number;
	stranger_friendly?: number;
	child_friendly?: number;
};

function normalizeKey(breed: string) {
	return breed.trim().toLowerCase();
}

function clamp(value: number) {
	return Math.min(10, Math.max(1, value));
}

function neutralTraits(): BreedTraits {
	return {
		energy_level: 5,
		adaptability: 5,
		grooming_needs: 5,
		social_needs: 5,
		stranger_friendly: 5,
		child_friendly: 5,
	};
}

function toTraits(item?: BreedApiResponse | null): BreedTraits {
	if (!item) return neutralTraits();

	const energy = item.energy_level ?? item.energy ?? 3;
	const grooming = item.grooming_needs ?? item.grooming ?? 3;

	return {
		energy_level: clamp(energy * 2),
		adaptability: clamp((item.adaptability ?? 3) * 2),
		grooming_needs: clamp(grooming * 2),
		social_needs: clamp((item.social_needs ?? 3) * 2),
		stranger_friendly: clamp((item.stranger_friendly ?? 3) * 2),
		child_friendly: clamp((item.child_friendly ?? 3) * 2),
	};
}

async function fetchBreedFromApi(
	baseUrl: string,
	apiKey: string | undefined,
	breed: string,
): Promise<BreedTraits | null> {
	if (!apiKey) return null;

	const response = await fetch(`${baseUrl}?q=${encodeURIComponent(breed)}`, {
		headers: {
			"x-api-key": apiKey,
		},
		cache: "no-store",
	});

	if (!response.ok) return null;

	const data = (await response.json()) as BreedApiResponse[];
	return toTraits(data[0]);
}

export async function POST(request: Request) {
	try {
		const body = (await request.json()) as {
			breeds?: string[];
			pet_type?: "dog" | "cat" | "any";
		};

		const breeds = Array.from(new Set((body.breeds ?? []).map((breed) => breed.trim()).filter(Boolean)));
		const petType = body.pet_type ?? "any";
		const traitMap: BreedTraitMap = {};

		await Promise.all(
			breeds.map(async (breed) => {
				let traits: BreedTraits | null = null;

				if (petType === "dog") {
					traits = await fetchBreedFromApi("https://api.thedogapi.com/v1/breeds/search", process.env.THE_DOG_API_KEY, breed);
				} else if (petType === "cat") {
					traits = await fetchBreedFromApi("https://api.thecatapi.com/v1/breeds/search", process.env.THE_CAT_API_KEY, breed);
				} else {
					traits =
						(await fetchBreedFromApi("https://api.thedogapi.com/v1/breeds/search", process.env.THE_DOG_API_KEY, breed)) ??
						(await fetchBreedFromApi("https://api.thecatapi.com/v1/breeds/search", process.env.THE_CAT_API_KEY, breed));
				}

				traitMap[normalizeKey(breed)] = traits ?? neutralTraits();
			}),
		);

		return NextResponse.json(traitMap);
	} catch (error) {
		console.error("fetch-breed-data route error", error);
		return NextResponse.json({ message: "Failed to fetch breed data" }, { status: 500 });
	}
}