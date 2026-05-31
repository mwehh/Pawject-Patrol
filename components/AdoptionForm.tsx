"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Menu, LogIn } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import UserNotificationsBell from "@/components/UserNotificationsBell";
import { supabase } from "@/utils/supabase/client";
import type { AnimalRecord } from "@/types/pawfect-match";

type Props = {
  animal: AnimalRecord;
};

export default function AdoptionForm({ animal }: Props) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [housingType, setHousingType] = useState("");
  const [petExperience, setPetExperience] = useState("");
  const [why, setWhy] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Layout State
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [sidebarVariant, setSidebarVariant] = useState<"user" | "admin" | "guest">("guest");

  useEffect(() => {
    const checkAuthAndVariant = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const user = session?.user ?? null;
      setIsAuthenticated(!!user);
      if (user) {
        setUserEmail(user.email || "");
        const nameFromMeta =
          user.user_metadata?.full_name || user.user_metadata?.name || "";
        setUserName(nameFromMeta || user.email?.split("@")[0] || "");
        
        const { data: adminData, error } = await supabase
          .from('admin')
          .select('auth_id')
          .eq('auth_id', user.id)
          .single();
        if (adminData && !error) {
          setSidebarVariant("admin");
        } else {
          setSidebarVariant("user");
        }
      } else {
        setSidebarVariant("guest");
      }
    };
    checkAuthAndVariant();
  }, []);

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
      router.push("/catalog");
    } catch (err: any) {
      setMessage(err?.message ?? "Submission failed");
    } finally {
      setLoading(false);
    }
  }

  const renderContent = () => {
    if (!animal) {
      return (
        <div className="flex flex-col items-center w-full md:min-w-[768px] max-w-[1024px] mx-auto px-4 sm:px-8 md:px-[64px] pb-[40px]">
          <h1 className="text-2xl font-bold">Animal not found</h1>
          <p className="text-slate-600">We couldn't find that animal. It may have been removed.</p>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center w-full md:min-w-[768px] max-w-[1024px] mx-auto px-4 sm:px-8 md:px-[64px] pb-[40px]">
        <div className="w-full flex justify-start mb-6">
          <div className="flex flex-col gap-6 rounded-2xl bg-white py-3 px-6 shadow-[0_18px_50px_rgba(141,82,167,0.12)]">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-purple-500">Adoption Application</p>
          </div>
        </div>
        <div className="w-full mb-6 flex flex-col items-start gap-1">
        <h1
          className="text-3xl sm:text-4xl md:text-5xl tracking-wide w-full text-left"
          style={{
            color: "#C2C876",
            WebkitTextStrokeWidth: "1px",
            WebkitTextStrokeColor: "#3C3333",
            fontFamily: '"Kawaii RT", sans-serif',
            fontStyle: "normal",
            fontWeight: 400,
            lineHeight: "1.1",
          }}
        >
          Apply to adopt {animal.animal_name}
        </h1>
        <p
          className="text-sm md:text-base w-full text-left"
          style={{
            color: "#3C3333",
            fontFamily: '"Genty Sans", sans-serif',
            fontWeight: 600,
          }}
        >
          Fill up the details in the form to take one step forward in adopting your pawfect match!
        </p>
      </div>

      <form 
        onSubmit={handleSubmit} 
        className="w-full flex flex-col gap-5 sm:gap-6 bg-[#B5C268] rounded-[24px] sm:rounded-[32px] p-6 sm:p-8 md:p-10 border border-[#3C3333] shadow-sm"
        style={{ fontFamily: '"Genty Sans", sans-serif', color: "#3C3333" }}
      >
        <div className="grid gap-2">
          <label className="text-base sm:text-lg font-bold">Animal</label>
          <input readOnly value={animal.animal_name ?? ""} className="rounded-full px-4 sm:px-5 py-3 sm:py-4 bg-[#DFE696] focus:outline-none text-sm sm:text-base placeholder:text-[#3C3333]/50 w-full" placeholder="Name of Animal" />
        </div>

        <div className="grid gap-2">
          <label className="text-base sm:text-lg font-bold">Description</label>
          <textarea readOnly value={animal.animal_description ?? ""} className="rounded-[20px] px-4 sm:px-5 py-3 sm:py-4 bg-[#DFE696] focus:outline-none text-sm sm:text-base placeholder:text-[#3C3333]/50 w-full min-h-[90px] resize-none" placeholder="Fur/skin color, markings, size..." />
        </div>

        <div className="grid gap-5 md:gap-6 md:grid-cols-2">
          <div className="grid gap-2">
            <label className="text-base sm:text-lg font-bold">Adopter's Name</label>
            <input required value={name} onChange={(e) => setName(e.target.value)} className="rounded-full px-4 sm:px-5 py-3 sm:py-4 bg-[#DFE696] focus:outline-none text-sm sm:text-base placeholder:text-[#3C3333]/50 w-full" placeholder="Your name" />
          </div>
          <div className="grid gap-2">
            <label className="text-base sm:text-lg font-bold">Email Address</label>
            <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="rounded-full px-4 sm:px-5 py-3 sm:py-4 bg-[#DFE696] focus:outline-none text-sm sm:text-base placeholder:text-[#3C3333]/50 w-full" placeholder="...@gmail.com" />
          </div>
        </div>

        <div className="grid gap-2">
          <label className="text-base sm:text-lg font-bold">Phone Number</label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="rounded-full px-4 sm:px-5 py-3 sm:py-4 bg-[#DFE696] focus:outline-none text-sm sm:text-base placeholder:text-[#3C3333]/50 w-full"
            placeholder="+63 xx xxx xxxx"
          />
        </div>

        <div className="grid gap-2">
          <label className="text-base sm:text-lg font-bold">Address</label>
          <input value={address} onChange={(e) => setAddress(e.target.value)} className="rounded-full px-4 sm:px-5 py-3 sm:py-4 bg-[#DFE696] focus:outline-none text-sm sm:text-base placeholder:text-[#3C3333]/50 w-full" placeholder="Street, Barangay, City" />
        </div>

        <div className="grid gap-5 md:gap-6 md:grid-cols-2">
          <div className="grid gap-2">
            <label className="text-base sm:text-lg font-bold">Housing Type</label>
            <div className="relative">
              <select value={housingType} onChange={(e) => setHousingType(e.target.value)} className="rounded-full px-4 sm:px-5 py-3 sm:py-4 bg-[#DFE696] focus:outline-none text-sm sm:text-base placeholder:text-[#3C3333]/50 w-full appearance-none">
                <option value="">Select</option>
                <option value="Apartment">Apartment</option>
                <option value="House without yard">House without yard</option>
                <option value="House with yard">House with yard</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center px-2 text-[#3C3333]">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>
              </div>
            </div>
          </div>
          <div className="grid gap-2">
            <label className="text-base sm:text-lg font-bold">Pet Experience</label>
            <div className="relative">
              <select value={petExperience} onChange={(e) => setPetExperience(e.target.value)} className="rounded-full px-4 sm:px-5 py-3 sm:py-4 bg-[#DFE696] focus:outline-none text-sm sm:text-base placeholder:text-[#3C3333]/50 w-full appearance-none">
                <option value="">Select</option>
                <option value="None">None</option>
                <option value="Some">Some</option>
                <option value="Experienced">Experienced</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center px-2 text-[#3C3333]">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-2">
          <label className="text-base sm:text-lg font-bold">Why Should you adopt?</label>
          <textarea required value={why} onChange={(e) => setWhy(e.target.value)} className="rounded-[20px] px-4 sm:px-5 py-3 sm:py-4 bg-[#DFE696] focus:outline-none text-sm sm:text-base placeholder:text-[#3C3333]/50 w-full min-h-[120px] resize-none" placeholder="State your reasons for wanting to adopt" />
        </div>

        <div className="mt-2 flex flex-col items-center gap-3">
          <button disabled={loading} type="submit" className="w-full rounded-[16px] bg-[#8D52A7] hover:bg-[#7F4A96] transition-colors py-4 sm:py-5 text-white font-bold text-lg sm:text-xl">
            {loading ? 'Submitting...' : 'Submit Application'}
          </button>
          {message && <p className="text-sm sm:text-base font-bold text-center mt-2">{message}</p>}
        </div>
      </form>
    </div>
    );
  };

  return (
    <main className="relative min-h-screen flex flex-col items-center overflow-hidden bg-[#E1E69D]">
      {/* Sidebar */}
      <Sidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        userName={userName}
        userEmail={userEmail || undefined}
        router={router}
        variant={sidebarVariant}
      />

      <div className="relative z-10 w-full flex flex-col items-center flex-1">
        <header className="flex items-center justify-between px-4 w-full h-[52px] bg-[#E6E6E6] mx-auto z-10 w-full max-w-full">
            <div className="w-full max-w-[1400px] mx-auto flex items-center justify-between">
              <div className="flex items-center gap-3 w-1/3">
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="p-1 hover:bg-gray-200 rounded-lg transition"
                >
                  <Menu className="w-6 h-6 text-[#3C3333]" />
                </button>
              </div>

              <div className="flex-1 flex justify-center items-center h-full cursor-pointer" onClick={() => router.push('/')}>
                <Image
                  src="/Moodboard2.png"
                  alt="Pawject Patrol Logo"
                  width={77}
                  height={36}
                  className="flex-shrink-0"
                />
              </div>

              <div className="flex items-center justify-end gap-2 sm:gap-4 w-1/3">
                {isAuthenticated ? <UserNotificationsBell /> : null}
                <button
                  className="p-2 hover:bg-gray-100 rounded-lg transition"
                  onClick={async () => {
                    if (!isAuthenticated) {
                      router.push("/login");
                      return;
                    }
                    const { data: { user } } = await supabase.auth.getUser();
                    if (user) {
                      const { data: adminData } = await supabase
                        .from('admin')
                        .select('auth_id')
                        .eq('auth_id', user.id)
                        .single();
                      
                      await supabase.auth.signOut();
                      if (adminData) {
                        router.push("/admin/login");
                      } else {
                        router.push("/");
                      }
                    }
                  }}
                >
                  <LogIn className="w-6 h-6 text-[#3C3333]" />
                </button>
              </div>
            </div>
        </header>

        <div className="max-w-6xl mx-auto px-4 py-8 pl-6 pr-6 w-full">
          <div className="bg-[#E1E69D] rounded-2xl p-2 md:p-5 lg:p-8 pl-[24px] pr-[24px] w-full">
            {renderContent()}
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <footer className="py-6 border-t w-full text-center flex-shrink-0">
        <div className="max-w-6xl mx-auto px-6">
          <p className="text-xs text-gray-500" style={{ fontFamily: '"Genty Sans", sans-serif' }}>
            Pawject Patrol — Youth For Animals UP Mindanao
          </p>
        </div>
      </footer>
    </main>
  );
}
