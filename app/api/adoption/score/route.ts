import { NextResponse } from "next/server";
import type {
	AnimalRecord,
	BreedTraitMap,
	BreedTraits,
	LifestyleData,
	ScoredAnimal,
} from "@/types/pawfect-match";
import { generateBedrockText } from "@/lib/bedrock";

export const runtime = "nodejs";

function normalizeKey(value: string | null | undefined) {
	return (value ?? "").trim().toLowerCase();
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

function parseErrorResponse() {
	return NextResponse.json(
		{ message: "AI response could not be parsed" },
		{ status: 500 },
	);
}

function normalizeText(value: string | null | undefined) {
	return (value ?? "").trim().toLowerCase();
}

function normalizeBreed(value: string | null | undefined) {
	return normalizeText(value)
		.replace(/\b(cat|dog|pet|animal|breed)\b/g, "")
		.replace(/\s+/g, " ")
		.trim();
}

function matchesPreferredBreed(
	preferredBreed: string | null | undefined,
	animalBreed: string | null | undefined,
) {
	const preferred = normalizeBreed(preferredBreed);
	const animal = normalizeBreed(animalBreed);

	if (!preferred || !animal) return false;
	if (preferred === animal) return true;
	return preferred.includes(animal) || animal.includes(preferred);
}

function matchesPreferredColor(
	preferredColor: string | null | undefined,
	animal: AnimalRecord,
) {
	const color = normalizeText(preferredColor);
	if (!color) return false;

	const searchableText = [animal.animal_name, animal.animal_description, animal.animal_breed]
		.filter(Boolean)
		.join(" ")
		.toLowerCase();

	if (color === "white") {
		return /(\bwhite\b|\bcream\b|\nivory\b|\bsnow\w*\b|\bfrost\w*\b|\bpearl\w*\b)/i.test(searchableText);
	}

	return searchableText.includes(color);
}

function compactText(value: string | null | undefined) {
	return (value ?? "").replace(/\s+/g, " ").trim();
}

function uniqueMatchExplanation(
	animal: AnimalRecord,
	lifestyle: LifestyleData,
	isBreedMatch: boolean,
	isColorMatch: boolean,
) {
	// Create varied, human-like explanations that avoid health/vaccine mentions.
	const animalName = animal.animal_name || "This animal";
	const speciesLabel = animal.animal_species?.toLowerCase() || "pet";

	const descriptionSnippet = compactText(animal.animal_description).split(/[.!?]/)[0].trim();

	const reasons: string[] = [];
	if (isBreedMatch && animal.animal_breed) reasons.push(`an exact ${animal.animal_breed} match`);
	if (isColorMatch && lifestyle.preferred_color) reasons.push(`it matches your ${lifestyle.preferred_color} color preference`);
	if (animal.animal_species) reasons.push(`a good ${animal.animal_species.toLowerCase()} fit`);

	const breedTraits = (animal as any).breed_traits as BreedTraits | undefined;

	function traitDescriptor(value: number | undefined, kind: 'energy' | 'social' | 'adapt') {
		if (typeof value !== 'number') return '';
		if (value >= 7) {
			if (kind === 'energy') return 'high energy';
			if (kind === 'social') return 'very social';
			return 'very adaptable';
		}
		if (value >= 4) {
			if (kind === 'energy') return 'moderate energy';
			if (kind === 'social') return 'moderately social';
			return 'reasonably adaptable';
		}
		if (kind === 'energy') return 'low energy';
		if (kind === 'social') return 'prefers quieter environments';
		return 'may need more time to adjust';
	}

	const traitPhrases: string[] = [];
	if (breedTraits) {
		const e = traitDescriptor(breedTraits.energy_level, 'energy');
		const s = traitDescriptor(breedTraits.social_needs, 'social');
		const a = traitDescriptor(breedTraits.adaptability, 'adapt');
		if (s) traitPhrases.push(s);
		if (a) traitPhrases.push(a);
		if (e) traitPhrases.push(e);
	}

	const intro = `I think ${animalName} could be a wonderful match.`;
	const reasonSentence = reasons.length
		? `It ${reasons.join(' and ')}, which aligns with your preferences.`
		: `It aligns with your preferences and lifestyle.`;
	const profileSentence = descriptionSnippet
		? `${animalName} is described as ${descriptionSnippet.toLowerCase()}, which gives a feel for temperament and daily needs.`
		: `${animalName}'s listing is brief, so meeting in person will clarify fit.`;

	// Recommendation variants tailored to breed/color/traits to avoid repeating the same closing line.
	const recommendationVariants = [
		(name: string, breed?: string) => (breed ? `As an exact ${breed} match, consider prioritizing ${name} for a meet-and-greet.` : `${name} could be worth meeting to see if personalities click.`),
		(name: string) => traitPhrases.length ? `Given ${traitPhrases.join(', ')}, think about whether your routine supports these needs.` : `${name} may match well — a short visit will help confirm.`,
		(name: string) => `If you like ${reasons.join(' and ') || 'what you see'}, try arranging a brief visit to get a better sense.`,
	];

	function seededIndex(seedStr: string, max: number) {
		let h = 2166136261 >>> 0;
		for (let i = 0; i < seedStr.length; i++) {
			h ^= seedStr.charCodeAt(i);
			h = Math.imul(h, 16777619) >>> 0;
		}
		return h % max;
	}

	const seed = animal.animal_id || animalName;
	const recIndex = seededIndex(seed + 'rec', recommendationVariants.length);
	const recommendation = recommendationVariants[recIndex](animalName, animal.animal_breed || undefined);

	// Assemble two or three sentences: intro, reason+profile merged, recommendation (varied).
	const mergedReasonProfile = `${reasonSentence} ${profileSentence}`.trim();
	const sentences = [intro, mergedReasonProfile, recommendation].slice(0, 3);
	return sentences.join(' ');
}

function ensureUniqueExplanations(items: ScoredAnimal[]) {
	const seen = new Set<string>();

	return items.map((animal, index) => {
		let explanation = animal.explanation.trim();

		if (seen.has(explanation)) {
			const fallbackDetails = [animal.animal_breed, animal.animal_species, animal.animal_id.slice(0, 8)]
				.filter(Boolean)
				.join(" • ");

			explanation = `${explanation} Profile note: ${fallbackDetails || `result ${index + 1}`}.`;
		}

		while (seen.has(explanation)) {
			explanation = `${explanation} (${animal.animal_id.slice(0, 6)})`;
		}

		seen.add(explanation);

		return {
			...animal,
			explanation,
		};
	});
}

function unwrapJsonText(text: string) {
	const trimmed = text.trim();
	return trimmed
		.replace(/^```(?:json)?\s*/i, "")
		.replace(/\s*```$/i, "")
		.trim();
}

export async function POST(request: Request) {
	try {
		const body = (await request.json()) as {
			lifestyle?: LifestyleData;
			animals?: AnimalRecord[];
			breedTraits?: BreedTraitMap;
		};

		const lifestyle = body.lifestyle;
		const animals = body.animals ?? [];
		const breedTraits = body.breedTraits ?? {};

		if (!lifestyle) {
			return NextResponse.json(
				{ message: "lifestyle is required" },
				{ status: 400 },
			);
		}

		if (!animals.length) {
			return NextResponse.json([]);
		}

		const animalsWithTraits = animals.map((animal) => ({
			...animal,
			breed_traits: breedTraits[normalizeKey(animal.animal_breed)] ?? neutralTraits(),
		}));

		const rawScores = await generateBedrockText(`You are an animal adoption compatibility adviser. Return only valid JSON with no explanation or markdown.

	Score each animal's compatibility with this adopter using the provided lifestyle and breed traits.
	Adopter lifestyle profile: ${JSON.stringify(lifestyle)}
	Animals with breed traits: ${JSON.stringify(animalsWithTraits)}

	Ranking rules:
	- Exact breed matches should be ranked above other animals of the same species.
	- Exact color matches (including synonyms for white) should be promoted above non-matching animals.
	- Use lifestyle profile and breed traits to score otherwise.

	Return a JSON array sorted by score descending. Return the top 5 only.
	For each animal return: { "animal_id": string, "score": number (1-100) }`);

		if (!rawScores) {
			return parseErrorResponse();
		}

		const scores = JSON.parse(unwrapJsonText(rawScores)) as Array<{
			animal_id: string;
			score: number;
			explanation: string;
		}>;
		const preferredBreed = lifestyle.preferred_breed?.trim().toLowerCase();
		const preferredColor = lifestyle.preferred_color?.trim().toLowerCase();
		const merged = scores
			.map((scoreItem) => {
				const animal = animalsWithTraits.find((entry) => entry.animal_id === scoreItem.animal_id) || animals.find((entry) => entry.animal_id === scoreItem.animal_id);
				if (!animal) return null;

				const exactBreedMatch = matchesPreferredBreed(preferredBreed, animal.animal_breed);
				const exactColorMatch = matchesPreferredColor(preferredColor, animal);
				let adjustedScore = scoreItem.score;

				if (exactColorMatch) {
					adjustedScore = Math.max(adjustedScore, 97);
				}

				if (exactBreedMatch) {
					adjustedScore = Math.max(adjustedScore, 98);
				}

				if (exactBreedMatch && exactColorMatch) {
					adjustedScore = 100;
				}

				return {
					animal_id: animal.animal_id,
					animal_name: animal.animal_name,
					animal_photo: animal.animal_photo,
					animal_breed: animal.animal_breed,
					animal_species: animal.animal_species,
					score: adjustedScore,
					explanation: uniqueMatchExplanation(animal, lifestyle, exactBreedMatch, exactColorMatch),
				};
			})
			.filter(Boolean) as ScoredAnimal[];

		merged.sort((left, right) => right.score - left.score);
		const uniqueMerged = ensureUniqueExplanations(merged.slice(0, 5));

		return NextResponse.json(uniqueMerged);
	} catch (error) {
		console.error("score route error", error);
		if (error instanceof SyntaxError) {
			return parseErrorResponse();
		}
		return NextResponse.json({ message: "Failed to score adoption matches" }, { status: 500 });
	}
}