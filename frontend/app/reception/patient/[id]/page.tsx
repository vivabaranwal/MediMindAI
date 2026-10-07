"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
import { Alert } from "@/components/ui/Alert";
import { Modal } from "@/components/ui/Modal";
import { Spinner } from "@/components/ui/LoadingState";
import apiClient from "@/services/apiClient";
import { AiService } from "@/services/ai.service";
import { toLocalIsoDate } from "@/lib/dates";
import { toApiError } from "@/lib/errors";
import { ReportDto } from "@/types/ai";

interface PatientData {
  id: number;
  patient_code: string;
  name: string;
  age: number | null;
  gender: string | null;
  mobile: string;
  email: string | null;
  address: string | null;
  blood_group: string | null;
  abha_id: string | null;
  emergency_contact_name: string | null;
  emergency_contact_mobile: string | null;
  allergies: { allergen: string; reaction: string | null; severity: string | null }[];
  medical_history: string[] | null;
  current_medications: string[] | null;
  ai_consent: boolean;
  data_consent: boolean;
}

type ReportRow = ReportDto & { file_size: number | null };

const REPORT_LABELS: Record<string, string> = {
  audiogram: "Audiogram",
  blood_test: "Blood Test",
  ct_scan: "CT Scan",
  xray: "X-Ray",
  prescription: "Prescription",
  other: "Other Report",
};

const STATUS: Record<ReportDto["status"], { label: string; variant: "blue" | "green" | "red" | "amber" | "gray" }> = {
  pending_analysis: { label: "Queued", variant: "gray" },
  analyzing: { label: "Analysing…", variant: "blue" },
  analyzed: { label: "Analysed", variant: "green" },
  failed: { label: "Analysis failed", variant: "red" },
  not_analyzed: { label: "Not analysed", variant: "amber" },
};

const ERROR_TEXT: Record<string, string> = {
  ai_consent_required: "Not analysed because the patient has not consented to AI-assisted processing.",
  ocr_failed: "No readable text could be extracted from this file.",
  ai_unavailable: "The AI service was unavailable. Use Re-analyse to try again.",
  file_missing: "The stored file could not be found.",
};

const WARNING_TEXT: Record<string, string> = {
  patient_name_mismatch: "The name on this report does not match this patient. Check it was attached to the right record.",
  low_confidence_ocr: "Some pages were hard to read. Verify values against the original.",
};

