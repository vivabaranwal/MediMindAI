"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useRequireRole } from "@/hooks/useRequireRole";
import { useAuthStore } from "@/store/authStore";
import { useSeniorDoctorStore } from "@/store/seniorDoctorStore";

const ROLE_LABELS: Record<string, string> = {
  doctor: "Doctor",
  super_admin: "Super Admin",
  clinic_admin: "Clinic Admin",
};

export default function SeniorDoctorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === "/senior-doctor/login";
  const { ready, user } = useRequireRole(["doctor", "super_admin"], "/senior-doctor/login", { skip: isLoginPage, level: "senior" });
  const logout = useAuthStore((s) => s.logout);

  const handleSignOut = async () => {
    await logout();
    router.replace("/senior-doctor/login");
  };
  const { patients } = useSeniorDoctorStore();


  const totalPatientsCount = patients.length;
  const urgentCount = patients.filter((p) => p.acuity === "high acuity" || p.acuity === "emergent acuity").length;

  const navigation = [
    { name: "DASHBOARD", href: "/senior-doctor/dashboard" },
    { name: "PATIENT QUEUE", href: "/senior-doctor/queue" },
  ];

  if (isLoginPage) {
    return <div className="min-h-screen bg-white">{children}</div>;
  }

  if (!ready) {
    return <div className="min-h-screen bg-white" />;
  }

  return (
    <div className="min-h-screen bg-white text-gray-600 flex animate-fade-in-up">
      {/* Off-white Sidebar */}
      <aside className="print:hidden w-[260px] border-r border-gray-200 bg-gray-50 flex flex-col justify-between shrink-0">
        <div className="py-8">
          {/* Logo Section */}
          <div className="px-6 mb-12">
            <span className="font-bold text-lg text-gray-600 tracking-tight block uppercase leading-none">
              MEDIMIND
            </span>
            <span className="text-[10px] block text-gray-400 font-semibold tracking-widest uppercase mt-1">
              SENIOR CONSULTANT SUITE
            </span>
          </div>

          {/* Navigation Links - Text Only */}
          <nav className="space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href || (item.href === "/senior-doctor/queue" && pathname.includes("/senior-doctor/patient/"));
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
            <p className="text-sm font-bold text-gray-650 truncate uppercase tracking-tight">{user?.name}</p>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">
              {ROLE_LABELS[user?.role ?? ""] ?? user?.role}
            </p>
          </div>

          <button
            type="button"
            onClick={handleSignOut}
            className="flex items-center justify-center w-full px-4 py-3 rounded-[4px] text-xs font-bold uppercase tracking-wider text-clinical-red hover:bg-clinical-red-light transition-all border border-clinical-red/20"
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto print:block print:overflow-visible">
        {/* Top Header Bar */}
        <header className="print:hidden h-20 border-b border-gray-200 bg-white px-8 flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center gap-6">
            <h1 className="text-sm font-bold text-gray-500 uppercase tracking-widest leading-none">
              Workspace Monitor
            </h1>
            <div className="hidden sm:flex items-center gap-3 text-[11px] font-semibold uppercase tracking-wider">
              <span className="bg-clinical-blue-light text-clinical-blue px-3 py-1 rounded-[4px]">
                In-Clinic: {totalPatientsCount} Patients
              </span>
              <span className="bg-clinical-red-light text-clinical-red px-3 py-1 rounded-[4px]">
                Urgent Cases: {urgentCount}
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
        <main className="flex-grow p-8 max-w-7xl w-full mx-auto print:p-0 print:max-w-none">
          {children}
        </main>
      </div>
    </div>
  );
}
