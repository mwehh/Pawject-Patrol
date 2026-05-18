"use client";

import React, { useState } from "react";
import type { AnimalRecord } from "@/types/pawfect-match";

type Props = {
  animal: AnimalRecord;
};

export default function AdoptionForm({ animal }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [housingType, setHousingType] = useState("");
  const [petExperience, setPetExperience] = useState("");
  const [why, setWhy] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/adoption/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          animal_id: animal.animal_id,
          applicant_name: name,
          applicant_email: email,
          applicant_phone: phone,
          applicant_address: address,
          housing_type: housingType,
          pet_experience: petExperience,
          reason: why,
        }),
      });

      if (!res.ok) throw new Error("Failed to submit application");

      setMessage("Application submitted — we'll be in touch.");
      setName("");
      setEmail("");
      setPhone("");
      setAddress("");
      setHousingType("");
      setPetExperience("");
      setWhy("");
    } catch (err: any) {
      setMessage(err?.message ?? "Submission failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
      <div className="grid gap-2">
        <label className="text-sm font-semibold">Animal</label>
        <input readOnly value={animal.animal_name ?? ""} className="rounded-md border px-3 py-2 bg-gray-50" />
      </div>

      <div className="grid gap-2">
        <label className="text-sm font-semibold">Description</label>
        <textarea readOnly value={animal.animal_description ?? ""} className="rounded-md border px-3 py-2 bg-gray-50" />
      </div>

      <div className="grid gap-2 md:grid-cols-2">
        <div>
          <label className="text-sm font-semibold">Your name</label>
          <input required value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full rounded-md border px-3 py-2" />
        </div>
        <div>
          <label className="text-sm font-semibold">Email</label>
          <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full rounded-md border px-3 py-2" />
        </div>
      </div>

      <div className="grid gap-2">
        <label className="text-sm font-semibold">Phone</label>
        <input value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1 w-full rounded-md border px-3 py-2" />
      </div>

      <div className="grid gap-2">
        <label className="text-sm font-semibold">Address</label>
        <textarea value={address} onChange={(e) => setAddress(e.target.value)} className="mt-1 w-full rounded-md border px-3 py-2 min-h-[90px]" placeholder="Street, barangay, city" />
      </div>

      <div className="grid gap-2 md:grid-cols-2">
        <div>
          <label className="text-sm font-semibold">Housing type</label>
          <select value={housingType} onChange={(e) => setHousingType(e.target.value)} className="mt-1 w-full rounded-md border px-3 py-2 bg-white">
            <option value="">Select housing type</option>
            <option value="Apartment">Apartment</option>
            <option value="House without yard">House without yard</option>
            <option value="House with yard">House with yard</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-semibold">Pet experience</label>
          <select value={petExperience} onChange={(e) => setPetExperience(e.target.value)} className="mt-1 w-full rounded-md border px-3 py-2 bg-white">
            <option value="">Select experience</option>
            <option value="None">None</option>
            <option value="Some">Some</option>
            <option value="Experienced">Experienced</option>
          </select>
        </div>
      </div>

      <div className="grid gap-2">
        <label className="text-sm font-semibold">Why should you adopt?</label>
        <textarea required value={why} onChange={(e) => setWhy(e.target.value)} className="mt-1 w-full rounded-md border px-3 py-2 min-h-[120px]" />
      </div>

      <div className="flex items-center gap-3">
        <button disabled={loading} type="submit" className="rounded-full bg-[#8D52A7] px-5 py-2 text-white">{loading ? 'Submitting...' : 'Submit Application'}</button>
        {message ? <p className="text-sm text-slate-600">{message}</p> : null}
      </div>
    </form>
  );
}
