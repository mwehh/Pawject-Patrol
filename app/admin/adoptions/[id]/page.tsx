"use client";

import { use, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogIn, Menu, Loader2, CheckCircle2, XCircle, ChevronLeft } from "lucide-react";
import { supabase } from "@/utils/supabase/client";
import Sidebar from "@/components/Sidebar";
import AdminNotificationsBell from "@/components/AdminNotificationsBell";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

type AdoptionApplicationDetail = {
	id: string;
	animal_id: string | null;
	applicant_name: string | null;
	applicant_email: string | null;
	applicant_phone: string | null;
	applicant_address: string | null;
	housing_type: string | null;
	pet_experience: string | null;
	reason: string | null;
	notes?: string | null;
	status: string | null;
	submitted_at: string | null;
	reviewed_at: string | null;
	animal?: {
		animal_id: string;
		animal_name: string | null;
		animal_breed: string | null;
		animal_species: string | null;
		animal_photo: string | null;
		animal_status: string | null;
	} | null;
};

function formatDateTime(value?: string | null) {
	if (!value) return "Not available";
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) return "Not available";
	return parsed.toLocaleString([], {
		year: "numeric",
		month: "short",
		day: "numeric",
		hour: "numeric",
		minute: "2-digit",
	});
}

export default function AdminAdoptionDetailPage({ params }: { params: Promise<{ id: string }> }) {
	const router = useRouter();

	const [sidebarOpen, setSidebarOpen] = useState(false);
	const [userName, setUserName] = useState("");
	const [userEmail, setUserEmail] = useState("");

	const [data, setData] = useState<AdoptionApplicationDetail | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [updating, setUpdating] = useState<"Accepted" | "Rejected" | null>(null);
	const [decisionOpen, setDecisionOpen] = useState(false);
	const [decisionStatus, setDecisionStatus] = useState<"Accepted" | "Rejected" | null>(null);
	const [decisionNotes, setDecisionNotes] = useState<string>("");
	const [decisionError, setDecisionError] = useState<string | null>(null);

	const resolvedParams = use(params);
	const applicationId = useMemo(() => String(resolvedParams?.id || "").trim(), [resolvedParams?.id]);

	const statusLabel = useMemo(() => data?.status || "Pending", [data?.status]);

	const handleLogout = async () => {
		await supabase.auth.signOut();
		router.replace("/admin/login");
	};

	useEffect(() => {
		let mounted = true;

		const run = async () => {
			const id = applicationId;

			const {
				data: { user },
			} = await supabase.auth.getUser();

			if (!mounted) return;

			if (!user) {
				router.replace("/admin/login");
				return;
			}

			const { data: admin, error: adminError } = await supabase
				.from("admin")
				.select("auth_id")
				.eq("auth_id", user.id)
				.maybeSingle();

			if (!mounted) return;

			if (adminError || !admin) {
				await supabase.auth.signOut();
				router.replace("/admin/login?error=unauthorized");
				return;
			}

			setUserEmail(user.email || "");
			const nameFromMeta = user.user_metadata?.full_name || user.user_metadata?.name || "";
			setUserName(nameFromMeta || user.email?.split("@")[0] || "");

			if (!id) {
				setError("Invalid adoption application id");
				setLoading(false);
				return;
			}

			const { data: row, error: fetchError } = await supabase
				.from("adoption_applications")
				.select(
					`
					id,
					animal_id,
					applicant_name,
					applicant_email,
					applicant_phone,
					applicant_address,
					housing_type,
					pet_experience,
					reason,
					notes,
					status,
					submitted_at,
					reviewed_at,
					animal:animal_id (
						animal_id,
						animal_name,
						animal_breed,
						animal_species,
						animal_photo,
						animal_status
					)
				`,
				)
				.eq("id", id)
				.maybeSingle();

			if (!mounted) return;

			if (fetchError || !row) {
				setError(fetchError?.message || "Adoption application not found");
				setLoading(false);
				return;
			}

			const normalized = {
				...(row as any),
				animal: Array.isArray((row as any).animal) ? (row as any).animal[0] ?? null : (row as any).animal ?? null,
			} as AdoptionApplicationDetail;

			setData(normalized);
			setLoading(false);
		};

		run();
		return () => {
			mounted = false;
		};
	}, [applicationId, router]);

	async function updateStatus(status: "Accepted" | "Rejected", notes: string) {
		const idToUpdate = String(data?.id || applicationId || "").trim();
		if (!idToUpdate) {
			setError("Missing adoption application id");
			return;
		}
		setUpdating(status);
		try {
			const response = await fetch(`/api/adoption/applications/${encodeURIComponent(idToUpdate)}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					status,
					notes: notes.trim() ? notes.trim() : null,
				}),
			});

			if (!response.ok) {
				const payload = await response.json().catch(() => null);
				throw new Error(payload?.error || "Failed to update adoption application");
			}

			const payload = await response.json().catch(() => null);
			const reviewedAt = payload?.reviewed_at || new Date().toISOString();
			const savedNotes = payload?.notes ?? (notes.trim() ? notes.trim() : null);
			const nextStatus: "Accepted" | "Rejected" =
				payload?.status === "Accepted" || payload?.status === "Rejected" ? payload.status : status;

			setData((current) =>
				current
					? {
							...current,
							status: nextStatus,
							reviewed_at: reviewedAt,
							notes: savedNotes,
						}
					: current,
			);
			setError(null);
		} catch (e: any) {
			setError(e?.message ?? "Failed to update status");
		} finally {
			setUpdating(null);
		}
	}

	function openDecision(status: "Accepted" | "Rejected") {
		setDecisionStatus(status);
		setDecisionNotes("");
		setDecisionError(null);
		setDecisionOpen(true);
	}

	async function confirmDecision() {
		if (!decisionStatus) return;
		const trimmed = decisionNotes.trim();
		if (!trimmed) {
			setDecisionError(
				decisionStatus === "Accepted"
					? "Please provide a reason for accepting."
					: "Please provide a reason for rejecting.",
			);
			return;
		}
		setDecisionError(null);
		setDecisionOpen(false);
		await updateStatus(decisionStatus, trimmed);
	}

	return (
		<>
			<Dialog
				open={decisionOpen}
				onOpenChange={(open) => {
					setDecisionOpen(open);
					if (!open) {
						// Don't clear `decisionStatus` here; the dialog has a close animation
						// and clearing would briefly render the other branch of the UI.
						setDecisionError(null);
					}
				}}
			>
				<DialogContent
					className="border border-[#3C3333]"
					style={{ fontFamily: '"Genty Sans", sans-serif' }}
				>
					<DialogHeader>
						<DialogTitle>
							{decisionStatus === "Accepted"
								? "Reason for accepting adoption"
								: decisionStatus === "Rejected"
									? "Reason for rejecting adoption"
									: "Review adoption"}
						</DialogTitle>
						<DialogDescription>
							This will be saved as admin notes on the application.
						</DialogDescription>
					</DialogHeader>

					<div className="grid gap-2">
						<label className="text-sm font-semibold" style={{ fontFamily: '"Genty Sans", sans-serif' }}>
							Notes
						</label>
						<Textarea
							value={decisionNotes}
							onChange={(e) => setDecisionNotes(e.target.value)}
							placeholder={
								decisionStatus === "Accepted"
									? "e.g., Approved — adopter meets requirements and will be contacted for pickup details."
									: decisionStatus === "Rejected"
										? "e.g., Rejected — insufficient housing details provided."
										: "Add a short reason for your decision."
							}
							className="min-h-[120px]"
							disabled={updating !== null}
						/>
						{decisionError ? <p className="text-sm text-red-600">{decisionError}</p> : null}
					</div>

					<DialogFooter>
						<button
							type="button"
							onClick={() => setDecisionOpen(false)}
							disabled={updating !== null}
							className="rounded-xl border border-[#3C3333] bg-white px-4 py-2 text-sm font-semibold text-[#3C3333] hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-70"
							style={{ fontFamily: '"Genty Sans", sans-serif' }}
						>
							Cancel
						</button>
						<button
							type="button"
							onClick={confirmDecision}
							disabled={updating !== null || !decisionStatus}
							className={`rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70 ${
								decisionStatus === "Rejected" ? "bg-[#C575AD] hover:bg-[#b05a9a]" : "bg-[#689668] hover:bg-[#5c875d]"
							}`}
							style={{ fontFamily: '"Genty Sans", sans-serif' }}
						>
							{updating ? "Saving..." : decisionStatus === "Accepted" ? "Confirm Accept" : "Confirm Reject"}
						</button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Sidebar
				variant="admin"
				sidebarOpen={sidebarOpen}
				setSidebarOpen={setSidebarOpen}
				userName={userName}
				userEmail={userEmail}
				router={router}
			/>

			<main className="min-h-screen bg-[#E6E6E6]">
				<div className="flex items-center justify-between px-2 sm:px-4 w-full h-[52px] bg-[#E6E6E6] mx-auto z-10">
					<div className="w-full max-w-[1200px] mx-auto flex items-center justify-between">
						<button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-gray-100 rounded-lg transition">
							<Menu className="w-6 h-6 text-gray-800" />
						</button>
						<div className="flex-1 flex justify-center items-center h-full">
							<Image src="/Moodboard2.png" alt="Pawject Patrol Logo" width={77} height={36} className="w-16 h-auto sm:w-[77px]" />
						</div>
						<div className="flex items-center gap-2">
							<AdminNotificationsBell />

							<button
								onClick={handleLogout}
								className="hidden md:flex items-center gap-2 bg-[#8D52A7] hover:bg-[#7B4692] text-white px-4 py-2 rounded-lg transition-colors font-medium text-sm"
								style={{ fontFamily: '"Genty Sans", sans-serif' }}
							>
								<span>Logout</span>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="16"
									height="16"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
									strokeLinecap="round"
									strokeLinejoin="round"
								>
									<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
									<polyline points="16 17 21 12 16 7" />
									<line x1="21" y1="12" x2="9" y2="12" />
								</svg>
							</button>

							<button onClick={handleLogout} className="md:hidden p-2 hover:bg-gray-100 rounded-lg transition" aria-label="Sign out">
								<LogIn className="w-6 h-6 text-gray-800" />
							</button>
						</div>
					</div>
				</div>

				<div className="py-6 sm:py-8 bg-[#E6E6E6]">
					<div className="max-w-5xl mx-auto px-2 sm:px-6">
						<div className="flex items-center gap-3">
							<Link
								href="/admin/adoptions"
								className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-gray-200 shadow-sm hover:bg-gray-50"
								style={{ fontFamily: '"Genty Sans", sans-serif' }}
							>
								<ChevronLeft className="w-4 h-4" />
								Back
							</Link>
						</div>
						<h2
							className="mt-4 text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl mb-1 font-bold"
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
							Adoption Details
						</h2>
						<p className="text-xs sm:text-sm md:text-base" style={{ color: "#3C3333", fontFamily: '"Genty Sans", sans-serif' }}>
							Review a single adoption application
						</p>
					</div>
				</div>

				<div className="max-w-5xl mx-auto px-2 sm:px-6 pb-8">
					{loading ? (
						<div className="text-center py-8" style={{ color: "#3C3333", fontFamily: "Genty Sans" }}>
							Loading adoption application…
						</div>
					) : error || !data ? (
						<div className="text-center py-8" style={{ color: "#3C3333", fontFamily: "Genty Sans" }}>
							{error || "Adoption application not found."}
						</div>
					) : (
						<div className="bg-white rounded-2xl border shadow-lg overflow-hidden">
							<div className="p-4 sm:p-5 flex flex-col sm:flex-row gap-4 sm:gap-6">
								<div className="w-full sm:w-[220px] h-[220px] rounded-2xl bg-gray-100 overflow-hidden flex items-center justify-center">
									{data.animal?.animal_photo ? (
										// eslint-disable-next-line @next/next/no-img-element
										<img src={data.animal.animal_photo} alt={data.animal?.animal_name ?? "Animal"} className="w-full h-full object-cover" />
									) : (
										<span className="text-sm" style={{ color: "#6B7280", fontFamily: 'Genty Sans, sans-serif' }}>
											No photo
										</span>
									)}
								</div>

								<div className="flex-1 min-w-0">
									<div className="flex flex-wrap items-start justify-between gap-3">
										<div>
											<p className="text-xs font-semibold uppercase tracking-[0.18em] text-purple-500">Adoption Application</p>
											<h3 className="mt-1 text-xl font-bold text-slate-900">
												{data.animal?.animal_name || "Unnamed animal"}
											</h3>
											<p className="mt-1 text-sm text-slate-600">
												{[data.animal?.animal_breed, data.animal?.animal_species].filter(Boolean).join(" • ") || "Breed and species unavailable"}
											</p>
										</div>

										<span
											className={`text-xs px-2 py-0.5 rounded-full font-medium ${
												statusLabel === "Accepted"
													? "bg-green-100 text-green-700"
													: statusLabel === "Rejected"
														? "bg-red-100 text-red-700"
														: "bg-yellow-100 text-yellow-700"
											}`}
											style={{ fontFamily: 'Genty Sans, sans-serif' }}
										>
											{statusLabel}
										</span>
									</div>

									<div className="mt-4 grid gap-3 text-sm text-slate-700 md:grid-cols-2">
										<div className="rounded-2xl bg-slate-50 px-4 py-3">
											<p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Applicant</p>
											<p className="mt-1 font-semibold text-slate-900">{data.applicant_name || "—"}</p>
											<p className="text-slate-600">{data.applicant_email || "—"}</p>
											{data.applicant_phone ? <p className="text-slate-600">{data.applicant_phone}</p> : null}
											{data.applicant_address ? <p className="mt-1 text-slate-600">{data.applicant_address}</p> : null}
										</div>

										<div className="rounded-2xl bg-slate-50 px-4 py-3">
											<p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Dates</p>
											<p className="mt-1 text-slate-700">Submitted: {formatDateTime(data.submitted_at)}</p>
											<p className="text-slate-700">Reviewed: {formatDateTime(data.reviewed_at)}</p>
										</div>
									</div>

									<div className="mt-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
										<p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Household</p>
										<p className="mt-1">Housing: {data.housing_type || "Not provided"}</p>
										<p>Experience: {data.pet_experience || "Not provided"}</p>
									</div>

									{data.reason ? (
										<div className="mt-3 rounded-2xl border border-[#E6D7EF] bg-[#FBF7FD] px-4 py-3 text-sm text-slate-700">
											<p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Reason</p>
											<p className="mt-1 leading-6">{data.reason}</p>
										</div>
									) : null}

									{data.notes ? (
										<div className="mt-3 rounded-2xl border border-[#E6D7EF] bg-white px-4 py-3 text-sm text-slate-700">
											<p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Admin Notes</p>
											<p className="mt-2 whitespace-pre-wrap leading-6">{data.notes}</p>
										</div>
									) : null}

									<div className="mt-4 flex flex-wrap gap-3">
										<button
											type="button"
											onClick={() => openDecision("Accepted")}
											disabled={updating !== null || statusLabel !== "Pending"}
											className="inline-flex items-center gap-2 rounded-full bg-[#689668] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#5c875d] disabled:cursor-not-allowed disabled:opacity-70"
										>
											{updating === "Accepted" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
											Accept
										</button>
										<button
											type="button"
											onClick={() => openDecision("Rejected")}
											disabled={updating !== null || statusLabel !== "Pending"}
											className="inline-flex items-center gap-2 rounded-full bg-[#C575AD] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#b05a9a] disabled:cursor-not-allowed disabled:opacity-70"
										>
											{updating === "Rejected" ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
											Reject
										</button>
									</div>
								</div>
							</div>
						</div>
					)}
				</div>
			</main>
		</>
	);
}
