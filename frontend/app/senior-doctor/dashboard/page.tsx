"use client";

import React from "react";
import Link from "next/link";
import { useSeniorDoctorStore } from "@/store/seniorDoctorStore";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Table, TableHeader, TableBody, TableRow, TableHeaderCell, TableCell } from "@/components/ui/Table";
import { RiskBadge } from "@/components/senior-doctor/RiskBadge";

export default function SeniorDoctorDashboard() {
  const { patients } = useSeniorDoctorStore();

  const waitingList = patients.filter((p) => p.status === "Waiting");
  const reviewList = patients.filter((p) => p.status === "In Review");
  const completedList = patients.filter((p) => p.status === "Completed");
  const urgentList = patients.filter(
    (p) => p.status !== "Completed" && (p.acuity === "high acuity" || p.acuity === "emergent acuity")
  );

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Title Block */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-gray-200 pb-6 gap-4">
        <div>
          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-1">
            Clinical Decision Support Center
          </span>
          <h2 className="text-2xl font-bold text-gray-600 uppercase tracking-tight">
            Consultant Command Console
          </h2>
          <p className="text-sm text-gray-400 mt-1 leading-normal">
            Review AI diagnostics proposals, verify clinical SOAP briefs, authorize prescriptions, and close patient files.
          </p>
        </div>
        <div>
          <Link href="/senior-doctor/queue">
            <Button variant="primary" size="md" className="tracking-wider font-bold">
              VIEW WORKLIST QUEUE
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border border-gray-300">
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
              Waiting for Review
            </span>
            <p className="text-4xl font-bold text-clinical-amber leading-none">
              {waitingList.length}
            </p>
          </div>
        </Card>

        <Card className="border border-gray-300">
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
              Active In Review
            </span>
            <p className="text-4xl font-bold text-clinical-blue leading-none">
              {reviewList.length}
            </p>
          </div>
        </Card>

        <Card className="border border-gray-300 bg-clinical-red-light/5 border-clinical-red/35">
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-clinical-red uppercase tracking-wider block">
              Urgent Critical Cases
            </span>
            <p className="text-4xl font-bold text-clinical-red leading-none">
              {urgentList.length}
            </p>
          </div>
        </Card>

        <Card className="border border-gray-300">
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
              Consultations Signed
            </span>
            <p className="text-4xl font-bold text-clinical-green leading-none">
              {completedList.length}
            </p>
          </div>
        </Card>
      </div>

      {/* Split Lists Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Urgent Attention Worklist (8 columns) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex justify-between items-center border-b border-gray-200 pb-3">
            <h3 className="font-bold text-base text-gray-600 uppercase tracking-wider">
              Urgent Review Actions Required
            </h3>
            <span className="bg-clinical-red text-white text-[10px] font-bold px-2 py-0.5 rounded">
              CRITICAL DEMAND
            </span>
          </div>

          {urgentList.length === 0 ? (
            <div className="text-center py-12 text-gray-400 font-semibold border border-dashed border-gray-300 bg-white rounded uppercase tracking-wider">
              No critical or emergent cases in queue.
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
                  <TableHeaderCell className="w-[120px]">Workflow Status</TableHeaderCell>
                  <TableHeaderCell className="text-right w-[120px]">Actions</TableHeaderCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {urgentList.map((patient) => (
                  <TableRow key={patient.id}>
                    <TableCell className="font-bold text-clinical-blue">#{patient.token}</TableCell>
                    <TableCell className="font-mono text-xs font-bold text-gray-450">{patient.code}</TableCell>
                    <TableCell className="font-bold">
                      <Link href={`/senior-doctor/patient/${patient.id}`} className="hover:underline">
                        {patient.name}
                      </Link>
                    </TableCell>
                    <TableCell>{patient.age}Y / {patient.gender}</TableCell>
                    <TableCell>
                      <RiskBadge acuity={patient.acuity} />
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-[4px] text-[10px] font-bold uppercase tracking-wider ${
                        patient.status === "Waiting" ? "bg-clinical-amber-light text-clinical-amber" :
                        "bg-clinical-blue-light text-clinical-blue"
                      }`}>
                        {patient.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/senior-doctor/patient/${patient.id}`}>
                        <Button variant="secondary" size="sm" className="font-bold">
                          OPEN REVIEW
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Clinical Alerts Panel (4 columns) */}
        <div className="lg:col-span-4 space-y-6">
          <Card titleText="COHORT WARNING ALERTS" className="border border-gray-300">
            <div className="space-y-4 text-xs font-semibold text-gray-650 leading-relaxed uppercase tracking-wider">
              <div className="border-l-[3px] border-clinical-red bg-clinical-red-light/20 p-3 rounded-[2px]">
                <span className="text-[10px] text-clinical-red font-bold block mb-1">Mastoiditis Alert</span>
                <p className="normal-case font-normal italic">&ldquo;Patient William D&apos;Souza has severe mastoid opacification. Immediate surgical consult indicated.&rdquo;</p>
              </div>

              <div className="border-l-[3px] border-clinical-amber bg-clinical-amber-light/20 p-3 rounded-[2px]">
                <span className="text-[10px] text-clinical-amber font-bold block mb-1">Allergy Sensitivity warning</span>
                <p className="normal-case font-normal italic">&ldquo;Patient Kabir Mehra is penicillin allergic. Use caution in prescribing standard augmentin regimens.&rdquo;</p>
              </div>
            </div>
          </Card>

          <Card titleText="RECENT REVIEW LOGS" className="border border-gray-300">
            {completedList.length === 0 ? (
              <p className="text-xs text-gray-450 font-semibold uppercase tracking-wider text-center py-6">
                No closed consultations today.
              </p>
            ) : (
              <div className="space-y-3 font-semibold uppercase tracking-wider text-xs">
                {completedList.map((p) => (
                  <div key={p.id} className="flex justify-between items-center border-b border-gray-150 pb-2.5 last:border-0 last:pb-0">
                    <div>
                      <span className="text-gray-600 font-bold block">{p.name}</span>
                      <span className="text-[9px] text-gray-400 block mt-0.5">{p.code} • Closed</span>
                    </div>
                    <span className="bg-clinical-green-light text-clinical-green font-bold text-[9px] px-2 py-0.5 rounded">
                      COMPLETED
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
