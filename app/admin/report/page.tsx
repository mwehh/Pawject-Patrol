"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, LogIn, Facebook, Twitter, Instagram, Mail, X, PawPrint } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabase/client";
import Sidebar from "@/components/Sidebar";
import AdminNotificationsBell from "@/components/AdminNotificationsBell";

// Define the Report type
type Report = {
	report_id: string; // UUID
	report_title: string | null;
	animal_type: string | null;
	animal_gender: string | null;
	date_seen: string | null;
	area: string | null;
	landmark: string | null;
	created_at: string | null;
	photo_url: string | null;
	latitude: number | null;
	longitude: number | null;
	report_status: string | null;
	health_issues?: string | null;
	animal_collar?: string | null;
	other_information?: string | null;
};

// Admin Reports Page Component
export default function AdminReportsPage() {
       // Helper function to format date and time (same format as before)
       function formatDateTime(value?: string | null) {
	       if (!value) return '';
	       const d = new Date(value);
	       if (isNaN(d.getTime())) return value || '';
	       const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
	       const month = months[d.getMonth()];
	       const day = d.getDate().toString().padStart(2, "0");
	       const year = d.getFullYear();
	       let hour = d.getHours();
	       const minute = d.getMinutes().toString().padStart(2, "0");
	       const second = d.getSeconds().toString().padStart(2, "0");
	       const ampm = hour >= 12 ? "PM" : "AM";
	       hour = hour % 12;
	       if (hour === 0) hour = 12;
	       const hourStr = hour.toString().padStart(2, "0");
	       return `${month} ${day}, ${year}, ${hourStr}:${minute}:${second} ${ampm}`;
       }
       // State for reports and loading
       const router = useRouter();

	const handleLogout = async () => {
		await supabase.auth.signOut();
		router.replace("/admin/login");
	};

       const [reports, setReports] = useState<Report[]>([]);
       const [loading, setLoading] = useState(true);
       const [fetchError, setFetchError] = useState<string | null>(null);
       const [search, setSearch] = useState("");
       const [statusFilter, setStatusFilter] = useState<string>("");
       const [sidebarOpen, setSidebarOpen] = useState(false);
       // Store formatted dates for client-only rendering
       const [formattedDates, setFormattedDates] = useState<Record<string, string>>({});

	// User info state for sidebar
	const [userName, setUserName] = useState("");
	const [userEmail, setUserEmail] = useState("");
	const [isAuthenticated, setIsAuthenticated] = useState(false);

	       // Fetch reports on mount
	       useEffect(() => {
		       // Mounting flag to prevent state updates after unmount
		       let mounted = true;

		       // Fetch recent animal reports
		       const run = async () => {
			       // Verify authenticated user
			       const { data: { user } } = await supabase.auth.getUser();
                       
			       // Check if still mounted
			       if (!mounted) return;

			       // Verify admin user
			       if (!user) {
				       router.replace("/admin/login");
				       return;
			       }

			       // Verify admin privileges
			       const { data: admin } = await supabase
				       .from("admin")
				       .select("auth_id")
				       .eq("auth_id", user.id)
				       .maybeSingle();

			       // Check if still mounted
			       if (!mounted) return;

			       // If not an admin, redirect to login with error
			       if (!admin) {
				       await supabase.auth.signOut();
				       router.replace("/admin/login?error=unauthorized");
				       return;
			       }

			       // Set user info for sidebar
			       setUserEmail(user.email || "");
			       const nameFromMeta = user.user_metadata?.full_name || user.user_metadata?.name || "";
			       setUserName(nameFromMeta || user.email?.split("@")[0] || "");
			       setIsAuthenticated(true);

			       // Fetch animal reports
			       const { data, error } = await supabase
				       .from("animal_report")
				       .select(
					       "report_id, report_title, animal_type, animal_gender, date_seen, area, landmark, created_at, photo_url, latitude, longitude, report_status, health_issues, animal_collar, other_information"
				       )
				       .order("created_at", { ascending: false })
				       .limit(50);
                       
			       // Check if still mounted
			       if (!mounted) return;

			       // Handle fetch results
			       if (!error && data) {
				       // Prioritize: Pending > Accepted > Rejected
				       const sorted = (data as Report[]).sort((a, b) => {
					       const statusOrder: Record<string, number> = { 'Pending': 0, 'Accepted': 1, 'Rejected': 2 };
					       const aOrder = statusOrder[a.report_status || 'Pending'] ?? 3;
					       const bOrder = statusOrder[b.report_status || 'Pending'] ?? 3;
					       return aOrder - bOrder;
				       });
				       // Set the sorted reports
				       setReports(sorted);
				       // After setting reports, set formatted dates on client
				       if (typeof window !== 'undefined') {
					       const formatted: Record<string, string> = {};
					       for (const rep of sorted) {
						       const dateVal = rep.date_seen || rep.created_at;
						       formatted[rep.report_id] = formatDateTime(dateVal);
					       }
					       setFormattedDates(formatted);
				       }
			       } else if (error) {
				       setFetchError(error.message ?? String(error));
			       }
			       // Finalize loading state
			       setLoading(false);
		       };
		       // Run the fetch
		       run();
		       return () => {
			       mounted = false;
		       };
	       }, [router]);

	return (
		<>
			{/* Sidebar */}
			<Sidebar
				variant="admin"
				sidebarOpen={sidebarOpen}
				setSidebarOpen={setSidebarOpen}
				userName={userName}
				userEmail={userEmail}
				router={router}
			/>
			<main className="min-h-screen bg-[#E6E6E6]">
				{/* Navigation Header */}
				<div className="flex items-center justify-between px-2 sm:px-4 w-full h-[52px] bg-[#E6E6E6] mx-auto z-10">
					<div className="w-full max-w-[1200px] mx-auto flex items-center justify-between">
						<button 
							onClick={() => setSidebarOpen(!sidebarOpen)}
							className="p-2 hover:bg-gray-100 rounded-lg transition">
							<Menu className="w-6 h-6 text-gray-800" />
						</button>
						<div className="flex-1 flex justify-center items-center h-full">
							<Image src="/Moodboard2.png" alt="Pawject Patrol Logo" width={77} height={36} className="w-16 h-auto sm:w-[77px]" />
						</div>
						<div className="flex items-center gap-2">
							<AdminNotificationsBell />

							{/* Logout Button (Desktop only with text, mobile uses just icon) */}
							<button
								onClick={handleLogout}
								className="hidden md:flex items-center gap-2 bg-[#8D52A7] hover:bg-[#7B4692] text-white px-4 py-2 rounded-lg transition-colors font-medium text-sm"
								style={{ fontFamily: '"Genty Sans", sans-serif' }}
							>
								<span>Logout</span>
								<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
									<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
									<polyline points="16 17 21 12 16 7" />
									<line x1="21" y1="12" x2="9" y2="12" />
								</svg>
							</button>
							{/* Mobile Logout Icon */}
							<button
								onClick={handleLogout}
								className="md:hidden p-2 hover:bg-gray-100 rounded-lg transition"
								aria-label="Sign out"
							>
								<LogIn className="w-6 h-6 text-gray-800" />
							</button>
						</div>
					</div>
				</div>

				{/* Page Header */}
				<div className="py-6 sm:py-8 bg-[#E6E6E6]">
					<div className="max-w-5xl mx-auto px-2 sm:px-6">
						<h2 
							className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl mb-1 font-bold"
							style={{
								color: '#C2C876',
								WebkitTextStrokeWidth: '.5px',
								WebkitTextStrokeColor: '#3C3333',
								fontFamily: '"Kawaii RT", sans-serif',
								fontStyle: 'normal',
								fontWeight: 400,
								lineHeight: 'normal',
								outlineColor: '#3C3333',
							}}
						>
							Animal Reports
						</h2>
						<p className="text-xs sm:text-sm md:text-base" style={{ color: '#3C3333', fontFamily: '"Genty Sans", sans-serif' }}>
							View and manage animal reports
						</p>
					</div>
				</div>

				<div className="max-w-5xl mx-auto px-2 sm:px-6 pb-6">
					<div className="mb-6 sm:mb-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-4">
						<form className="flex-1 relative min-w-0" onSubmit={e => { e.preventDefault(); }}>
							<input
								name="search"
								value={search}
								onChange={e => setSearch(e.target.value)}
								placeholder="Search by title, type, area, or status..."
								className="w-full max-w-full sm:max-w-md pl-10 pr-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 text-sm"
								style={{ fontFamily: 'Genty Sans' }}
							/>
							<span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
								<svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" /></svg>
							</span>
						</form>
						<div className="flex-shrink-0 w-full sm:w-auto">
							<label className="sr-only" htmlFor="report-status-filter">Filter by Status</label>
							<select
								id="report-status-filter"
								name="statusFilter"
								value={statusFilter}
								onChange={e => setStatusFilter(e.target.value)}
								className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
								style={{ fontFamily: 'Genty Sans' }}
							>
								<option value="">Filter By</option>
								<option value="Pending">Pending</option>
								<option value="Accepted">Accepted</option>
								<option value="Rejected">Rejected</option>
							</select>
						</div>
					</div>

					{loading ? (
						<div className="text-center py-8" style={{ color: '#3C3333', fontFamily: 'Genty Sans' }}>Loading reports…</div>
					) : (!reports || reports.length === 0) ? (
						<div className="text-center py-8" style={{ color: '#3C3333', fontFamily: 'Genty Sans' }}>No animal reports found.</div>
					) : null}

					{!loading && (
						<ul className="divide-y divide-gray-200 bg-white rounded-2xl border shadow-lg">
							{reports
								.filter(r => {
									const q = search.trim().toLowerCase();
									const status = statusFilter;
									const matchesSearch = !q || (
										(r.report_title?.toLowerCase().includes(q) || "") ||
										(r.animal_type?.toLowerCase().includes(q) || "") ||
										(r.area?.toLowerCase().includes(q) || "") ||
										(r.report_status?.toLowerCase().includes(q) || "")
									);
									const matchesStatus = !status || (r.report_status === status);
									return matchesSearch && matchesStatus;
								})
								.map((r) => (
									<li key={r.report_id} className="p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
										<div className="w-16 h-16 rounded-lg bg-gray-100 overflow-hidden flex items-center justify-center mb-2 sm:mb-0">
											{r.photo_url ? (
												<img src={r.photo_url} alt={r.animal_type ?? 'Animal'} className="w-full h-full object-cover" />
											) : (
												<span className="text-xs" style={{ color: '#6B7280', fontFamily: 'Genty Sans, sans-serif' }}>No photo</span>
											)}
										</div>
										<div className="flex-1 min-w-0">
											<p className="text-sm sm:text-base font-semibold truncate" style={{ color: '#3C3333', fontFamily: 'Genty Sans, sans-serif' }}>
												{r.report_title || 'Untitled Report'}
											</p>
											<p className="text-xs sm:text-sm truncate flex items-center gap-1" style={{ color: '#3C3333', fontFamily: 'Genty Sans, sans-serif' }}>
												<span className="inline-block align-middle"><PawPrint size={16} color="#6B7280" /></span>
												{r.animal_type || 'animal'} ({r.animal_gender || 'unknown'})
											</p>
											<p className="text-xs truncate flex items-center gap-1" style={{ color: '#6B7280', fontFamily: 'Genty Sans, sans-serif' }}>
												<span className="inline-block align-middle"><svg width="14" height="14" fill="none" viewBox="0 0 24 24"><path d="M12 21c-4.418 0-8-4.03-8-9a8 8 0 0 1 16 0c0 4.97-3.582 9-8 9Z" stroke="#6B7280" strokeWidth="2"/><circle cx="12" cy="12" r="3" stroke="#6B7280" strokeWidth="2"/></svg></span>
												{r.area || '—'} {r.landmark ? `- near ${r.landmark}` : ''}
											</p>
											<p className="text-xs flex items-center gap-1" style={{ color: '#6B7280', fontFamily: 'Genty Sans, sans-serif' }}>
												<span className="inline-block align-middle"><svg width="14" height="14" fill="none" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" stroke="#6B7280" strokeWidth="2"/><path d="M16 2v4M8 2v4M3 10h18" stroke="#6B7280" strokeWidth="2"/></svg></span>
												{typeof window !== 'undefined' && formattedDates[r.report_id] ? formattedDates[r.report_id] : ''}
											</p>
											<div className="flex items-center gap-2 mt-1">
												<span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
													r.report_status === 'Accepted' ? 'bg-green-100 text-green-700' :
													r.report_status === 'Rejected' ? 'bg-red-100 text-red-700' :
													'bg-yellow-100 text-yellow-700'
												}`} style={{ fontFamily: 'Genty Sans, sans-serif' }}>
													{r.report_status || 'Pending'}
												</span>
											</div>
										</div>
										{r.report_id ? (
											<Link
												href={`/admin/report/${r.report_id}`}
												className="px-5 py-2 sm:px-7 sm:py-3 rounded-xl text-xs sm:text-sm font-semibold border-2 border-[#8D52A7] bg-[#8D52A7] text-white shadow-md transition-all hover:opacity-90 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-[#7C3AED] w-full sm:w-auto text-center"
												style={{ fontFamily: 'Genty Sans', minWidth: 0 }}
											>
												View Details
											</Link>
										) : (
											<span className="text-xs" style={{ color: '#6B7280', fontFamily: 'Genty Sans, sans-serif' }}>No ID</span>
										)}
									</li>
								))}
						</ul>
					)}
				</div>
			</main>
		</>
	);
}