import { createClient } from "@/utils/supabase/server";
import AdoptionForm from "@/components/AdoptionForm";

export default async function AdoptionAnimalPage({ params }: { params: Promise<{ animal_id: string }> }) {
	const { animal_id } = await params;

	const supabase = await createClient();
	const { data: animals } = await supabase.from("animal").select("*").eq("animal_id", animal_id).limit(1);
	const animal = (animals && animals[0]) || null;

	return (
		<main className="min-h-screen bg-linear-to-br from-[#F5ECFF] via-white to-[#FFF6E8] px-6 py-16">
			<div className="mx-auto flex max-w-3xl flex-col gap-6 rounded-3xl bg-white p-8 shadow-[0_18px_50px_rgba(141,82,167,0.12)]">
				<p className="text-sm font-semibold uppercase tracking-[0.2em] text-purple-500">Adoption Application</p>
				{animal ? (
					<>
						<h1 className="text-3xl font-bold text-slate-900">Apply to adopt {animal.animal_name}</h1>
						<p className="text-slate-600">Complete the form below to submit your application.</p>
						<AdoptionForm animal={animal} />
					</>
				) : (
					<div>
						<h1 className="text-2xl font-bold">Animal not found</h1>
						<p className="text-slate-600">We couldn't find that animal. It may have been removed.</p>
					</div>
				)}
			</div>
		</main>
	);
}