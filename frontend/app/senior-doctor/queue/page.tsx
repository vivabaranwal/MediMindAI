"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useSeniorDoctorStore } from "@/store/seniorDoctorStore";
import { Table, TableHeader, TableBody, TableRow, TableHeaderCell, TableCell } from "@/components/ui/Table";
import { RiskBadge } from "@/components/senior-doctor/RiskBadge";
import { Button } from "@/components/ui/Button";

type TabStatus = "All" | "Waiting" | "In Review" | "Completed";

export default function QueuePage() {
  const { patients } = useSeniorDoctorStore();
  const [activeTab, setActiveTab] = useState<TabStatus>("All");

  const filtered = activeTab === "All"
    ? patients
    : patients.filter((p) => p.status === activeTab);

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Header Block */}
      <div className="border-b border-gray-200 pb-6">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-1">
          Clinic Patient Database
        </span>
        <h2 className="text-2xl font-bold text-gray-600 uppercase tracking-tight">
          Specialist Worklist Queue
        </h2>
        <p className="text-sm text-gray-400 mt-1 leading-normal">
          Select a patient to begin detailed clinical review, signoff prescriptions, and view diagnostic scans.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-gray-200 pb-3 gap-4">
        <h3 className="font-bold text-base text-gray-600 uppercase tracking-wider">
          Consultation Batches
        </h3>
        <div className="flex bg-gray-100 p-1 rounded border border-gray-200 text-xs font-semibold">
          {(["All", "Waiting", "In Review", "Completed"] as TabStatus[]).map((tab) => {
            const count = tab === "All"
              ? patients.length
              : patients.filter((p) => p.status === tab).length;
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
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400 font-semibold border border-dashed border-gray-300 bg-white rounded uppercase tracking-wider animate-fade-in-up">
          No patients in the chosen queue state.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHeaderCell className="w-[80px]">Token</TableHeaderCell>
              <TableHeaderCell className="w-[140px]">Patient ID</TableHeaderCell>
              <TableHeaderCell>Name</TableHeaderCell>
              <TableHeaderCell className="w-[100px]">Age/Sex</TableHeaderCell>
              <TableHeaderCell className="w-[160px]">Triage Acuity</TableHeaderCell>
              <TableHeaderCell>Assigned Specialist</TableHeaderCell>
              <TableHeaderCell className="w-[140px]">EMR Status</TableHeaderCell>
              <TableHeaderCell className="text-right w-[140px]">Actions</TableHeaderCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((patient) => (
              <TableRow key={patient.id}>
                <TableCell className="font-bold text-clinical-blue">#{patient.token}</TableCell>
                <TableCell className="font-mono text-xs font-bold text-gray-450">{patient.code}</TableCell>
                <TableCell className="font-bold">
                  <Link href={`/senior-doctor/patient/${patient.id}`} className="hover:underline text-gray-600">
                    {patient.name}
                  </Link>
                </TableCell>
                <TableCell>{patient.age}Y / {patient.gender}</TableCell>
                <TableCell>
                  <RiskBadge acuity={patient.acuity} />
                </TableCell>
                <TableCell className="font-medium text-xs uppercase text-gray-500 tracking-wide">
                  {patient.assignedDoctor || "Resident Team"}
                </TableCell>
                <TableCell>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-[4px] text-xs font-semibold uppercase tracking-wider ${
                    patient.status === "Waiting" ? "bg-clinical-amber-light text-clinical-amber" :
                    patient.status === "In Review" ? "bg-clinical-blue-light text-clinical-blue" :
                    "bg-clinical-green-light text-clinical-green"
                  }`}>
                    {patient.status}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <Link href={`/senior-doctor/patient/${patient.id}`}>
                    <Button
                      variant={patient.status === "Completed" ? "secondary" : "primary"}
                      size="sm"
                      className="px-4"
                    >
                      {patient.status === "Completed" ? "VIEW FILE" : "OPEN REVIEW"}
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
