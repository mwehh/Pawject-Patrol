// NOTE: This is only a prompted confirmation page used to test backend, not yet the final version

"use client";

// Import necessary modules
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useState, useEffect } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import { createAnimalReport } from "@/actions/form/user";
import { getGlobalPhotoFile } from "@/app/(user)/form/page";
import Sidebar from "@/components/Sidebar";
import UserNotificationsBell from "@/components/UserNotificationsBell";
import { supabase } from "@/utils/supabase/client";
import Link from "next/link";
import {
  Menu,
  LogIn,
  X,
  Facebook,
  Instagram,
  Twitter,
  Mail,
} from "lucide-react";

// Dynamically import AdminMapView with no SSR
const AdminMapView = dynamic(() => import("@/components/AdminMapView"), { ssr: false });

function ConfirmationContent() {
	// Get URL search params and router
	const searchParams = useSearchParams();
	const router = useRouter();

	// Local state
	const [submitting, setSubmitting] = useState(false);
	const [resultMsg, setResultMsg] = useState<string | null>(null);
	const [photoFile, setPhotoFile] = useState<File | null>(null);
	const [showImageModal, setShowImageModal] = useState(false);
	const [sidebarOpen, setSidebarOpen] = useState(false);

	// Tab state for tabbed icons
	const [activeTab, setActiveTab] = useState<'overview' | 'animal' | 'location' | 'health'>('overview');

	// Auth-connected sidebar state
	const [userName, setUserName] = useState("");
	const [userEmail, setUserEmail] = useState("");
	const [isAuthenticated, setIsAuthenticated] = useState(false);

	// Extract all data from URL params
	const reportTitle = searchParams.get("reportTitle") || "";
	const reporterName = searchParams.get("reporterName") || "";
	const animalType = searchParams.get("animalType") || "";
	const gender = searchParams.get("gender") || "Unknown";
	const dateSeen = searchParams.get("dateSeen") || "";
	const physicalDescription = searchParams.get("physicalDescription") || "";
	const area = searchParams.get("area") || "";
	const landmark = searchParams.get("landmark") || "";
	const road = searchParams.get("road") || "";
	const healthIssues = searchParams.get("healthIssues") || "";
	const animalCollar = searchParams.get("animalCollar") || "";
	const otherInfo = searchParams.get("otherInfo") || "";
	const lat = parseFloat(searchParams.get("lat") || "0");
	const lng = parseFloat(searchParams.get("lng") || "0");
	const photoUrl = searchParams.get("photoUrl") || "";

	// Handle user logout and redirect to login page
	const handleLogout = async () => {
		await supabase.auth.signOut();
		router.replace("/login");
	};

	// Restore photo File from global storage on mount
	useEffect(() => {
		const file = getGlobalPhotoFile();
		if (file) {
			setPhotoFile(file);
		}
	}, []);

	// Auth-connected sidebar state
	useEffect(() => {
		const setupAuth = async () => {
			const {
				data: { user },
			} = await supabase.auth.getUser();
			setIsAuthenticated(!!user);
			if (user) {
				const nameFromMeta =
					(user.user_metadata?.full_name as string) ||
					(user.user_metadata?.name as string) ||
					"";
				setUserName(nameFromMeta || user.email?.split("@")[0] || "");
				setUserEmail(user.email || "");
			} else {
				setUserName("");
				setUserEmail("");
			}
		};
		setupAuth();
		const { data: listener } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
			setIsAuthenticated(!!session?.user);
			if (session?.user) {
				const nameFromMeta =
					(session.user.user_metadata?.full_name as string) ||
					(session.user.user_metadata?.name as string) ||
					"";
				setUserName(nameFromMeta || session.user.email?.split("@")[0] || "");
				setUserEmail(session.user.email || "");
			} else {
				setUserName("");
				setUserEmail("");
			}
		});
		return () => {
			listener.subscription.unsubscribe();
		};
	}, []);


	async function handleConfirmSubmit() {
		// Submit the report
		setSubmitting(true);
		setResultMsg(null);
		try {
		// Reconstruct date with time
		let dateSeenWithTime: string | undefined = undefined;
		if (dateSeen) {
			const now = new Date();
			const selectedDate = new Date(dateSeen);
			selectedDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
			dateSeenWithTime = selectedDate.toISOString();
		}

		// Submit the report
		const res = await createAnimalReport({
			report_title: reportTitle || undefined,
			reporter_name: reporterName || undefined,
			animal_type: animalType || "other",
			animal_gender: gender as string,
			date_seen: dateSeenWithTime,
			animal_description: physicalDescription || undefined,
			area: area || undefined,
			landmark: landmark || undefined,
			road: road || undefined,
			health_issues: healthIssues || undefined,
			animal_collar: animalCollar || undefined,
			other_information: otherInfo || undefined,
			// report_theme removed
			latitude: lat,
			longitude: lng,
			photo: photoFile || undefined,
		});

		// Handle submission result
		if (!res.success) {
				setResultMsg(res.error ?? "Failed to submit");
			} else {
				setResultMsg("Report submitted successfully!");
					// Clear the saved snapshot now that submission succeeded
					sessionStorage.removeItem('animalReportFormData');
				// Redirect to home after 2 seconds
				setTimeout(() => router.push("/"), 2000);
			}
		} catch (e: any) {
			setResultMsg(e.message);
		} finally {
			setSubmitting(false);
		}
	}

	// Helper to persist photo file as base64 in sessionStorage
	function handleEditReport() {
		if (photoFile) {
			const reader = new FileReader();
			reader.onload = function (e) {
				if (e.target?.result) {
					sessionStorage.setItem('animalReportPhotoBase64', e.target.result as string);
				}
				// Save all form data as before
				sessionStorage.setItem('animalReportFormData', JSON.stringify({
					reportTitle,
					reporterName,
					animalType,
					gender,
					dateSeen,
					physicalDescription,
					otherInfo,
					area,
					landmark,
					road,
					hasHealthIssues: healthIssues !== "None",
					healthDetails: healthIssues !== "None" ? healthIssues : "",
					hasCollar: animalCollar !== "None",
					collarDetails: animalCollar !== "None" ? animalCollar : "",
					lat,
					lng,
					photoPreview: photoUrl,
				}));
				router.push('/form');
			};
			reader.readAsDataURL(photoFile);
		} else {
			// Save all form data as before
			sessionStorage.setItem('animalReportFormData', JSON.stringify({
				reportTitle,
				reporterName,
				animalType,
				gender,
				dateSeen,
				physicalDescription,
				otherInfo,
				area,
				landmark,
				road,
				hasHealthIssues: healthIssues !== "None",
				healthDetails: healthIssues !== "None" ? healthIssues : "",
				hasCollar: animalCollar !== "None",
				collarDetails: animalCollar !== "None" ? animalCollar : "",
				lat,
				lng,
				photoPreview: photoUrl,
			}));
			router.push('/form');
		}
	}

	return (
			<main className="relative min-h-screen flex flex-col items-center overflow-hidden bg-[#E6E6E6]">
				{/* Sidebar */}
				<Sidebar
					sidebarOpen={sidebarOpen}
					setSidebarOpen={setSidebarOpen}
					userName={userName}
					userEmail={userEmail ?? undefined}
					router={router}
					variant="user"
				/>
				<div className="relative z-10 w-full flex flex-col items-center flex-1">
					{/* Navbar/Header */}
					<header className="flex items-center justify-between px-4 w-full h-[52px] bg-[#E6E6E6] mx-auto">
						<div className="w-full max-w-[1400px] mx-auto flex items-center justify-between">
							<button
								className="p-2 hover:bg-gray-100 rounded-lg transition"
								onClick={() => setSidebarOpen(true)}
							>
								<Menu className="w-6 h-6 text-gray-800" />
							</button>
							<div className="flex-1 flex justify-center items-center h-full">
								<Image
									src="/Moodboard2.png"
									alt="Pawject Patrol Logo"
									width={77}
									height={36}
									className="flex-shrink-0"
								/>
							</div>
							<div className="flex items-center gap-2">
								<UserNotificationsBell />
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
								<button
									onClick={handleLogout}
									className="md:hidden p-2 hover:bg-gray-100 rounded-lg transition"
									aria-label="Sign out"
								>
									<LogIn className="w-6 h-6 text-gray-800" />
								</button>
							</div>
						</div>
					</header>

					<div className="max-w-6xl w-full mx-auto px-4 mt-8">
						 <div className="mb-6">
							 <h1
								 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl mb-1"
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
								 Confirm Report Form
							 </h1>
							 <p
								 className="text-xs sm:text-sm md:text-md"
								 style={{ color: '#3C3333', fontFamily: '"Genty Sans", sans-serif' }}
							 >
								 Review your report details before submitting
							 </p>
						 </div>
						   <div className="bg-white rounded-2xl shadow-2xl overflow-hidden w-full max-w-6xl relative" style={{ minWidth: 340 }}>
							{/* Header Section (Purple) */}
							<div className="w-full p-6" style={{ backgroundColor: '#8D52A7' }}>
								<div className="flex w-full flex-col gap-1">
									<h2 className="text-2xl font-bold text-white" style={{ fontFamily: 'Genty Sans, sans-serif' }}>
										{reportTitle.trim() ? reportTitle : '—'}
									</h2>
									<div className="flex w-full items-center justify-between">
										<p className="text-sm text-white opacity-90 m-0" style={{ fontFamily: 'Genty Sans, sans-serif' }}>
											{animalType || 'Animal'} • {gender || 'Unknown'}
										</p>
									</div>
								</div>
							</div>

						{/* Tabbed Icons Row (interactive, like admin modal) */}
						<div className="flex flex-wrap md:flex-nowrap w-full items-start bg-[#E6E6E6] p-2 gap-2">
							{/* Overview Tab */}
							<button
								className={`flex justify-center items-center gap-1 transition rounded-2xl w-[calc(25%-4px)] md:w-auto md:flex-1 ${activeTab === 'overview' ? 'bg-[#8D52A7]' : 'bg-[#E6E6E6]'} ${activeTab === 'overview' ? '' : 'hover:bg-[#d1c1e0]'}`}
								style={{ height: '42px', padding: '10px' }}
								aria-label="Overview"
								onClick={() => setActiveTab('overview')}
								type="button"
							>
								<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
									<circle cx="12" cy="12" r="10" stroke={activeTab === 'overview' ? '#FFFFFF' : '#3C3333'} strokeWidth="2" />
									<line x1="12" y1="8" x2="12" y2="12" stroke={activeTab === 'overview' ? '#FFFFFF' : '#3C3333'} strokeWidth="2" strokeLinecap="round" />
									<circle cx="12" cy="16" r="1" fill={activeTab === 'overview' ? '#FFFFFF' : '#3C3333'} />
								</svg>
							</button>
							{/* Animal Info Tab */}
							<button
								className={`flex justify-center items-center gap-1 transition rounded-2xl w-[calc(25%-4px)] md:w-auto md:flex-1 ${activeTab === 'animal' ? 'bg-[#8D52A7]' : 'bg-[#E6E6E6]'} ${activeTab === 'animal' ? '' : 'hover:bg-[#d1c1e0]'}`}
								style={{ height: '42px', padding: '10px' }}
								aria-label="Animal Info"
								onClick={() => setActiveTab('animal')}
								type="button"
							>
								<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
									<circle cx="12" cy="8" r="4" stroke={activeTab === 'animal' ? '#FFFFFF' : '#3C3333'} strokeWidth="2" />
									<path d="M4 20c0-2.21 3.58-4 8-4s8 1.79 8 4" stroke={activeTab === 'animal' ? '#FFFFFF' : '#3C3333'} strokeWidth="2" />
								</svg>
							</button>
							{/* Location Tab */}
							<button
								className={`flex justify-center items-center gap-1 transition rounded-2xl w-[calc(25%-4px)] md:w-auto md:flex-1 ${activeTab === 'location' ? 'bg-[#8D52A7]' : 'bg-[#E6E6E6]'} ${activeTab === 'location' ? '' : 'hover:bg-[#d1c1e0]'}`}
								style={{ height: '42px', padding: '10px' }}
								aria-label="Location"
								onClick={() => setActiveTab('location')}
								type="button"
							>
								<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
									<path d="M3 6L9 3L15 6L21 3V18L15 21L9 18L3 21V6Z" stroke={activeTab === 'location' ? '#FFFFFF' : '#3C3333'} strokeWidth="2" />
									<path d="M9 3V18" stroke={activeTab === 'location' ? '#FFFFFF' : '#3C3333'} strokeWidth="2" />
									<path d="M15 6V21" stroke={activeTab === 'location' ? '#FFFFFF' : '#3C3333'} strokeWidth="2" />
								</svg>
							</button>
							{/* Health Tab */}
							<button
								className={`flex justify-center items-center gap-1 transition rounded-2xl w-[calc(25%-4px)] md:w-auto md:flex-1 ${activeTab === 'health' ? 'bg-[#8D52A7]' : 'bg-[#E6E6E6]'} ${activeTab === 'health' ? '' : 'hover:bg-[#d1c1e0]'}`}
								style={{ height: '42px', padding: '10px' }}
								aria-label="Health"
								onClick={() => setActiveTab('health')}
								type="button"
							>
								<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
									<path d="M11 2C10.47 2 9.96 2.21 9.59 2.59C9.21 2.96 9 3.47 9 4V9H4C3.47 9 2.96 9.21 2.59 9.59C2.21 9.96 2 10.47 2 11V13C2 14.1 2.9 15 4 15H9V20C9 21.1 9.9 22 11 22H13C13.53 22 14.04 21.79 14.41 21.41C14.79 21.04 15 20.53 15 20V15H20C20.53 15 21.04 14.79 21.41 14.41C21.79 14.04 22 13.53 22 13V11C22 10.47 21.79 9.96 21.41 9.59C21.04 9.21 20.53 9 20 9H15V4C15 3.47 14.79 2.96 14.41 2.59C14.04 2.21 13.53 2 13 2H11Z" stroke={activeTab === 'health' ? '#FFFFFF' : '#3C3333'} strokeWidth="2" />
								</svg>
							</button>
						</div>

							{/* Main Content Section - only show details for active tab */}
							<div className="flex flex-col w-full p-8 gap-[32px]" style={{ fontFamily: 'Genty Sans, sans-serif' }}>
								{activeTab === 'overview' && (
									<>
										{/* Photo Section - admin modal parity */}
										<div className="flex h-[298px] pl-0 justify-center items-center self-stretch mb-0">
											<div
												className="w-full h-full rounded-2xl flex items-center justify-center cursor-pointer hover:opacity-90 transition overflow-hidden"
												style={{ backgroundColor: '#8D52A7', aspectRatio: '1' }}
												onClick={() => { if (photoUrl) setShowImageModal(true); }}
											>
												{photoUrl ? (
													<img src={photoUrl} alt="Animal photo" className="w-full h-full object-cover" />
												) : (
													<svg className="w-16 h-16 text-white opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
														<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812-1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
														<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
													</svg>
												)}
											</div>
										</div>

										{/* Reporter Name */}
										<div className="w-full mb-0">
											<p className="text-sm mb-0" style={{ color: '#4A5565', fontFamily: 'Genty Sans, sans-serif' }}>Recorded By</p>
											<p className="text-sm font-medium mb-0" style={{ color: '#3C3333', fontFamily: 'Genty Sans, sans-serif' }}>{reporterName.trim() ? reporterName : '—'}</p>
										</div>

										{/* Date Seen */}
										{dateSeen && (
											<div className="w-full mb-0">
												<p className="text-sm mb-0" style={{ color: '#4A5565', fontFamily: 'Genty Sans, sans-serif' }}>Date Seen</p>
												<p className="text-sm font-medium mb-0" style={{ color: '#3C3333', fontFamily: 'Genty Sans, sans-serif' }}>{new Date(dateSeen).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })}</p>
											</div>
										)}

										{/* Location */}
										{area && (
											<div className="w-full mb-0">
												<p className="text-sm mb-0" style={{ color: '#4A5565', fontFamily: 'Genty Sans, sans-serif' }}>Location</p>
												<p className="text-sm font-medium mb-0" style={{ color: '#3C3333', fontFamily: 'Genty Sans, sans-serif' }}>{area}</p>
											</div>
										)}

										{/* Summary */}
										<div className="w-full mb-0">
											<p className="text-sm mb-0" style={{ color: '#4A5565', fontFamily: 'Genty Sans, sans-serif' }}>Summary</p>
											<p className="text-sm leading-relaxed mb-0" style={{ color: '#3C3333', fontFamily: 'Genty Sans, sans-serif' }}>
												{(
													otherInfo && otherInfo !== 'None'
												) ? otherInfo : (
													physicalDescription && physicalDescription !== 'None'
														? physicalDescription
														: 'No summary provided'
												)}
											</p>
										</div>
									</>
								)}
								   {activeTab === 'animal' && (
									   <>
										   {/* Animal Info Details - stacked vertically */}
										   <div className="flex flex-col gap-4">
											   <div className="w-full">
												   <p className="text-sm mb-1" style={{ color: '#4A5565' }}>Type of Animal</p>
												   <p className="text-base font-medium" style={{ color: '#3C3333' }}>{animalType || '—'}</p>
											   </div>
											   <div className="w-full">
												   <p className="text-sm mb-1" style={{ color: '#4A5565' }}>Gender</p>
												   <p className="text-base font-medium" style={{ color: '#3C3333' }}>{gender || 'Unknown'}</p>
											   </div>
											   <div className="w-full">
												   <p className="text-sm mb-1" style={{ color: '#4A5565' }}>Physical Description</p>
												   <p className="text-base leading-relaxed" style={{ color: '#3C3333' }}>{physicalDescription || 'None'}</p>
											   </div>
										   </div>
									   </>
								   )}
								   {activeTab === 'location' && (
									   <>
										   {/* Location Fields - stacked vertically */}
										   <div className="flex flex-col gap-4">
											   <div className="w-full">
												   <p className="text-sm mb-1" style={{ color: '#4A5565' }}>Area Seen (Location)</p>
												   <p className="text-base font-medium" style={{ color: '#3C3333' }}>{area || '—'}</p>
											   </div>
											   <div className="w-full">
												   <p className="text-sm mb-1" style={{ color: '#4A5565' }}>Landmark Near Location</p>
												   <p className="text-base font-medium" style={{ color: '#3C3333' }}>{landmark || '—'}</p>
											   </div>
											   <div className="w-full">
												   <p className="text-sm mb-1" style={{ color: '#4A5565' }}>What Road?</p>
												   <p className="text-base font-medium" style={{ color: '#3C3333' }}>{road || '—'}</p>
											   </div>
											   <div className="w-full">
													<p className="text-sm mb-1" style={{ color: '#4A5565' }}>Location on Map</p>
											   </div>
											{lat && lng && (
												<div className="w-full flex flex-col gap-0">
													<div className="bg-white rounded-2xl shadow-md p-0 overflow-hidden">
														<div className="h-72 md:h-80 w-full relative rounded-b-2xl overflow-hidden" style={{ marginBottom: 0, paddingBottom: 0, minHeight: 0, height: '100%' }}>
															<AdminMapView latitude={lat} longitude={lng} />
														</div>
													</div>
												</div>
											)}
										   </div>
										   
									   </>
								   )}
								{activeTab === 'health' && (
									<>
										{/* Health Tab Details - admin parity, improved spacing */}
										<div className="flex flex-col gap-0">
											{/* Health Issues Row */}
											<div className="flex justify-between items-center pb-3 border-b border-gray-200">
												<p className="text-sm" style={{ color: '#3C3333', fontFamily: 'Genty Sans, sans-serif' }}>Health Issues</p>
												<span
													className="px-3 py-1 rounded-full text-sm font-medium"
													style={{
														backgroundColor: healthIssues && healthIssues !== 'None' && healthIssues !== '' ? '#DBEAFE' : '#F3F4F6',
														color: healthIssues && healthIssues !== 'None' && healthIssues !== '' ? '#1E40AF' : '#6B7280',
														fontFamily: 'Genty Sans, sans-serif',
													}}
												>
													{healthIssues && healthIssues !== 'None' && healthIssues !== '' ? 'Yes' : 'No'}
												</span>
											</div>
											{/* Health Issues Subfields (always shown) */}
											<div className="pl-6 pt-4 pb-4 border-gray-200 mb-2">
												<p className="text-sm mb-1" style={{ color: '#4A5565', fontFamily: 'Genty Sans, sans-serif' }}>Health Issues</p>
												<p className="text-sm font-medium" style={{ color: '#3C3333', fontFamily: 'Genty Sans, sans-serif' }}>{healthIssues && healthIssues !== 'None' && healthIssues !== '' ? healthIssues : 'None'}</p>
												{/* Additional Health Issues */}
												{searchParams.get('additionalHealthIssues') && (
													<div className="mt-2">
														<p className="text-sm mb-1" style={{ color: '#4A5565', fontFamily: 'Genty Sans, sans-serif' }}>Additional Health Issues</p>
														<p className="text-sm font-medium" style={{ color: '#3C3333', fontFamily: 'Genty Sans, sans-serif' }}>{searchParams.get('additionalHealthIssues')}</p>
													</div>
												)}
											</div>

											{/* Has Collar Row */}
											<div className="flex justify-between items-center pb-3 border-b border-gray-200 mt-2">
												<p className="text-sm" style={{ color: '#3C3333', fontFamily: 'Genty Sans, sans-serif' }}>Has Collar</p>
												<span
													className="px-3 py-1 rounded-full text-sm font-medium"
													style={{
														backgroundColor: animalCollar && animalCollar !== 'None' && animalCollar !== '' ? '#DBEAFE' : '#F3F4F6',
														color: animalCollar && animalCollar !== 'None' && animalCollar !== '' ? '#1E40AF' : '#6B7280',
														fontFamily: 'Genty Sans, sans-serif',
													}}
												>
													{animalCollar && animalCollar !== 'None' && animalCollar !== '' ? 'Yes' : 'No'}
												</span>
											</div>
											{/* Collar Details Subfields (always shown) */}
											<div className="pl-6 pt-4 pb-4 border-gray-200 mb-2">
												<p className="text-sm mb-1" style={{ color: '#4A5565', fontFamily: 'Genty Sans, sans-serif' }}>Collar Details</p>
												<p className="text-sm" style={{ color: '#3C3333', fontFamily: 'Genty Sans, sans-serif' }}>{animalCollar && animalCollar !== 'None' && animalCollar !== '' ? animalCollar : 'None'}</p>
												{/* Additional Collar Details */}
												{searchParams.get('additionalCollarDetails') && (
													<div className="mt-2">
														<p className="text-sm mb-1" style={{ color: '#4A5565', fontFamily: 'Genty Sans, sans-serif' }}>Additional Collar Details</p>
														<p className="text-sm" style={{ color: '#3C3333', fontFamily: 'Genty Sans, sans-serif' }}>{searchParams.get('additionalCollarDetails')}</p>
													</div>
												)}
											</div>

											{/* Other Information */}
											<div className="pt-2">
												<p className="text-sm mb-1" style={{ color: '#4A5565', fontFamily: 'Genty Sans, sans-serif' }}>Other Information</p>
												<p className="text-sm" style={{ color: '#3C3333', fontFamily: 'Genty Sans, sans-serif' }}>{otherInfo || 'No description provided'}</p>
											</div>
										</div>
									</>
								)}

								{/* Action buttons (unchanged, still present) */}
								<div className="pt-4 flex gap-3">
									<button
										onClick={handleEditReport}
										className="flex-1 rounded-md border-2 border-gray-400 bg-white py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 text-center"
									>
										Edit Report
									</button>
									<button
										onClick={handleConfirmSubmit}
										disabled={submitting}
										className="flex-1 rounded-lg py-3 text-sm font-semibold transition disabled:opacity-50"
										style={{
											backgroundColor: '#8D52A7',
											color: 'white',
											fontFamily: 'Genty Sans, sans-serif'
										}}
									>
										{submitting ? 'Submitting...' : 'Confirm & Submit'}
									</button>
								</div>
								{resultMsg && (
									<p
										className="mt-2 text-sm text-center font-medium"
										style={{
											color:
												resultMsg.toLowerCase().includes('success')
													? '#22c55e' // Tailwind green-500
													: '#ef4444', // Tailwind red-500
											fontFamily: 'Genty Sans, sans-serif',
										}}
									>
										{resultMsg}
									</p>
								)}
							</div>
						</div>
					</div>
				</div>

				{/* Image Modal */}
				{showImageModal && photoUrl && (
					<div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80" onClick={() => setShowImageModal(false)}>
						<button
							className="fixed top-6 right-6 rounded-full p-2 shadow z-[100000] bg-white/80 hover:bg-white"
							style={{ lineHeight: 0 }}
							onClick={e => { e.stopPropagation(); setShowImageModal(false); }}
							aria-label="Close image modal"
						>
							<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="white" className="w-6 h-6">
								<path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
							</svg>
						</button>
						<div className="relative max-w-3xl w-full flex items-center justify-center" onClick={e => e.stopPropagation()}>
							<img src={photoUrl} alt="Animal photo full view" className="max-h-[80vh] max-w-full rounded-2xl shadow-2xl" />
						</div>
					</div>
				)}
			</main>
	);
}

