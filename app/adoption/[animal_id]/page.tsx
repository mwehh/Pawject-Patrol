import { createClient } from "@/utils/supabase/server";
import AdoptionForm from "@/components/AdoptionForm";

export default async function AdoptionAnimalPage({ params }: { params: Promise<{ animal_id: string }> }) {
	const { animal_id } = await params;

	const supabase = await createClient();
	const { data: animals } = await supabase.from("animal").select("*").eq("animal_id", animal_id).limit(1);
	const animal = (animals && animals[0]) || null;

	return (
		<AdoptionForm animal={animal} />
	);
}