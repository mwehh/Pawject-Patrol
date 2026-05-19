export type LifestyleData = {
	pet_type: "dog" | "cat" | "any";
	preferred_breed?: string;
	preferred_color?: string | null;
	preferred_size: "small" | "medium" | "large" | "any";
	activity_level: number;
	hours_away_per_day: number;
	living_space: "apartment" | "house_no_yard" | "house_with_yard";
	experience_level: "none" | "some" | "experienced";
	preferred_energy: number;
};

export type AnimalRecord = {
	animal_id: string;
	animal_name: string | null;
	animal_species: string | null;
	animal_breed: string | null;
	animal_description: string | null;
	animal_status: string | null;
	animal_photo: string | null;
	animal_gender: string | null;
	health_issues: string | null;
	vaccination_status: string | null;
};

export type BreedTraits = {
	energy_level: number;
	adaptability: number;
	grooming_needs: number;
	social_needs: number;
	stranger_friendly: number;
	child_friendly: number;
};

export type BreedTraitMap = Record<string, BreedTraits>;

export type ScoredAnimal = AnimalRecord & {
	score: number;
	explanation: string;
};