function DisplayField({ label, value }: { label: string; value: string }) {
	return (
		<div className="rounded-xl bg-[#E1E69D] p-4">
			<label 
				className="block mb-2" 
				style={{
					color: '#3C3333',
					fontFamily: '"Genty Sans", sans-serif',
					fontSize: '13px',
					fontWeight: 600,
					textTransform: 'uppercase' as const,
					letterSpacing: '0.5px',
				}}
			>
				{label}
			</label>
			<p className="text-base" style={{ color: '#3C3333', fontFamily: '"Genty Sans", sans-serif', fontWeight: 400 }}>{value}</p>
		</div>
	);
}

function DisplayTextArea({ label, value }: { label: string; value: string }) {
	return (
		<div className="rounded-xl bg-[#E1E69D] p-4">
			<label 
				className="block mb-2" 
				style={{
					color: '#3C3333',
					fontFamily: '"Genty Sans", sans-serif',
					fontSize: '13px',
					fontWeight: 600,
					textTransform: 'uppercase' as const,
					letterSpacing: '0.5px',
				}}
			>
				{label}
			</label>
			<p className="text-base whitespace-pre-wrap" style={{ color: '#3C3333', fontFamily: '"Genty Sans", sans-serif', fontWeight: 400 }}>{value}</p>
		</div>
	);
}

export default function ConfirmPage() {
	return (
		<Suspense fallback={
			<main className="min-h-screen bg-[#E6E6E6] flex items-center justify-center">
				<p className="text-sm">Loading confirmation...</p>
			</main>
		}>
			<ConfirmationContent />
		</Suspense>
	);
}
