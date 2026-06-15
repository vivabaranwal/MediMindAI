"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { 
  Table, TableHeader, TableBody, TableRow, TableHeaderCell, TableCell 
} from "@/components/ui/Table";

// Mock initial data
const initialQueue = [
  { id: 1, token: 101, code: "MM-2026-00045", name: "Ramesh Sharma", age: 45, gender: "Male", doctor: "Dr. Alok Verma (ENT)", status: "Waiting", triage: "amber" },
  { id: 2, token: 102, code: "MM-2026-00052", name: "Sunita Gupta", age: 38, gender: "Female", doctor: "Dr. Neha Shah (Otology)", status: "In Consultation", triage: "green" },
  { id: 3, token: 103, code: "MM-2026-00061", name: "Kabir Mehra", age: 29, gender: "Male", doctor: "Dr. Alok Verma (ENT)", status: "Waiting", triage: "red" },
  { id: 4, token: 104, code: "MM-2026-00072", name: "Ananya Deshmukh", age: 12, gender: "Female", doctor: "Dr. Neha Shah (Otology)", status: "Completed", triage: "green" },
  { id: 5, token: 105, code: "MM-2026-00084", name: "William D'Souza", age: 61, gender: "Male", doctor: "Dr. Alok Verma (ENT)", status: "Waiting", triage: "maroon" },
];

export default function ReceptionDashboard() {
  const [queue, setQueue] = useState(initialQueue);
  const [filter, setFilter] = useState("All");

  const sendToDoctor = (id: number) => {
    setQueue(prev =>
      prev.map(p => (p.id === id ? { ...p, status: "In Consultation" } : p))
    );
  };

  const filteredQueue = filter === "All" 
    ? queue 
    : queue.filter(p => p.status === filter);

  return (
    <div className="space-y-8">
      {/* Page Title & Navigation Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-gray-200 pb-6 gap-4">
        <div>
          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-1">
            Clinic Control Center
          </span>
          <h2 className="text-2xl font-bold text-gray-600 uppercase tracking-tight">
            Reception Dashboard
          </h2>
          <p className="text-sm text-gray-400 mt-1 leading-normal">
            Manage check-in queues, register new medical records, and assign specialist doctors.
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/reception/register">
            <Button variant="primary" size="md">
              Register Patient
            </Button>
          </Link>
          <Link href="/reception/search">
            <Button variant="secondary" size="md">
              Search Patient
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Stats Cards - Swiss layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border border-gray-300">
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
              In Clinic Queue
            </span>
            <p className="text-4xl font-bold text-gray-600 leading-none">
              {queue.length}
            </p>
          </div>
        </Card>

        <Card className="border border-gray-300">
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
              In Consultation
            </span>
            <p className="text-4xl font-bold text-clinical-blue leading-none">
              {queue.filter(p => p.status === "In Consultation").length}
            </p>
          </div>
        </Card>

        <Card className="border border-gray-300">
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
              Waiting Area
            </span>
            <p className="text-4xl font-bold text-clinical-amber leading-none">
              {queue.filter(p => p.status === "Waiting").length}
            </p>
          </div>
        </Card>

        <Card className="border border-gray-300">
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
              Completed Today
            </span>
            <p className="text-4xl font-bold text-clinical-green leading-none">
              {queue.filter(p => p.status === "Completed").length}
            </p>
          </div>
        </Card>
      </div>

      {/* Main Queue Management Section */}
      <div className="space-y-4">
        {/* Table Filter Controls */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-gray-200 pb-3 gap-4">
          <h3 className="font-bold text-base text-gray-600 uppercase tracking-wider">
            Patient Consultation Queue
          </h3>
          <div className="flex bg-gray-100 p-1 rounded border border-gray-200 text-xs font-semibold">
            {["All", "Waiting", "In Consultation", "Completed"].map(status => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded text-[11px] font-bold uppercase tracking-wider transition-all duration-150 ${
                  filter === status 
                    ? "bg-white text-clinical-blue" 
                    : "text-gray-500 hover:text-gray-600"
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* Patient Table */}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHeaderCell className="w-[100px]">Token</TableHeaderCell>
              <TableHeaderCell className="w-[150px]">Patient ID</TableHeaderCell>
              <TableHeaderCell>Name</TableHeaderCell>
              <TableHeaderCell className="w-[120px]">Age/Sex</TableHeaderCell>
              <TableHeaderCell>Assigned Doctor</TableHeaderCell>
              <TableHeaderCell className="w-[180px]">Status</TableHeaderCell>
              <TableHeaderCell className="text-right w-[150px]">Actions</TableHeaderCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredQueue.map(patient => (
              <TableRow key={patient.id} className="group">
                <TableCell className="font-bold text-clinical-blue">
                  #{patient.token}
                </TableCell>
                <TableCell className="font-mono text-xs font-bold text-gray-500">
                  {patient.code}
                </TableCell>
                <TableCell className="font-bold">
                  <Link href={`/reception/patient/${patient.id}`} className="text-clinical-blue hover:text-clinical-blue-dark">
                    {patient.name}
                  </Link>
                </TableCell>
                <TableCell>
                  {patient.age}Y / {patient.gender}
                </TableCell>
                <TableCell className="font-medium">
                  {patient.doctor}
                </TableCell>
                <TableCell>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-[4px] text-xs font-semibold uppercase tracking-wider ${
                    patient.status === "Waiting" ? "bg-clinical-amber-light text-clinical-amber" :
                    patient.status === "In Consultation" ? "bg-clinical-blue-light text-clinical-blue" :
                    "bg-clinical-green-light text-clinical-green"
                  }`}>
                    {patient.status}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    {patient.status === "Waiting" && (
                      <Button
                        onClick={() => sendToDoctor(patient.id)}
                        variant="primary"
                        size="sm"
                        className="px-3 min-w-0"
                        title="Send to Doctor"
                      >
                        Start Consult
                      </Button>
                    )}
                    <Link href={`/reception/patient/${patient.id}`}>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="px-3 min-w-0"
                      >
                        Details
                      </Button>
                    </Link>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {filteredQueue.length === 0 && (
          <div className="text-center py-12 text-gray-400 font-semibold border border-dashed border-gray-300 rounded-[4px] bg-white">
            No patients match the selected filter status.
          </div>
        )}
      </div>
    </div>
  );
}
