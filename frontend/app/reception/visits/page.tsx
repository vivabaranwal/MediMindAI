"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Table, TableHeader, TableBody, TableRow, TableHeaderCell, TableCell } from "@/components/ui/Table";
import { Alert } from "@/components/ui/Alert";
import { Spinner } from "@/components/ui/LoadingState";
import { Input } from "@/components/ui/Input";
import { PrescriptionPrintSheet } from "@/components/senior-doctor/PrescriptionPrintSheet";
import apiClient from "@/services/apiClient";
import { toApiError } from "@/lib/errors";
import { toLocalIsoDate } from "@/lib/dates";

type Mode = "day" | "week" | "month" | "custom";

interface Visit {
  id: number;
  appointment_no: string;
  date: string;
  time: string;
  status: string;
  chief_complaint: string | null;
  patient: { id: number; name: string; patient_code: string | null; age: number | null; gender: string | null };
  doctor: { id: number | null; name: string | null; level: string | null };
  prescription: { id: number; approved_at: string | null } | null;
}

interface SignedPrescription {
  prescription_no: string;
  approved_at: string | null;
  followup_date: string | null;
  instructions: string | null;
  medicines: { name: string; dosage: string; frequency: string; duration: string; instructions?: string | null }[];
  diagnosis: string | null;
  chief_complaint: string | null;
  doctor_name: string | null;
  patient: { name: string; patient_code: string | null; age: number | null; gender: string | null; allergies: string[] };
}

// ---- local-date helpers (never go through UTC: a visit at 00:30 must stay on its own day)
const toIso = toLocalIsoDate;
const fromIso = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

function rangeFor(mode: Mode, anchor: string, customFrom: string, customTo: string): { from: string; to: string } {
  const d = fromIso(anchor);
  if (mode === "day") return { from: anchor, to: anchor };
  if (mode === "week") {
    const monday = addDays(d, -((d.getDay() + 6) % 7)); // weeks run Monday to Sunday
    return { from: toIso(monday), to: toIso(addDays(monday, 6)) };
  }
  if (mode === "month") {
    return { from: toIso(new Date(d.getFullYear(), d.getMonth(), 1)), to: toIso(new Date(d.getFullYear(), d.getMonth() + 1, 0)) };
  }
  return { from: customFrom, to: customTo };
}

function shift(mode: Mode, anchor: string, dir: 1 | -1): string {
  const d = fromIso(anchor);
  if (mode === "day") return toIso(addDays(d, dir));
  if (mode === "week") return toIso(addDays(d, 7 * dir));
  return toIso(new Date(d.getFullYear(), d.getMonth() + dir, 1));
}

const fmtDay = (iso: string) =>
  fromIso(iso).toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });

const STATUS_STYLE: Record<string, string> = {
  completed: "bg-clinical-green-light text-clinical-green",
  in_queue: "bg-clinical-blue-light text-clinical-blue",
  in_consultation: "bg-clinical-blue-light text-clinical-blue",
  booked: "bg-clinical-amber-light text-clinical-amber",
  confirmed: "bg-clinical-amber-light text-clinical-amber",
  cancelled: "bg-gray-100 text-gray-500",
  no_show: "bg-gray-100 text-gray-500",
};

