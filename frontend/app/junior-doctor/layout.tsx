"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useJuniorDoctorStore } from "@/store/juniorDoctorStore";

export default function JuniorDoctorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { patients } = useJuniorDoctorStore();

  const assignedCount = patients.length;
  const inAssessmentCount = patients.filter((p) => p.status === "In Assessment").length;

  const isLoginPage = pathname === "/junior-doctor/login";

  const navigation = [
    { name: "DASHBOARD", href: "/junior-doctor/dashboard" },
    { name: "PATIENT QUEUE", href: "/junior-doctor/queue" },
  ];

  if (isLoginPage) {
    return <div className="min-h-screen bg-white">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-white text-gray-600 flex">
      {/* Off-white Sidebar */}
      <aside className="w-[260px] border-r border-gray-200 bg-gray-50 flex flex-col justify-between shrink-0">
        <div className="py-8">
          {/* Logo Section */}
          <div className="px-6 mb-12">
            <span className="font-bold text-lg text-gray-600 tracking-tight block uppercase leading-none">
              MEDIMIND
            </span>
            <span className="text-[10px] block text-gray-400 font-semibold tracking-widest uppercase mt-1">
              JUNIOR DOCTOR CORE
            </span>
          </div>

          {/* Navigation Links - Text Only */}
          <nav className="space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center px-6 py-4 text-[13px] font-semibold tracking-wider transition-all duration-150 border-l-[3px] ${
                    isActive
                      ? "border-clinical-blue bg-white text-gray-600 font-bold"
                      : "border-transparent text-gray-500 hover:text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User profile & Logout */}
        <div className="p-6 border-t border-gray-250 bg-gray-50/50">
          <div className="bg-white border border-gray-300 p-4 rounded-[4px] mb-4">
            <p className="text-sm font-bold text-gray-650 truncate uppercase tracking-tight">Dr. Amit Pathak</p>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">
              Junior Resident
            </p>
          </div>

          <Link
            href="/junior-doctor/login"
            className="flex items-center justify-center w-full px-4 py-3 rounded-[4px] text-xs font-bold uppercase tracking-wider text-clinical-red hover:bg-clinical-red-light transition-all border border-clinical-red/20"
          >
            Sign Out
          </Link>
        </div>
      </aside>

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Header Bar */}
        <header className="h-20 border-b border-gray-200 bg-white px-8 flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center gap-6">
            <h1 className="text-sm font-bold text-gray-500 uppercase tracking-widest leading-none">
              Workspace Monitor
            </h1>
            <div className="hidden sm:flex items-center gap-3 text-[11px] font-semibold uppercase tracking-wider">
              <span className="bg-clinical-blue-light text-clinical-blue px-3 py-1 rounded-[4px]">
                Assigned: {assignedCount} Patients
              </span>
              <span className="bg-clinical-amber-light text-clinical-amber px-3 py-1 rounded-[4px]">
                In Assessment: {inAssessmentCount}
              </span>
            </div>
          </div>

          {/* Current Date System */}
          <div className="text-right">
            <span className="text-[10px] text-gray-450 font-bold block uppercase tracking-wider">System Date</span>
            <span className="text-sm font-bold text-gray-600 uppercase">
              {new Date().toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}
            </span>
          </div>
        </header>

        {/* Main content viewport */}
        <main className="flex-grow p-8 max-w-7xl w-full mx-auto animate-fade-in-up">
          {children}
        </main>
      </div>
    </div>
  );
}