const formatSize = (bytes: number | null) => (bytes === null ? "" : bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`);
const splitList = (text: string) => text.split(/[,\n;]/).map((t) => t.trim()).filter(Boolean);
const isBusy = (r: ReportRow) => r.status === "pending_analysis" || r.status === "analyzing";

export default function PatientProfile() {
  const params = useParams();
  const patientId = String(params?.id ?? "");

  const [patient, setPatient] = useState<PatientData | null>(null);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedType, setSelectedType] = useState("audiogram");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [complaint, setComplaint] = useState("");
  const [queuing, setQueuing] = useState(false);
  const [queueSuccess, setQueueSuccess] = useState(false);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ allergies: "", history: "", meds: "" });
  const [saving, setSaving] = useState(false);

  const loadPatient = useCallback(async () => {
    const res = await apiClient.get(`/patients/${patientId}`);
    setPatient(res.data.data);
  }, [patientId]);

  const loadReports = useCallback(async () => {
    const res = await apiClient.get("/reports", { params: { patient_id: patientId } });
    setReports(res.data?.data ?? []);
  }, [patientId]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        await Promise.all([loadPatient(), loadReports()]);
      } catch (err) {
        if (active) setError(toApiError(err, "Failed to load the patient record.").message);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [loadPatient, loadReports]);

  // Analysis runs in the background: poll while any report is still being processed.
  const anyBusy = reports.some(isBusy);
  useEffect(() => {
    if (!anyBusy) return;
    const timer = setInterval(() => {
      loadReports().catch(() => undefined);
    }, 4000);
    return () => clearInterval(timer);
  }, [anyBusy, loadReports]);

  const run = async (fn: () => Promise<void>, fallback: string) => {
    setActionError(null);
    try {
      await fn();
    } catch (err) {
      setActionError(toApiError(err, fallback).message);
    }
  };

  // ---------------------------------------------------------------- consent

  const toggleAiConsent = () =>
    run(async () => {
      if (!patient) return;
      const grant = !patient.ai_consent;
      const ok = window.confirm(
        grant
          ? "Confirm that the patient has agreed to AI-assisted processing of their data (intake questions, summaries, report reading and chat)."
          : "Withdraw this patient's consent to AI-assisted processing? AI features will stop for this patient.",
      );
      if (!ok) return;
      await apiClient.post(`/patients/${patient.id}/consents`, { consented: grant });
      await loadPatient();
    }, "Could not update consent.");

  // ------------------------------------------------------- medical background

  const openEditor = () => {
    if (!patient) return;
    setDraft({
      allergies: patient.allergies.map((a) => a.allergen).join(", "),
      history: (patient.medical_history ?? []).join(", "),
      meds: (patient.current_medications ?? []).join(", "),
    });
    setEditing(true);
  };

  const saveBackground = () =>
    run(async () => {
      if (!patient) return;
      setSaving(true);
      try {
        const existing = new Map(patient.allergies.map((a) => [a.allergen.toLowerCase(), a]));
        await apiClient.put(`/patients/${patient.id}`, {
          allergies: splitList(draft.allergies).map((name) => {
            const prev = existing.get(name.toLowerCase());
            return { allergen: name, reaction: prev?.reaction ?? null, severity: prev?.severity ?? null };
          }),
          medical_history: splitList(draft.history),
          current_medications: splitList(draft.meds),
        });
        await loadPatient();
        setEditing(false);
      } finally {
        setSaving(false);
      }
    }, "Could not save the medical background.");

  // ---------------------------------------------------------------- reports

  const uploadReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;
    setUploading(true);
    setUploadProgress(0);
    await run(async () => {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("patient_id", patientId);
      formData.append("report_type", selectedType);
      await apiClient.post("/reports/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (p) => p.total && setUploadProgress(Math.round((p.loaded * 100) / p.total)),
      });
      setSelectedFile(null);
      await loadReports(); // shows the new report as "Queued"; polling follows its analysis
    }, "Failed to upload the file.");
    setUploading(false);
    setUploadProgress(0);
  };

  const deleteReport = (r: ReportRow) =>
    run(async () => {
      if (!window.confirm(`Permanently delete "${r.file_name}"? This also removes it from the AI search index and cannot be undone.`)) return;
      await apiClient.delete(`/reports/${r.id}`);
      await loadReports();
    }, "Could not delete the report.");

  const reanalyse = (r: ReportRow) =>
    run(async () => {
      await AiService.reanalyzeReport(r.id);
      await loadReports();
    }, "Could not restart the analysis.");

  // ------------------------------------------------------------------ queue

  const handleQueueSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!complaint.trim()) return;
    setQueuing(true);
    await run(async () => {
      const now = new Date();
      await apiClient.post("/appointments", {
        patient_id: Number(patientId),
        appointment_date: toLocalIsoDate(now),
        appointment_time: now.toTimeString().slice(0, 5),
        type: "walk_in",
        triage_level: "green",
        chief_complaint: complaint.trim(),
      });
      setComplaint("");
      setQueueSuccess(true);
      setTimeout(() => setQueueSuccess(false), 3000);
    }, "Failed to send the patient to the queue.");
    setQueuing(false);
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4 max-w-md mx-auto text-center">
        <h3 className="text-lg font-bold text-gray-800">Error Loading Patient Record</h3>
        <p className="text-sm text-gray-500">{error}</p>
        <Link href="/reception">
          <Button variant="secondary" size="sm" className="mt-4">
            Back to Registry
          </Button>
        </Link>
      </div>
    );
  }

  if (loading || !patient) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <Spinner />
        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Loading Patient Profile...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="border-b border-gray-200 pb-6 mb-6 flex justify-between items-end">
        <div>
          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-1">Registry Dossier</span>
          <h2 className="text-2xl font-bold text-gray-650 tracking-tight leading-none uppercase">Patient Record Viewer</h2>
        </div>
        <Link href="/reception">
          <Button variant="secondary" size="sm">
            Back to Registry
          </Button>
        </Link>
      </div>

      {actionError && (
        <Alert type="error" titleText="Action failed">
          {actionError}
        </Alert>
      )}

      <Card className="border border-gray-300 p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-[4px] bg-gray-100 border border-gray-300 flex items-center justify-center text-gray-600 font-bold text-2xl shrink-0">
            {patient.name.charAt(0)}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-2xl font-bold text-gray-605">{patient.name}</h2>
              <span className="text-xs bg-gray-100 border border-gray-300 px-3 py-1 rounded-[4px] text-gray-500 font-bold font-mono uppercase tracking-wider">
                {patient.patient_code}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-2 font-medium">
              {patient.age ?? "—"} YEARS OLD • {patient.gender ?? "—"} • BLOOD GROUP:{" "}
              <span className="text-clinical-blue font-bold">{patient.blood_group ?? "Unknown"}</span>
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 w-full md:w-auto text-xs font-bold uppercase tracking-wider">
          <div className={`px-4 py-2 rounded-[4px] border ${patient.data_consent ? "bg-[#F0F8F4] text-clinical-green border-clinical-green/20" : "bg-clinical-amber-light text-clinical-amber border-clinical-amber/20"}`}>
            Records consent: {patient.data_consent ? "on file" : "not recorded"}
          </div>
          <div className={`px-4 py-2 rounded-[4px] border flex items-center justify-between gap-4 ${patient.ai_consent ? "bg-[#F0F8F4] text-clinical-green border-clinical-green/20" : "bg-gray-50 text-gray-500 border-gray-300"}`}>
            <span>AI processing: {patient.ai_consent ? "consented" : "not consented"}</span>
            <button type="button" onClick={toggleAiConsent} className="underline underline-offset-2 text-clinical-blue">
              {patient.ai_consent ? "Withdraw" : "Record consent"}
            </button>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <Card titleText="Patient Dossier" className="border border-gray-300">
            <div className="space-y-4 text-sm text-gray-600">
              {[
                ["Mobile Number", patient.mobile],
                ["Email", patient.email || "Not provided"],
                ["Address", patient.address || "Not provided"],
                ["ABHA Health ID", patient.abha_id || "Not linked"],
              ].map(([label, value]) => (
                <div key={label} className="space-y-1">
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">{label}</span>
                  <span className="font-semibold text-gray-600">{value}</span>
                </div>
              ))}
              <div className="pt-4 border-t border-gray-200 space-y-2">
                <span className="text-[10px] text-clinical-red font-bold uppercase tracking-wider block">Emergency Contact</span>
                <p className="text-sm font-semibold text-gray-600">{patient.emergency_contact_name || "Not recorded"}</p>
                <p className="text-xs text-gray-500 font-medium">{patient.emergency_contact_mobile || ""}</p>
              </div>
            </div>
          </Card>

          <Card titleText="Medical Background" className="border border-gray-300">
            <div className="space-y-4 text-sm text-gray-600">
              <div className="space-y-1">
                <span className="text-[10px] text-clinical-red font-bold uppercase tracking-wider block">Allergies</span>
                {patient.allergies.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {patient.allergies.map((a) => (
                      <span key={a.allergen} className="bg-clinical-red-light text-clinical-red px-2 py-0.5 rounded text-[11px] font-bold">
                        {a.allergen}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-gray-450 text-xs">None recorded</span>
                )}
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Existing conditions</span>
                <span className="font-semibold text-gray-600">{(patient.medical_history ?? []).join(", ") || "None recorded"}</span>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Current medications</span>
                <span className="font-semibold text-gray-600">{(patient.current_medications ?? []).join(", ") || "None recorded"}</span>
              </div>
              <Button variant="secondary" size="sm" onClick={openEditor}>
                Edit
              </Button>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-8">
          <Card titleText="Encounter Queue Dispatch" className="border border-gray-300">
            <p className="text-xs text-gray-450 mt-1 leading-normal mb-4">Add the patient to today&apos;s intake queue. The junior doctor assesses first and then chooses the senior doctor.</p>

            {queueSuccess && (
              <Alert type="success" titleText="Patient Queued" className="mb-4">
                The patient is now in the junior doctor&apos;s queue.
              </Alert>
            )}

            <form onSubmit={handleQueueSubmit} className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4 items-end">
                <div className="flex-1 w-full flex flex-col space-y-2 text-left">
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Reason for visit</label>
                  <input
                    value={complaint}
                    onChange={(e) => setComplaint(e.target.value)}
                    required
                    maxLength={500}
                    placeholder="e.g. Ear pain for 3 days"
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded text-base focus:outline-none focus:border-clinical-blue"
                  />
                </div>
              </div>
              <Button type="submit" variant="primary" disabled={queuing || !complaint.trim()}>
                {queuing ? "Queuing..." : "Send to Junior Doctor"}
              </Button>
            </form>
          </Card>

          <Card titleText="Patient Diagnostic Records" className="border border-gray-300">
            <p className="text-xs text-gray-450 mt-1 leading-normal mb-4">
              Uploaded reports are read automatically (OCR where needed) and summarised for the doctor. This runs only if the patient has consented to AI processing.
            </p>

            <form onSubmit={uploadReport} className="bg-gray-50 p-6 rounded-[4px] border border-gray-250 flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-1 w-full space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Select label="Report Type" value={selectedType} onChange={(e) => setSelectedType(e.target.value)}>
                    {Object.entries(REPORT_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Select>

                  <div className="flex flex-col space-y-2 text-left w-full">
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Select File</label>
                    <input
                      type="file"
                      id="reportFile"
                      accept=".pdf,.jpg,.jpeg,.png,.tif,.tiff"
                      onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
                      className="hidden"
                    />
                    <label
                      htmlFor="reportFile"
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded text-base text-gray-400 flex items-center justify-between cursor-pointer hover:border-gray-400"
                    >
                      <span className="truncate max-w-[150px]">{selectedFile?.name || "Choose PDF/Image..."}</span>
                      <span className="text-xs text-clinical-blue font-bold uppercase tracking-wider">Browse</span>
                    </label>
                  </div>
                </div>

                {uploading && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      <span>Uploading…</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-clinical-blue transition-all duration-200" style={{ width: `${uploadProgress}%` }} />
                    </div>
                  </div>
                )}
              </div>

              <Button type="submit" variant="secondary" disabled={uploading || !selectedFile} className="w-full md:w-auto shrink-0 mb-0.5">
                Upload File
              </Button>
            </form>

            <div className="space-y-4 mt-6">
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Uploaded Files ({reports.length})</span>

              {reports.map((report) => {
                const status = STATUS[report.status];
                return (
                  <div key={report.id} className="p-4 rounded-[4px] bg-gray-50 border border-gray-250 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-3 flex-wrap">
                        <Badge variant="blue">{REPORT_LABELS[report.report_type] ?? report.report_type}</Badge>
                        <h4 className="font-bold text-gray-600 text-sm">{report.file_name}</h4>
                        <span className="text-xs text-gray-450 font-medium">{formatSize(report.file_size)}</span>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </div>

                      {report.ai_findings?.warnings.map((w) => (
                        <p key={w} className="text-xs text-clinical-amber font-semibold">
                          ⚠ {WARNING_TEXT[w] ?? w}
                        </p>
                      ))}

                      {report.status === "analyzed" && report.ai_summary && (
                        <p className="text-xs text-gray-500 bg-white p-3 rounded border border-gray-200 leading-relaxed">{report.ai_summary}</p>
                      )}
                      {report.analysis_error && (
                        <p className="text-xs text-gray-500">{ERROR_TEXT[report.analysis_error] ?? "This report could not be analysed."}</p>
                      )}
                    </div>

                    <div className="flex gap-2 shrink-0 self-end md:self-auto">
                      <Button onClick={() => reanalyse(report)} variant="secondary" size="sm" disabled={isBusy(report)} className="px-3 min-w-0">
                        Re-analyse
                      </Button>
                      <Button onClick={() => deleteReport(report)} variant="danger" size="sm" className="px-3 min-w-0">
                        Delete
                      </Button>
                    </div>
                  </div>
                );
              })}

              {reports.length === 0 && <div className="text-center py-8 text-gray-450 text-xs font-semibold">No diagnostic reports uploaded yet.</div>}
            </div>
          </Card>
        </div>
      </div>

      <Modal
        isOpen={editing}
        onClose={() => setEditing(false)}
        titleText="Edit Medical Background"
        footerActions={
          <>
            <Button variant="secondary" onClick={() => setEditing(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={saveBackground} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </>
        }
      >
        <div className="space-y-4 text-left">
          {(
            [
              ["allergies", "Allergies", "e.g. Penicillin, Sulfa"],
              ["history", "Existing conditions", "e.g. Asthma, Diabetes"],
              ["meds", "Current medications", "e.g. Metformin 500mg"],
            ] as const
          ).map(([key, label, placeholder]) => (
            <div key={key} className="space-y-2">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block">{label} (comma separated)</label>
              <input
                value={draft[key]}
                onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
                placeholder={placeholder}
                className="w-full text-sm text-gray-650 bg-white border border-gray-300 rounded px-3 py-2.5 focus:outline-none focus:border-clinical-blue"
              />
            </div>
          ))}
          <p className="text-[11px] text-gray-400 normal-case">
            Allergies drive the drug-allergy safety check on every prescription. Saving replaces the existing lists.
          </p>
        </div>
      </Modal>
    </div>
  );
}
