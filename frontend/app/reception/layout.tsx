"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import apiClient from "@/services/apiClient";

export default function ReceptionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, token, logout, initialize } = useAuthStore();
  const [stats, setStats] = useState({ queue: 0, pending: 0 });
  const [isReady, setIsReady] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Initialize store from localStorage on mount
  useEffect(() => {
    initialize();
    setIsReady(true);
    setMounted(true);
  }, [initialize]);

  // Auth Guard: if initialized and no token, redirect to login
  useEffect(() => {
    if (isReady) {
      const storedToken = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      if (!token && !storedToken) {
        router.push("/reception-login");
      }
    }
  }, [isReady, token, router]);

  // Fetch dynamic stats for queue and pending cases
  const fetchStats = async () => {
    try {
      const [res1, res2] = await Promise.all([
        apiClient.get("/appointments/queue", { params: { doctor_id: 1 } }),
        apiClient.get("/appointments/queue", { params: { doctor_id: 2 } }),
      ]);
      const list1 = res1.data?.data || [];
      const list2 = res2.data?.data || [];
      const allAppointments = [...list1, ...list2];
      
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
    // Only fetch stats if we have a token (authenticated)
    const storedToken = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (token || storedToken) {
      fetchStats();
      // Poll stats every 30 seconds
      const interval = setInterval(fetchStats, 30000);
      return () => clearInterval(interval);
    }
  }, [token, isReady]);

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
    { name: "PATIENT SEARCH", href: "/reception/search" },
    { name: "REGISTER PATIENT", href: "/reception/register" },
  ];

  // Prevent flash of unauthenticated content or hydration mismatch
  if (!mounted) {
    return null;
  }

  const storedToken = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  if (!token && !storedToken) {
    return null;
  }

  const displayName = user?.name || "Viva Baranwal";
  const displayRole = user?.role === "front_desk" ? "Front Desk Staff" : (user?.role || "Staff");

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
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Header Bar */}
        <header className="h-20 border-b border-gray-200 bg-white px-8 flex items-center justify-between sticky top-0 z-40">
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
