"use client";

import React from "react";
import Link from "next/link";
import { useJuniorDoctorStore } from "@/store/juniorDoctorStore";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Table, TableHeader, TableBody, TableRow, TableHeaderCell, TableCell } from "@/components/ui/Table";
import { RiskBadge } from "@/components/junior-doctor/RiskBadge";

export default function JuniorDoctorDashboard() {
  const { patients, casesSentToSenior } = useJuniorDoctorStore();

  const waitingPatients = patients.filter((p) => p.status === "Waiting");
  const activePatients = patients.filter((p) => p.status === "In Assessment");
  const completedPatients = patients.filter((p) => p.status === "Completed");

  // Get combined pending queue (Waiting + In Assessment)
  const pendingQueue = [...activePatients, ...waitingPatients];

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Title block */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-gray-200 pb-6 gap-4">
        <div>
          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-1">
            Clinical Console Dashboard
          </span>
          <h2 className="text-2xl font-bold text-gray-600 uppercase tracking-tight">
            Resident Control Center
          </h2>
          <p className="text-sm text-gray-400 mt-1 leading-normal">
            Manage your patient intake workflow, run diagnostic screening models, and transfer structured summaries.
          </p>
        </div>
        <div>
          <Link href="/junior-doctor/queue">
            <Button variant="primary" size="md" className="tracking-wider font-bold">
              VIEW WORKLIST QUEUE
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Stats Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border border-gray-300">
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
              Waiting Area
            </span>
            <p className="text-4xl font-bold text-clinical-amber leading-none">
              {waitingPatients.length}
            </p>
          </div>
        </Card>

        <Card className="border border-gray-300">
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
              In Assessment
            </span>
            <p className="text-4xl font-bold text-clinical-blue leading-none">
              {activePatients.length}
            </p>
          </div>
        </Card>

        <Card className="border border-gray-300">
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
              Specialist Handoffs
            </span>
            <p className="text-4xl font-bold text-clinical-green leading-none">
              {casesSentToSenior.length}
            </p>
          </div>
        </Card>

        <Card className="border border-gray-300">
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
              Completed Today
            </span>
            <p className="text-4xl font-bold text-gray-600 leading-none">
              {completedPatients.length}
            </p>
          </div>
        </Card>
      </div>

      {/* Table & Recent Activity Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Pending Cases Workspace List */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex justify-between items-center border-b border-gray-200 pb-3">
            <h3 className="font-bold text-base text-gray-600 uppercase tracking-wider">
              Pending Case Worklist
            </h3>
            <span className="text-xs bg-gray-100 text-gray-500 font-bold px-2 py-0.5 rounded">
              {pendingQueue.length} PATIENTS
            </span>
          </div>

          {pendingQueue.length === 0 ? (
            <div className="text-center py-12 text-gray-400 font-semibold border border-dashed border-gray-300 rounded bg-white uppercase tracking-wider">
              No patients assigned. Check reception database.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHeaderCell className="w-[80px]">Token</TableHeaderCell>
                  <TableHeaderCell className="w-[120px]">Patient Code</TableHeaderCell>
                  <TableHeaderCell>Name</TableHeaderCell>
                  <TableHeaderCell className="w-[100px]">Age/Sex</TableHeaderCell>
                  <TableHeaderCell>Acuity</TableHeaderCell>
                  <TableHeaderCell className="w-[140px]">Intake Status</TableHeaderCell>
                  <TableHeaderCell className="text-right w-[120px]">Actions</TableHeaderCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingQueue.map((patient) => (
                  <TableRow key={patient.id} className="group">
                    <TableCell className="font-bold text-clinical-blue">
                      #{patient.token}
                    </TableCell>
                    <TableCell className="font-mono text-xs font-bold text-gray-450">
                      {patient.code}
                    </TableCell>
                    <TableCell className="font-bold">
                      <Link href={`/junior-doctor/patient/${patient.id}`} className="hover:underline text-gray-600">
                        {patient.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {patient.age}Y / {patient.gender}
                    </TableCell>
                    <TableCell>
                      <RiskBadge acuity={patient.acuity} />
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] text-[10px] font-bold uppercase tracking-wider ${
                        patient.status === "Waiting" ? "bg-clinical-amber-light text-clinical-amber" :
                        "bg-clinical-blue-light text-clinical-blue"
                      }`}>
                        {patient.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/junior-doctor/patient/${patient.id}`}>
                        <Button variant="secondary" size="sm">
                          {patient.status === "In Assessment" ? "RESUME" : "ASSESS"}
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Right sidebar activity logs */}
        <div className="lg:col-span-4 space-y-6">
          <Card titleText="Supervisor Directives" className="border border-gray-300">
            <div className="space-y-4 text-xs font-semibold text-gray-650 leading-relaxed uppercase tracking-wider">
              <div className="border-l-[3px] border-clinical-blue bg-clinical-blue-light/20 p-3 rounded-[2px]">
                <span className="text-[10px] text-clinical-blue font-bold block mb-1">Dr. Alok Verma (Otology Specialist)</span>
                <p className="normal-case font-normal italic">&ldquo;Ensure all pediatric otology entries note tympanic drum mobility evaluations explicitly.&rdquo;</p>
              </div>
              <div className="border-l-[3px] border-clinical-amber bg-clinical-amber-light/20 p-3 rounded-[2px]">
                <span className="text-[10px] text-clinical-amber font-bold block mb-1">System Audit Flag</span>
                <p className="normal-case font-normal italic">&ldquo;Ensure patient vitals are fully loaded from physical triage desks before compilations.&rdquo;</p>
              </div>
            </div>
          </Card>

          <Card titleText="Recent Handoff Logs" className="border border-gray-300">
            {casesSentToSenior.length === 0 ? (
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider text-center py-6">
                No handoffs performed in this session.
              </p>
            ) : (
              <div className="space-y-3.5 max-h-[280px] overflow-y-auto pr-1">
                {casesSentToSenior.map((log, index) => {
                  const p = patients.find((pat) => pat.id === log.patientId);
                  return (
                    <div key={index} className="flex justify-between items-center text-xs border-b border-gray-150 pb-2.5 last:border-0 last:pb-0 font-semibold uppercase tracking-wider">
                      <div>
                        <span className="text-gray-600 block font-bold">{p ? p.name : "Patient ID " + log.patientId}</span>
                        <span className="text-[10px] text-gray-400 block mt-0.5">TRANSFERRED TO SPECIALIST</span>
                      </div>
                      <span className="text-[11px] text-clinical-green font-bold shrink-0">{log.timestamp}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
