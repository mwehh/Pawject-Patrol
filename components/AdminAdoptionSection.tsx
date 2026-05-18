"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { CheckCircle2, Loader2, Trash2, XCircle } from "lucide-react";
import { supabase } from "@/utils/supabase/client";

type AdoptionApplication = {
  id: string;
  animal_id: string;
  applicant_name: string;
  applicant_email: string;
  applicant_phone: string | null;
  applicant_address: string | null;
  housing_type: string | null;
  pet_experience: string | null;
  reason: string | null;
  status: string;
  submitted_at: string;
  animal?: {
    animal_id: string;
    animal_name: string | null;
    animal_breed: string | null;
    animal_species: string | null;
    animal_photo: string | null;
    animal_status: string | null;
  } | null;
};

function statusTone(status: string) {
  const normalized = status.toLowerCase();
  if (normalized === "accepted") return "green";
  if (normalized === "rejected") return "rose";
  return "amber";
}

function statusClasses(status: string) {
  switch (statusTone(status)) {
    case "green":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "rose":
      return "border-rose-200 bg-rose-50 text-rose-700";
    default:
      return "border-amber-200 bg-amber-50 text-amber-700";
  }
}

export default function AdminAdoptionSection() {
  const [applications, setApplications] = useState<AdoptionApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"upcoming" | "history">("upcoming");

  function formatDateTime(value: string | null | undefined) {
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

  function formatStatus(status: string) {
    const normalized = status.toLowerCase();
    if (normalized === "accepted") return "Accepted";
    if (normalized === "rejected") return "Rejected";
    return "Pending";
  }

  async function loadApplications() {
    setLoading(true);
    const { data, error } = await supabase
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
        status,
        submitted_at,
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
      .eq("status", "Pending")
      .order("submitted_at", { ascending: false })
      .limit(6);

    if (error) {
      console.error("Failed to load adoption applications", error);
      setApplications([]);
    } else {
      setApplications((data || []) as AdoptionApplication[]);
    }
    setLoading(false);
  }

  async function loadHistory() {
    setLoading(true);
    const { data, error } = await supabase
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
      .order("submitted_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Failed to load adoption history", error);
      setApplications([]);
    } else {
      setApplications((data || []) as AdoptionApplication[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    if (viewMode === "upcoming") {
      loadApplications();
    } else {
      loadHistory();
    }
  }, [viewMode]);

  async function updateApplication(id: string, status: "Accepted" | "Rejected") {
    setActionId(id);
    try {
      const application = applications.find((item) => item.id === id);

      const { error: updateError } = await supabase
        .from("adoption_applications")
        .update({ status, reviewed_at: new Date().toISOString() })
        .eq("id", id);

      if (updateError) throw updateError;

      if (status === "Accepted" && application?.animal_id) {
        const { error: animalError } = await supabase
          .from("animal")
          .update({ animal_status: "Adopted" })
          .eq("animal_id", application.animal_id);

        if (animalError) throw animalError;
      }

      setApplications((current) => current.filter((item) => item.id !== id));
    } catch (error) {
      console.error("Failed to update adoption application", error);
    } finally {
      setActionId(null);
    }
  }

  async function deleteApplication(id: string) {
    setActionId(id);
    try {
      const { error } = await supabase.from("adoption_applications").delete().eq("id", id);
      if (error) throw error;
      setApplications((current) => current.filter((item) => item.id !== id));
    } catch (error) {
      console.error("Failed to delete adoption application", error);
    } finally {
      setActionId(null);
    }
  }

  return (
    <section className="max-w-6xl mx-auto px-4 pb-8">
      <div className="rounded-2xl border-2 border-[#8D52A7] bg-white shadow-lg overflow-hidden">
        <div className="flex items-center justify-between gap-4 border-b-2 border-[#8D52A7] bg-[#E6E6E6] px-4 py-4">
          <div>
            <h2 className="text-lg lg:text-xl font-medium text-[#8D52A7]" style={{ fontFamily: '"Genty Sans", sans-serif' }}>
              {viewMode === "upcoming" ? "Upcoming Adoptions" : "Adoption History"}
            </h2>
            <p className="text-xs md:text-sm text-[#3C3333]" style={{ fontFamily: '"Genty Sans", sans-serif' }}>
              {viewMode === "upcoming"
                ? "Review pending adoption applications and respond from the dashboard."
                : "Browse the full adoption record with submitted and reviewed date/time."}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center">
            <div className="rounded-full border border-[#8D52A7]/20 bg-[#8D52A7]/10 px-4 py-2 text-sm font-semibold text-[#8D52A7]">
              {loading ? "Loading..." : `${applications.length} ${viewMode === "upcoming" ? "pending" : "records"}`}
            </div>
            <button
              type="button"
              onClick={() => setViewMode(viewMode === "upcoming" ? "history" : "upcoming")}
              className="rounded-full border border-[#8D52A7] bg-white px-4 py-2 text-sm font-semibold text-[#8D52A7] transition hover:bg-[#8D52A7] hover:text-white"
              style={{ fontFamily: '"Genty Sans", sans-serif' }}
            >
              {viewMode === "upcoming" ? "History" : "Back to Review"}
            </button>
          </div>
        </div>

        <div className="p-4 md:p-5 bg-[#FFF9FF]">
          {loading ? (
            <div className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-[#D9BCE7] bg-white px-4 py-10 text-sm text-[#7F4A96]">
              <Loader2 className="h-4 w-4 animate-spin" />
              {viewMode === "upcoming" ? "Loading adoption queue..." : "Loading adoption history..."}
            </div>
          ) : applications.length === 0 ? (
            <div className="rounded-2xl border border-[#D9BCE7] bg-white px-4 py-8 text-center text-sm text-slate-600">
              {viewMode === "upcoming" ? "No upcoming adoptions right now." : "No adoption history yet."}
            </div>
          ) : (
            viewMode === "upcoming" ? (
              <div className="grid gap-4">
                {applications.map((application) => (
                  <article key={application.id} className="overflow-hidden rounded-2xl border border-[#E6D7EF] bg-white shadow-[0_10px_30px_rgba(141,82,167,0.08)]">
                    <div className="grid gap-0 md:grid-cols-[160px_1fr]">
                      <div className="relative h-48 bg-purple-50 md:h-full">
                        {application.animal?.animal_photo ? (
                          <Image
                            src={application.animal.animal_photo}
                            alt={application.animal.animal_name || "Animal"}
                            fill
                            className="object-cover"
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
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-purple-500">Adoption Application</p>
                            <h3 className="mt-1 text-xl font-bold text-slate-900">
                              {application.animal?.animal_name || "Unnamed animal"}
                            </h3>
                            <p className="mt-1 text-sm text-slate-600">
                              {[application.animal?.animal_breed, application.animal?.animal_species]
                                .filter(Boolean)
                                .join(" • ") || "Breed and species unavailable"}
                            </p>
                          </div>

                          <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-semibold ${statusClasses(application.status)}`}>
                            {application.status === "Accepted" ? (
                              <CheckCircle2 className="h-4 w-4" />
                            ) : application.status === "Rejected" ? (
                              <XCircle className="h-4 w-4" />
                            ) : (
                              <Loader2 className="h-4 w-4" />
                            )}
                            {application.status}
                          </div>
                        </div>

                        <div className="grid gap-3 text-sm text-slate-700 md:grid-cols-2">
                          <div className="rounded-2xl bg-slate-50 px-4 py-3">
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Applicant</p>
                            <p className="mt-1 font-semibold text-slate-900">{application.applicant_name}</p>
                            <p className="text-slate-600">{application.applicant_email}</p>
                            {application.applicant_phone ? <p className="text-slate-600">{application.applicant_phone}</p> : null}
                          </div>

                          <div className="rounded-2xl bg-slate-50 px-4 py-3">
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Household</p>
                            <p className="mt-1 text-slate-700">{application.housing_type || "Not provided"}</p>
                            <p className="text-slate-700">Experience: {application.pet_experience || "Not provided"}</p>
                          </div>
                        </div>

                        {application.reason ? (
                          <div className="rounded-2xl border border-[#E6D7EF] bg-[#FBF7FD] px-4 py-3 text-sm text-slate-700">
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Reason</p>
                            <p className="mt-1 leading-6">{application.reason}</p>
                          </div>
                        ) : null}

                        <div className="flex flex-wrap gap-3">
                          <button
                            type="button"
                            onClick={() => updateApplication(application.id, "Accepted")}
                            disabled={actionId === application.id}
                            className="inline-flex items-center gap-2 rounded-full bg-[#689668] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#5c875d] disabled:cursor-not-allowed disabled:opacity-70"
                          >
                            {actionId === application.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                            Accept
                          </button>
                          <button
                            type="button"
                            onClick={() => updateApplication(application.id, "Rejected")}
                            disabled={actionId === application.id}
                            className="inline-flex items-center gap-2 rounded-full bg-[#C575AD] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#b05a9a] disabled:cursor-not-allowed disabled:opacity-70"
                          >
                            {actionId === application.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                            Reject
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteApplication(application.id)}
                            disabled={actionId === application.id}
                            className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-5 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-70"
                          >
                            {actionId === application.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="grid gap-4">
                {applications.map((application) => (
                  <article key={application.id} className="rounded-2xl border border-[#E6D7EF] bg-white px-5 py-4 shadow-[0_10px_30px_rgba(141,82,167,0.08)]">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-bold text-slate-900">
                            {application.animal?.animal_name || "Unnamed animal"}
                          </h3>
                          <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${statusClasses(application.status)}`}>
                            {formatStatus(application.status)}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600">
                          {application.applicant_name} • {application.applicant_email}
                        </p>
                        <p className="text-sm text-slate-600">
                          Submitted: {formatDateTime(application.submitted_at)}
                        </p>
                        <p className="text-sm text-slate-600">
                          Reviewed: {formatDateTime(application.reviewed_at)}
                        </p>
                      </div>

                      <div className="grid gap-2 text-sm text-slate-700 lg:text-right">
                        <p className="font-semibold text-slate-900">
                          {[application.animal?.animal_breed, application.animal?.animal_species]
                            .filter(Boolean)
                            .join(" • ") || "Breed and species unavailable"}
                        </p>
                        <p>Housing: {application.housing_type || "Not provided"}</p>
                        <p>Experience: {application.pet_experience || "Not provided"}</p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )
          )}
        </div>
      </div>
    </section>
  );
}