"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function JuniorDoctorRootRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/junior-doctor/login");
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="text-center space-y-2">
        <p className="text-sm font-bold text-gray-400 uppercase tracking-widest animate-pulse">
          Redirecting to Clinical Portal...
        </p>
      </div>
    </div>
  );
}
