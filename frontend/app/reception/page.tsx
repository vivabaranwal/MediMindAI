"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { 
  Table, TableHeader, TableBody, TableRow, TableHeaderCell, TableCell 
} from "@/components/ui/Table";
import { Alert } from "@/components/ui/Alert";
import { Spinner } from "@/components/ui/LoadingState";
import apiClient from "@/services/apiClient";
import { DirectoryService } from "@/services/ai.service";
import { toApiError } from "@/lib/errors";
import { DoctorDto } from "@/types/ai";

interface QueueEntry {
  id: number;
  token: number;
  code: string;
  name: string;
  age: number | string;
  gender: string;
  doctor: string;
  status: string;
  triage: string;
}

interface AppointmentRecord {
  id: number;
  slot_token: number;
  patient_id: number;
  patient?: { patient_code?: string; name?: string; age?: number; gender?: string };
  status: string;
  triage_level?: string;
}

export default function ReceptionDashboard() {
  const [doctors, setDoctors] = useState<DoctorDto[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<number | null>(null);
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [filter, setFilter] = useState("All");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const fetchQueue = async (doctorId: number) => {
    const doctorLabel = doctors.find((d) => d.id === doctorId)?.name ?? "";
    setIsLoading(true);
    setErrorMsg("");
    try {
      const res = await apiClient.get("/appointments/queue", {
        params: { doctor_id: doctorId }
      });
      const data = res.data;
      if (data.success && Array.isArray(data.data)) {
        // Map backend appointments to the UI format
        const mappedQueue = data.data.map((appt: AppointmentRecord) => {
          let uiStatus = "Waiting";
          if (appt.status === "in_consultation") uiStatus = "In Consultation";
          if (appt.status === "completed") uiStatus = "Completed";
          if (appt.status === "cancelled") uiStatus = "Cancelled";

          return {
            id: appt.id,
            token: appt.slot_token,
            code: appt.patient?.patient_code || `PT-${appt.patient_id}`,
            name: appt.patient?.name || "Unknown Patient",
            age: appt.patient?.age || "--",
            gender: appt.patient?.gender || "Other",
            doctor: doctorLabel,
            status: uiStatus,
            triage: appt.triage_level || "green"
          };
        });
        setQueue(mappedQueue);
      }
    } catch (err) {
      setErrorMsg(toApiError(err, "Failed to load clinic queue.").message);
    } finally {
      setIsLoading(false);
    }
  };

  // Load the real doctor list once, and start on the first doctor.
  useEffect(() => {
    DirectoryService.doctors("junior")
      .then((list) => {
        setDoctors(list);
        setSelectedDoctorId(list[0]?.id ?? null);
        if (list.length === 0) setIsLoading(false);
      })
      .catch((err) => {
        setErrorMsg(toApiError(err, "Failed to load the doctor list.").message);
        setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    if (selectedDoctorId !== null) fetchQueue(selectedDoctorId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDoctorId, doctors]);

  const sendToDoctor = async (id: number) => {
    try {
      await apiClient.patch(`/appointments/${id}/status`, {
        status: "in_consultation"
      });
      if (selectedDoctorId !== null) fetchQueue(selectedDoctorId);
    } catch (err) {
      setErrorMsg(toApiError(err, "Failed to start the consultation.").message);
    }
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

      {/* Doctor Selector Card */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-gray-50 border border-gray-300 p-4 rounded-[4px]">
        <div className="flex items-center gap-3">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-clinical-blue animate-pulse" />
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
            Consultation Queue Monitor
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Active Queue:</span>
          <select
            value={selectedDoctorId ?? ""}
            onChange={(e) => setSelectedDoctorId(parseInt(e.target.value, 10))}
            className="bg-white border border-gray-300 text-xs font-bold uppercase rounded p-2 focus:outline-none focus:border-clinical-blue tracking-wider"
          >
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
                {d.specialization ? ` (${d.specialization})` : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Error Message Banner */}
      {errorMsg && (
        <Alert type="error" titleText="Queue Query Failure">
          {errorMsg}
        </Alert>
      )}

      {/* KPI Stats Cards */}
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
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <Spinner />
          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
            Fetching latest queue sorting from clinic core...
          </span>
        </div>
      ) : (
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
      )}
    </div>
  );
}
