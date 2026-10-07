"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useJuniorDoctorStore } from "@/store/juniorDoctorStore";
import { useAuthStore } from "@/store/authStore";
import { Table, TableHeader, TableBody, TableRow, TableHeaderCell, TableCell } from "@/components/ui/Table";
import { RiskBadge } from "@/components/junior-doctor/RiskBadge";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/LoadingState";
import { Alert } from "@/components/ui/Alert";

type FilterStatus = "All" | "Waiting" | "In Assessment" | "Completed";

export default function PatientQueuePage() {
  const { patients, fetchQueue } = useJuniorDoctorStore();
  const { user, initialize } = useAuthStore();
  const [activeTab, setActiveTab] = useState<FilterStatus>("All");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      if (!user.doctor_id) {
        setLoadError("This account has no doctor profile, so there is no queue to show.");
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      setLoadError("");
      try {
        await fetchQueue(user.doctor_id);
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : "Could not load the queue.");
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [user, fetchQueue]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <Spinner />
        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
          Loading Assigned Queue...
        </span>
      </div>
    );
  }

  if (loadError) {
    return (
      <Alert type="error" titleText="Could not load the queue">
        {loadError}
      </Alert>
    );
  }


  // Display all daily queue patients and filter them appropriately via tabs
  console.log("[Queue Page] Rendered patients queue from store:", patients);
  const activeQueue = patients.filter(
    (p) =>
      p.appointmentStatus === "booked" ||
      p.appointmentStatus === "confirmed" ||
      p.appointmentStatus === "in_consultation" ||
      p.appointmentStatus === "in_queue"
  );

  const filteredPatients = activeTab === "All"
    ? activeQueue
    : activeQueue.filter((p) => p.status === activeTab);

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Header Block */}
      <div className="border-b border-gray-200 pb-6">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-1">
          Clinical Operations Queue
        </span>
        <h2 className="text-2xl font-bold text-gray-600 uppercase tracking-tight">
          Assigned Patient Queue
        </h2>
        <p className="text-sm text-gray-400 mt-1 leading-normal">
          Pick a patient to initiate intake questioning or review previously completed diagnostic drafts.
        </p>
      </div>

      {/* Tabs list */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-gray-200 pb-3 gap-4">
        <h3 className="font-bold text-base text-gray-600 uppercase tracking-wider">
          Worklist Categories
        </h3>
        <div className="flex bg-gray-100 p-1 rounded border border-gray-200 text-xs font-semibold">
          {(["All", "Waiting", "In Assessment", "Completed"] as FilterStatus[]).map((tab) => {
            const count = tab === "All"
              ? activeQueue.length
              : activeQueue.filter((p) => p.status === tab).length;

            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded text-[11px] font-bold uppercase tracking-wider transition-all duration-150 ${
                  activeTab === tab
                    ? "bg-white text-clinical-blue"
                    : "text-gray-500 hover:text-gray-600"
                }`}
              >
                {tab} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Queue Table */}
      {filteredPatients.length === 0 ? (
        <div className="text-center py-16 text-gray-400 font-semibold border border-dashed border-gray-300 rounded bg-white uppercase tracking-wider">
          No patients found matching the selected status.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHeaderCell className="w-[80px]">Token</TableHeaderCell>
              <TableHeaderCell className="w-[140px]">Patient Code</TableHeaderCell>
              <TableHeaderCell>Name</TableHeaderCell>
              <TableHeaderCell className="w-[120px]">Age/Sex</TableHeaderCell>
              <TableHeaderCell>Acuity Level</TableHeaderCell>
              <TableHeaderCell>Supervising Specialist</TableHeaderCell>
              <TableHeaderCell className="w-[160px]">Status</TableHeaderCell>
              <TableHeaderCell className="text-right w-[140px]">Action</TableHeaderCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPatients.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-bold text-clinical-blue">#{p.token}</TableCell>
                <TableCell className="font-mono text-xs font-bold text-gray-450">{p.code}</TableCell>
                <TableCell className="font-bold">
                  <Link href={`/junior-doctor/patient/${p.id}`} className="hover:underline text-gray-600">
                    {p.name}
                  </Link>
                </TableCell>
                <TableCell>{p.age}Y / {p.gender}</TableCell>
                <TableCell>
                  <RiskBadge acuity={p.acuity} />
                </TableCell>
                <TableCell className="font-medium text-gray-500 uppercase tracking-wide text-xs">
                  {p.assignedDoctor || "--"}
                </TableCell>
                <TableCell>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-[4px] text-xs font-semibold uppercase tracking-wider ${
                    p.status === "Waiting" ? "bg-clinical-amber-light text-clinical-amber" :
                    p.status === "In Assessment" ? "bg-clinical-blue-light text-clinical-blue" :
                    "bg-clinical-green-light text-clinical-green"
                  }`}>
                    {p.status}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <Link href={`/junior-doctor/patient/${p.id}`}>
                    <Button
                      variant={p.status === "Completed" ? "secondary" : "primary"}
                      size="sm"
                      className="px-4"
                    >
                      {p.status === "Completed" ? "VIEW CASE" : p.status === "In Assessment" ? "RESUME" : "START"}
                    </Button>
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
