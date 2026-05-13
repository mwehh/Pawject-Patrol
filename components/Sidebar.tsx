import Link from "next/link";
import Image from "next/image";
import { X, Facebook, Instagram, Twitter, Mail } from "lucide-react";
import { NextRouter } from "next/router";

type SidebarProps = {
	sidebarOpen: boolean;
	setSidebarOpen: (open: boolean) => void;
	userName?: string;
	userEmail?: string;
    variant?: "admin" | "user" | "guest";
	router: any;
};

export default function Sidebar({ sidebarOpen, setSidebarOpen, userName, userEmail, router, variant = "admin"}: SidebarProps) {
	const navLinks =
		variant === "admin"
			? [
					{
						label: "Animal Profiles",
						href: "/admin/profiles",
						icon: (
							<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none">
								<path d="M3 9L12 2L21 9V20C21 20.53 20.79 21.04 20.41 21.41C20.04 21.79 19.53 22 19 22H5C4.47 22 3.96 21.79 3.59 21.41C3.21 21.04 3 20.53 3 20V9Z" stroke="#3C3333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
								<path d="M9 22V12H15V22" stroke="#3C3333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
							</svg>
						),
					},
					{
						label: "Animal Reports",
						href: "/admin/report",
						icon: (
							<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none">
								<path d="M20.42 4.58C19.92 4.08 19.32 3.68 18.67 3.4C18.01 3.13 17.31 2.99 16.6 2.99C15.89 2.99 15.18 3.13 14.52 3.4C13.87 3.68 13.27 4.08 12.77 4.58L12 5.36L11.23 4.58C10.73 4.08 10.13 3.68 9.48 3.4C8.82 3.13 8.12 2.99 7.41 2.99C6.7 2.99 5.99 3.13 5.33 3.4C4.68 3.68 4.08 4.08 3.58 4.58C1.46 6.7 1.33 10.28 4 13L12 21L20 13C22.67 10.28 22.54 6.7 20.42 4.58Z" stroke="#8D52A7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
							</svg>
						),
					},
					{
						label: "Volunteer Requests",
						href: "/admin/volunteer",
						icon: (
							<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none">
								<g clipPath="url(#clip0)"><path d="M12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22Z" stroke="#C575AD" strokeWidth="3" /><path d="M12 18C15.31 18 18 15.31 18 12C18 8.69 15.31 6 12 6C8.69 6 6 8.69 6 12C6 15.31 8.69 18 12 18Z" stroke="#C575AD" strokeWidth="3" /><path d="M12 14C13.1 14 14 13.1 14 12C14 10.9 13.1 10 12 10C10.9 10 10 10.9 10 12C10 13.1 10.9 14 12 14Z" stroke="#C575AD" strokeWidth="3" /></g>
							</svg>
						),
					},
				]
			: [
					{
						label: "Animal Catalogue",
						href: "/catalog",
						icon: (
							<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none">
								<path d="M3 9L12 2L21 9V20C21 20.53 20.79 21.04 20.41 21.41C20.04 21.79 19.53 22 19 22H5C4.47 22 3.96 21.79 3.59 21.41C3.21 21.04 3 20.53 3 20V9Z" stroke="#3C3333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
								<path d="M9 22V12H15V22" stroke="#3C3333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
							</svg>
						),
					},
					{
						label: "Report Animal",
						href: variant === "guest" ? "/login" : "/form",
						icon: (
							<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none">
								<path d="M20.42 4.58C19.92 4.08 19.32 3.68 18.67 3.4C18.01 3.13 17.31 2.99 16.6 2.99C15.89 2.99 15.18 3.13 14.52 3.4C13.87 3.68 13.27 4.08 12.77 4.58L12 5.36L11.23 4.58C10.73 4.08 10.13 3.68 9.48 3.4C8.82 3.13 8.12 2.99 7.41 2.99C6.7 2.99 5.99 3.13 5.33 3.4C4.68 3.68 4.08 4.08 3.58 4.58C1.46 6.7 1.33 10.28 4 13L12 21L20 13C22.67 10.28 22.54 6.7 20.42 4.58Z" stroke="#8D52A7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
							</svg>
						),
					},
					{
						label: "Task Volunteer",
						href: variant === "guest" ? "/login" : "/volunteer",
						icon: (
							<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none">
								<g clipPath="url(#clip0)"><path d="M12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22Z" stroke="#C575AD" strokeWidth="3" /><path d="M12 18C15.31 18 18 15.31 18 12C18 8.69 15.31 6 12 6C8.69 6 6 8.69 6 12C6 15.31 8.69 18 12 18Z" stroke="#C575AD" strokeWidth="3" /><path d="M12 14C13.1 14 14 13.1 14 12C14 10.9 13.1 10 12 10C10.9 10 10 10.9 10 12C10 13.1 10.9 14 12 14Z" stroke="#C575AD" strokeWidth="3" /></g>
							</svg>
						),
					},
				];
    return (
		<>
			{/* Backdrop */}
			<div
				className={`fixed inset-0 bg-black/50 z-30 transition-opacity ${
					sidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"
				}`}
				onClick={() => setSidebarOpen(false)}
			/>

			{/* Sidebar */}
			<div
				className={`fixed left-0 top-0 h-screen w-full max-w-xs sm:max-w-sm md:max-w-md lg:w-[375px] bg-[#E1E69D] z-40 transition-transform transform ${
					sidebarOpen ? "translate-x-0" : "-translate-x-full"
				} min-w-0 overflow-y-auto`}
				style={{
					display: "flex",
					padding: "24px",
					flexDirection: "column",
					justifyContent: "space-between",
					alignItems: "center",
				}}
			>
				{/* Close Button */}
				<button
					onClick={() => setSidebarOpen(false)}
					className="absolute top-4 right-4 p-2 hover:bg-gray-200 rounded-lg transition"
				>
					<X className="w-6 h-6 text-gray-800" />
				</button>

				{/* Top Section */}
				<div className="flex flex-col gap-6 items-center w-full">
					{/* Logo */}
					<Image
						src="/YFALogo.png"
						alt="Youth for Animals Logo"
						width={92}
						height={77}
					/>

					<div className="flex flex-col gap-6 items-center w-full">
						{/* Account Information */}
						<div
							className="w-full"
							style={{
								display: "flex",
								flexDirection: "column",
								alignItems: "flex-start",
								gap: "5px",
								alignSelf: "stretch",
								borderRadius: "16px",
								border: "1px solid #3C3333",
								backgroundColor: "#E6E6E6",
								padding: "12px",
							}}
						>
							{variant === "guest" ? (
								<div className="flex flex-col items-center justify-center w-full" style={{ minHeight: "56px" }}>
									<span className="text-xs text-gray-600" style={{ color: "#3C3333", fontSize: "14px", fontStyle: "normal", fontWeight: 600, lineHeight: "normal" }}>
										You are not logged in.
									</span>
								</div>
							) : (
								<div className="flex items-center gap-3 w-full">
									<div className="w-10 h-10 rounded-full bg-gray-400 flex items-center justify-center">
										<span className="text-sm font-bold text-white">
											{userName ? userName[0].toUpperCase() : "?"}
										</span>
									</div>
									<div className="flex flex-col">
										<span className="font-semibold text-gray-800 text-sm" style={{ color: "#3C3333", fontFamily: "Genty Sans", fontSize: "16px", fontStyle: "normal", fontWeight: 500, lineHeight: "normal" }}>
											{userName || (variant === "admin" ? "Admin" : "User")}
										</span>
										<span className="text-xs text-gray-600" style={{ color: "#3C3333", fontSize: "12px", fontStyle: "normal", fontWeight: 400, lineHeight: "normal" }}>
											{userEmail || (variant === "admin" ? "admin@pawjectpatrol.com" : "user@pawjectpatrol.com")}
										</span>
									</div>
								</div>
							)}
						</div>

						{/* Navigation */}
						<nav
							className="w-full"
							style={{
								display: "flex",
								flexDirection: "column",
								alignItems: "flex-start",
								gap: "5px",
								alignSelf: "stretch",
								borderRadius: "16px",
								border: "1px solid #3C3333",
								backgroundColor: "#E6E6E6",
								padding: "12px",
							}}
						>
							{[{
								label: "Home",
								icon: (
									<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
										<path d="M3 9L12 2L21 9V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9Z" stroke="#3C3333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
										<path d="M9 22V12H15V22" stroke="#3C3333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
									</svg>
								),
								onClick: () => {
									setSidebarOpen(false);
									router.push(variant === "admin" ? "/admin" : "/");
								},
							},
							{
								label: "About Us",
								icon: (
									<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
										<path d="M20.42 4.57996C19.9183 4.07653 19.3222 3.67709 18.6658 3.40455C18.0094 3.132 17.3057 2.9917 16.595 2.9917C15.8843 2.9917 15.1806 3.132 14.5242 3.40455C13.8678 3.67709 13.2717 4.07653 12.77 4.57996L12 5.35996L11.23 4.57996C10.7283 4.07653 10.1322 3.67709 9.47582 3.40455C8.81944 3.132 8.11571 2.9917 7.40499 2.9917C6.69428 2.9917 5.99055 3.132 5.33417 3.40455C4.67779 3.67709 4.08167 4.07653 3.57999 4.57996C1.45999 6.69996 1.32999 10.28 3.99999 13L12 21L20 13C22.67 10.28 22.54 6.69996 20.42 4.57996Z" stroke="#8D52A7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
									</svg>
								),
								onClick: () => {
									setSidebarOpen(false);
									router.push("/about-us");
									setTimeout(() => {
										if (typeof window !== 'undefined') {
											const scrollToSection = () => {
												const el = document.getElementById("about-us");
												if (el) {
													el.scrollIntoView({ behavior: "smooth", block: "start" });
												}
											};
											setTimeout(scrollToSection, 400);
										}
									}, 400);
								},
							},
							{
								label: "Mission",
								icon: (
									<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
										<g clipPath="url(#clip0)"><path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="#C575AD" strokeWidth="3" /><path d="M12 18C15.3137 18 18 15.3137 18 12C18 8.68629 15.3137 6 12 6C8.68629 6 6 8.68629 6 12C6 15.3137 8.68629 18 12 18Z" stroke="#C575AD" strokeWidth="3" /><path d="M12 14C13.1046 14 14 13.1046 14 12C14 10.8954 13.1046 10 12 10C10.8954 10 10 10.8954 10 12C10 13.1046 10.8954 14 12 14Z" stroke="#C575AD" strokeWidth="3" /></g>
									</svg>
								),
								onClick: () => {
									setSidebarOpen(false);
									router.push("/about-us");
									setTimeout(() => {
										if (typeof window !== 'undefined') {
											const scrollToSection = () => {
												const el = document.getElementById("mission");
												if (el) {
													el.scrollIntoView({ behavior: "smooth", block: "start" });
												}
											};
											setTimeout(scrollToSection, 400);
										}
									}, 400);
								},
							},
							{
								label: "Vision",
								icon: (
									<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
										<path d="M2 12C2 12 5 5 12 5C19 5 22 12 22 12C22 12 19 19 12 19C5 19 2 12 2 12Z" stroke="#5E9BBA" strokeWidth="2" />
										<path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" stroke="#5E9BBA" strokeWidth="2" />
									</svg>
								),
								onClick: () => {
									setSidebarOpen(false);
									router.push("/about-us");
									setTimeout(() => {
										if (typeof window !== 'undefined') {
											const scrollToSection = () => {
												const el = document.getElementById("vision");
												if (el) {
													el.scrollIntoView({ behavior: "smooth", block: "start" });
												}
											};
											setTimeout(scrollToSection, 400);
										}
									}, 400);
								},
							},
							{
								label: "Goals",
								icon: (
									<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
										<path d="M22 11.0799V11.9999C21.9988 14.1563 21.3005 16.2545 20.0093 17.9817C18.7182 19.7088 16.9033 20.9723 14.8354 21.5838C12.7674 22.1952 10.5573 22.1218 8.53447 21.3744C6.51168 20.6271 4.78465 19.246 3.61096 17.4369C2.43727 15.6279 1.87979 13.4879 2.02168 11.3362C2.16356 9.18443 2.99721 7.13619 4.39828 5.49694C5.79935 3.85768 7.69279 2.71525 9.79619 2.24001C11.8996 1.76477 14.1003 1.9822 16.07 2.85986" stroke="#689668" strokeWidth="2" />
										<path d="M22 4L12 14.01L9 11.01" stroke="#689668" strokeWidth="2" />
									</svg>
								),
								onClick: () => {
									setSidebarOpen(false);
									router.push("/about-us");
									setTimeout(() => {
										if (typeof window !== 'undefined') {
											const scrollToSection = () => {
												const el = document.getElementById("goals");
												if (el) {
													el.scrollIntoView({ behavior: "smooth", block: "start" });
												}
											};
											setTimeout(scrollToSection, 400);
										}
									}, 400);
								},
							},
							{
								label: "Notifications",
								icon: (
									<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
										<path d="M18 8C18 6.4087 17.3679 4.88258 16.2426 3.75736C15.1174 2.63214 13.5913 2 12 2C10.4087 2 8.88258 2.63214 7.75736 3.75736C6.63214 4.88258 6 6.4087 6 8C6 21 3 23 3 23H21C21 23 18 21 18 8Z" stroke="#5E9BBA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
										<path d="M14.73 21C14.5542 21.3031 14.3019 21.5547 13.9982 21.7295C13.6946 21.9044 13.3504 21.9965 13 21.9965C12.6496 21.9965 12.3054 21.9044 12.0018 21.7295C11.6982 21.5547 11.4458 21.3031 11.27 21" stroke="#5E9BBA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
									</svg>
								),
								onClick: () => {
									setSidebarOpen(false);
									router.push(variant === "admin" ? "/admin/notifications" : "/notifications");
								},
							}].map((item) => (
								<button
									key={item.label}
									onClick={item.onClick ? item.onClick : () => {
										setSidebarOpen(false);
										router.push("/admin");
									}}
									className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/30 transition text-left w-full"
								>
									<div className="w-6 h-6 flex items-center justify-center">
										{item.icon}
									</div>
									<span className="font-semibold text-gray-800 text-sm">
										{item.label}
									</span>
								</button>
							))}
						</nav>
					</div>
				</div>

				{/* Animal Actions Section (admin) or User Actions Section (user) */}
				<div
					className="w-full"
					style={{
						display: "flex",
						flexDirection: "column",
						alignItems: "flex-start",
						gap: "5px",
						alignSelf: "stretch",
						borderRadius: "16px",
						border: "1px solid #000",
						backgroundColor: "#E6E6E6",
						padding: "12px",
						marginTop: "24px",
					}}
				>
					{variant === "admin" && navLinks.map((item) => (
						<Link
							key={item.label}
							href={item.href}
							className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/30 transition text-left w-full"
							onClick={() => setSidebarOpen(false)}
						>
							<div className="w-6 h-6 flex items-center justify-center">
								{item.icon}
							</div>
							<span className="font-semibold text-gray-800 text-sm">
								{item.label}
							</span>
						</Link>
					))}
					{(variant === "user" || variant === "guest") && navLinks.map((item) => (
						<Link
							key={item.label}
							href={item.href}
							className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/30 transition text-left w-full"
							onClick={() => setSidebarOpen(false)}
						>
							<div className="w-6 h-6 flex items-center justify-center">
								{item.icon}
							</div>
							<span className="font-semibold text-gray-800 text-sm">
								{item.label}
							</span>
						</Link>
					))}
				</div>

				{/* Bottom Section – Social Links */}
				<div className="flex items-center gap-3 mt-6">
					<a href="https://www.facebook.com/YFAUPMin" className="bg-[#C575AD] p-2 rounded-full text-white hover:opacity-80">
						<Facebook size={18} />
					</a>
					<a
						href="#"
						className="bg-[#8D52A7] p-2 rounded-full text-white hover:opacity-80"
					>
						<Instagram size={18} />
					</a>
					<a
						href="#"
						className="bg-[#5E9BBA] p-2 rounded-full text-white hover:opacity-80"
					>
						<Twitter size={18} />
					</a>
					<a
						href="mailto:yfaupmindanao@gmail.com"
						className="bg-[#9BBF94] p-2 rounded-full text-white hover:opacity-80"
					>
						<Mail size={18} />
					</a>
				</div>
			</div>
		</>
	);
}