export default function VisitHistoryPage() {
  const today = toIso(new Date());
  const [mode, setMode] = useState<Mode>("week");
  const [anchor, setAnchor] = useState(today);
  const [customFrom, setCustomFrom] = useState(today);
  const [customTo, setCustomTo] = useState(today);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");

  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [viewing, setViewing] = useState<SignedPrescription | null>(null);
  const [rxLoading, setRxLoading] = useState<number | null>(null);
  const [rxError, setRxError] = useState("");

  const { from, to } = useMemo(() => rangeFor(mode, anchor, customFrom, customTo), [mode, anchor, customFrom, customTo]);
  const rangeValid = !!from && !!to && from <= to;

  // Apply the search box after a short pause instead of on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => setQuery(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    if (!rangeValid) return;
    setLoading(true);
    setError("");
    try {
      const res = await apiClient.get("/appointments/history", { params: { from, to, q: query || undefined } });
      setVisits(res.data?.data ?? []);
    } catch (err) {
      setVisits([]);
      setError(toApiError(err, "Could not load the visit history.").message);
    } finally {
      setLoading(false);
    }
  }, [from, to, query, rangeValid]);

  useEffect(() => {
    void load();
  }, [load]);

  const byDate = useMemo(() => {
    const groups = new Map<string, Visit[]>();
    for (const v of visits) groups.set(v.date, [...(groups.get(v.date) ?? []), v]);
    return Array.from(groups.entries()); // the API already sends newest first
  }, [visits]);

  const uniquePatients = new Set(visits.map((v) => v.patient.id)).size;
  const signed = visits.filter((v) => v.prescription).length;

  const openPrescription = async (visit: Visit) => {
    setRxLoading(visit.id);
    setRxError("");
    try {
      const res = await apiClient.get(`/appointments/${visit.id}/prescription`);
      setViewing(res.data?.data ?? null);
    } catch (err) {
      setRxError(toApiError(err, "Could not load the prescription.").message);
    } finally {
      setRxLoading(null);
    }
  };

  const heading =
    mode === "day"
      ? fmtDay(from)
      : mode === "month"
        ? fromIso(from).toLocaleDateString("en-GB", { month: "long", year: "numeric" })
        : `${fmtDay(from)} to ${fmtDay(to)}`;

  const modes: { id: Mode; label: string }[] = [
    { id: "day", label: "DAY" },
    { id: "week", label: "WEEK" },
    { id: "month", label: "MONTH" },
    { id: "custom", label: "CUSTOM" },
  ];

  return (
    <>
      <div className="space-y-6 animate-fade-in-up print:hidden">
        <div>
          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest block mb-0.5">RECEPTION CORE</span>
          <h2 className="text-2xl font-bold text-gray-600 uppercase tracking-tight">Visit History</h2>
          <p className="text-xs text-gray-450 mt-1 leading-normal">
            See which patient visited when, by day, week or month, and open the signed prescription for any visit.
          </p>
        </div>

        <Card className="border border-gray-300">
          <div className="flex flex-col lg:flex-row lg:items-end gap-4 justify-between">
            <div className="flex flex-wrap items-center gap-2">
              {modes.map((m) => (
                <Button
                  key={m.id}
                  variant={mode === m.id ? "primary" : "secondary"}
                  onClick={() => setMode(m.id)}
                  className="text-xs font-bold tracking-wider"
                >
                  {m.label}
                </Button>
              ))}
            </div>

            {mode === "custom" ? (
              <div className="flex items-end gap-3">
                <Input label="From" type="date" value={customFrom} max={customTo} onChange={(e) => setCustomFrom(e.target.value)} />
                <Input label="To" type="date" value={customTo} min={customFrom} onChange={(e) => setCustomTo(e.target.value)} />
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Button variant="secondary" onClick={() => setAnchor(shift(mode, anchor, -1))} aria-label="Previous">
                  ←
                </Button>
                <Input type="date" value={anchor} onChange={(e) => e.target.value && setAnchor(e.target.value)} aria-label="Pick a date" />
                <Button variant="secondary" onClick={() => setAnchor(shift(mode, anchor, 1))} aria-label="Next">
                  →
                </Button>
                <Button variant="secondary" onClick={() => setAnchor(today)} className="text-xs font-bold tracking-wider">
                  TODAY
                </Button>
              </div>
            )}
          </div>

          <div className="mt-4 max-w-md">
            <Input
              label="Search patient"
              placeholder="Name or patient ID"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </Card>

        {mode === "custom" && !rangeValid && (
          <Alert type="warning" titleText="Check the dates">
            The &quot;To&quot; date must be on or after the &quot;From&quot; date.
          </Alert>
        )}
        {error && (
          <Alert type="error" titleText="Could not load visits">
            {error}
          </Alert>
        )}
        {rxError && (
          <Alert type="error" titleText="Prescription unavailable">
            {rxError}
          </Alert>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wider">{heading}</h3>
          <div className="flex gap-2 text-[11px] font-semibold uppercase tracking-wider">
            <span className="bg-clinical-blue-light text-clinical-blue px-3 py-1 rounded-[4px]">{visits.length} visits</span>
            <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-[4px]">{uniquePatients} patients</span>
            <span className="bg-clinical-green-light text-clinical-green px-3 py-1 rounded-[4px]">{signed} prescriptions</span>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        ) : byDate.length === 0 ? (
          !error && (
            <div className="text-center py-16 border border-dashed border-gray-300 rounded-[4px] text-sm text-gray-450 uppercase font-semibold tracking-wider">
              No visits in this period
            </div>
          )
        ) : (
          byDate.map(([date, rows]) => (
            <section key={date} className="space-y-2">
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                {fmtDay(date)} <span className="text-gray-400">· {rows.length} {rows.length === 1 ? "visit" : "visits"}</span>
              </h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHeaderCell className="w-[80px]">Time</TableHeaderCell>
                    <TableHeaderCell>Patient</TableHeaderCell>
                    <TableHeaderCell>Reason</TableHeaderCell>
                    <TableHeaderCell>Doctor</TableHeaderCell>
                    <TableHeaderCell className="w-[140px]">Status</TableHeaderCell>
                    <TableHeaderCell className="text-right w-[190px]">Prescription</TableHeaderCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((v) => (
                    <TableRow key={v.id}>
                      <TableCell className="font-mono text-xs font-bold text-gray-500">{v.time}</TableCell>
                      <TableCell className="font-bold">
                        <Link href={`/reception/patient/${v.patient.id}`} className="text-clinical-blue hover:text-clinical-blue-dark">
                          {v.patient.name}
                        </Link>
                        <span className="block text-[11px] font-normal text-gray-400">
                          {v.patient.patient_code} · {v.patient.age ?? "?"}Y / {v.patient.gender ?? "?"}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm">{v.chief_complaint || "Not recorded"}</TableCell>
                      <TableCell className="font-medium">{v.doctor.name || "Not assigned"}</TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex px-3 py-1 rounded-[4px] text-xs font-semibold uppercase tracking-wider ${
                            STATUS_STYLE[v.status] ?? "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {v.status.replace("_", " ")}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {v.prescription ? (
                          <Button
                            variant="secondary"
                            onClick={() => openPrescription(v)}
                            disabled={rxLoading === v.id}
                            className="text-xs font-bold tracking-wider"
                          >
                            {rxLoading === v.id ? "OPENING..." : "VIEW PRESCRIPTION"}
                          </Button>
                        ) : (
                          <span className="text-xs text-gray-400 uppercase font-semibold tracking-wider">None signed</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </section>
          ))
        )}
      </div>

      {viewing && (
        <div className="fixed inset-0 z-50 overflow-auto bg-gray-100 p-6 print:static print:overflow-visible print:bg-white print:p-0">
          <div className="w-fit max-w-full mx-auto flex items-center justify-between gap-6 mb-3 print:hidden">
            <h2 className="text-sm font-bold text-gray-600 uppercase tracking-wider">Prescription {viewing.prescription_no}</h2>
            <div className="flex gap-2">
              <Button variant="primary" onClick={() => window.print()} className="font-bold tracking-wider">
                PRINT PRESCRIPTION
              </Button>
              <Button variant="secondary" onClick={() => setViewing(null)} className="font-bold tracking-wider">
                CLOSE
              </Button>
            </div>
          </div>
          <div className="w-fit max-w-full overflow-x-auto mx-auto bg-white border border-gray-300 shadow-sm print:w-auto print:overflow-visible print:border-0 print:shadow-none">
            <PrescriptionPrintSheet
              patient={{
                code: viewing.patient.patient_code ?? "",
                name: viewing.patient.name,
                age: viewing.patient.age,
                gender: viewing.patient.gender ?? "",
                allergies: viewing.patient.allergies,
              }}
              prescription={{
                selectedDiagnosis: viewing.diagnosis ?? "",
                medications: viewing.medicines.map((m, i) => ({
                  id: String(i),
                  name: m.name,
                  dosage: m.dosage,
                  frequency: m.frequency,
                  duration: m.duration,
                  instructions: m.instructions ?? "",
                })),
              }}
              doctorName={viewing.doctor_name ?? "Prescribing doctor"}
              signedAt={viewing.approved_at}
              complaint={viewing.chief_complaint}
              rxNo={viewing.prescription_no}
              advice={viewing.instructions}
              followUp={viewing.followup_date ? fmtDay(viewing.followup_date) : null}
            />
          </div>
        </div>
      )}
    </>
  );
}
