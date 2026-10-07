"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import apiClient from "@/services/apiClient";
import { DirectoryService } from "@/services/ai.service";
import { useRequireRole } from "@/hooks/useRequireRole";

const RECEPTION_ROLES = ["front_desk", "clinic_admin", "super_admin"];

export default function ReceptionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const logout = useAuthStore((s) => s.logout);
  const [stats, setStats] = useState({ queue: 0, pending: 0 });

  // Role guard: only reception/admin staff belong here (the API enforces this again).
  const { ready, user } = useRequireRole(RECEPTION_ROLES, "/reception-login", { skip: pathname === "/reception-login" });

  // Fetch dynamic stats for queue and pending cases
  const fetchStats = async () => {
    try {
      const doctors = await DirectoryService.doctors();
      const responses = await Promise.all(
        doctors.map((d) => apiClient.get("/appointments/queue", { params: { doctor_id: d.id } })),
      );
      const allAppointments = responses.flatMap((r) => r.data?.data || []);
      
      const total = allAppointments.length;
      const pending = allAppointments.filter(
        (appt: { status: string }) => appt.status === "booked" || appt.status === "confirmed" || appt.status === "in_queue"
      ).length;

      setStats({ queue: total, pending });
    } catch (err) {
      console.error("Failed to fetch sidebar header stats:", err);
    }
  };

  useEffect(() => {
    if (!ready) return;
    fetchStats();
    const interval = setInterval(fetchStats, 30000); // refresh every 30 seconds
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  const handleLogout = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      await logout();
    } catch (err) {
      console.error("Logout error", err);
    }
    router.push("/reception-login");
  };

  const navigation = [
    { name: "DASHBOARD HUB", href: "/reception" },
    { name: "VISIT HISTORY", href: "/reception/visits" },
    { name: "PATIENT SEARCH", href: "/reception/search" },
    { name: "REGISTER PATIENT", href: "/reception/register" },
  ];

  // Render nothing until the server has confirmed an allowed session (no flash of protected content).
  if (!ready) {
    return null;
  }

  const displayName = user?.name ?? "";
  const displayRole = user?.role === "front_desk" ? "Front Desk Staff" : (user?.role || "Staff");

  return (
    <div className="min-h-screen bg-white text-gray-600 flex print:block">
      {/* Off-white Sidebar */}
      <aside className="print:hidden w-[260px] border-r border-gray-200 bg-gray-50 flex flex-col justify-between shrink-0">
        <div className="py-8">
          {/* Logo Section */}
          <div className="px-6 mb-12">
            <span className="font-bold text-lg text-gray-600 tracking-tight block uppercase leading-none">
              MEDIMIND
            </span>
            <span className="text-[10px] block text-gray-400 font-semibold tracking-widest uppercase mt-1">
              RECEPTION CORE
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
            <p className="text-sm font-bold text-gray-650 truncate uppercase tracking-tight">{displayName}</p>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">
              {displayRole}
            </p>
          </div>

          <Link
            href="/reception-login"
            onClick={handleLogout}
            className="flex items-center justify-center w-full px-4 py-3 rounded-[4px] text-xs font-bold uppercase tracking-wider text-clinical-red hover:bg-clinical-red-light transition-all border border-clinical-red/20"
          >
            Sign Out
          </Link>
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
                Queue: {stats.queue} Patients
              </span>
              <span className="bg-clinical-amber-light text-clinical-amber px-3 py-1 rounded-[4px]">
                Pending: {stats.pending} Cases
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
