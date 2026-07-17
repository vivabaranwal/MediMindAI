"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
import { Alert } from "@/components/ui/Alert";
import { Modal } from "@/components/ui/Modal";
import { useSeniorDoctorStore } from "@/store/seniorDoctorStore";
import { Spinner } from "@/components/ui/LoadingState";
import apiClient from "@/services/apiClient";

interface PatientProfileData {
  id: number;
  code: string;
  name: string;
  age: number;
  gender: string;
  mobile: string;
  email: string;
  address: string;
  blood_group: string;
  abha_id: string;
  emergency_name: string;
  emergency_mobile: string;
  consent: boolean;
}

interface UploadedReportData {
  id: number;
  name: string;
  type: string;
  size: string;
  uploadedAt: string;
  summary: string;
}

export default function PatientProfile() {
  const params = useParams();
  const patientId = (params?.id as string) || "1";

  // Senior Doctor store — for post-sign visibility
  const { soapNotes, prescriptions } = useSeniorDoctorStore();
  const numericId = Number(patientId);
  const soapNote = soapNotes[numericId];
  const prescription = prescriptions[numericId];
  const soapApproved = soapNote?.status === "approved";
  const rxApproved = prescription?.status === "approved";

  // States
  const [patient, setPatient] = useState<PatientProfileData | null>(null);
  const [isLoadingPatient, setIsLoadingPatient] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reports, setReports] = useState<UploadedReportData[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedType, setSelectedType] = useState("Audiogram");
  const [fileName, setFileName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [queuing, setQueuing] = useState(false);
  const [queueSuccess, setQueueSuccess] = useState(false);

  // Modal state for signed records
  const [showSoap, setShowSoap] = useState(false);
  const [showRx, setShowRx] = useState(false);

  useEffect(() => {
    let active = true;
    const loadData = async () => {
      try {
        setIsLoadingPatient(true);
        const [resPat, resRep] = await Promise.all([
          apiClient.get(`/patients/${patientId}`),
          apiClient.get(`/reports`, { params: { patient_id: patientId } })
        ]);

        if (active) {
          if (resPat.data?.success && resPat.data?.data) {
            const apiPat = resPat.data.data;
            setPatient({
              id: apiPat.id,
              code: apiPat.patient_code || `MM-2026-${String(apiPat.id).padStart(5, "0")}`,
              name: apiPat.name,
              age: apiPat.age || 0,
              gender: apiPat.gender || "Other",
              mobile: apiPat.mobile || "",
              email: apiPat.email || "",
              address: apiPat.address || "",
              blood_group: apiPat.blood_group || "Unknown",
              abha_id: apiPat.abha_id || "",
              emergency_name: apiPat.emergency_contact_name || "None",
              emergency_mobile: apiPat.emergency_contact_mobile || "",
              consent: true
            });
          }
          if (resRep.data?.success && Array.isArray(resRep.data?.data)) {
            const mapped = resRep.data.data.map((r: { id: number; file_name: string; report_type: string; created_at: string; ocr_summary?: string }) => {
              let displayType = "Other Report";
              if (r.report_type === "audiogram") displayType = "Audiogram";
              else if (r.report_type === "blood_test") displayType = "Blood Test";
              else if (r.report_type === "ct_scan") displayType = "CT Scan";
              else if (r.report_type === "xray") displayType = "X-Ray";

              return {
                id: r.id,
                name: r.file_name,
                type: displayType,
                size: "1.2 MB",
                uploadedAt: new Date(r.created_at).toISOString().split("T")[0],
                summary: r.ocr_summary || "Document registered in database. AI processing pending."
              };
            });
            setReports(mapped);
          }
        }
      } catch (err: unknown) {
        console.error("Failed to load patient profile data:", err);
        setError("Failed to load patient profile data. The record may not exist or the server is unreachable.");
      } finally {
        if (active) {
          setIsLoadingPatient(false);
        }
      }
    };
    loadData();
    return () => {
      active = false;
    };
  }, [patientId]);

  // File Upload Handlers
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFileName(file.name);
      setSelectedFile(file);
    }
  };

  const uploadReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setUploading(true);
    setUploadProgress(10);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("patient_id", patientId);

      let typeCode = "other";
      if (selectedType === "Audiogram") typeCode = "audiogram";
      else if (selectedType === "Blood Test") typeCode = "blood_test";
      else if (selectedType === "CT Scan") typeCode = "ct_scan";
      else if (selectedType === "X-Ray") typeCode = "xray";

      formData.append("report_type", typeCode);

      setUploadProgress(30);

      const res = await apiClient.post("/reports/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data"
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(percent);
          }
        }
      });

      setUploadProgress(100);

      if (res.data?.success && res.data?.data) {
        const r = res.data.data;
        const newReport = {
          id: r.id,
          name: r.file_name,
          type: selectedType,
          size: "1.4 MB",
          uploadedAt: new Date(r.created_at).toISOString().split("T")[0],
          summary: r.ocr_summary || "Processing completed. Document registered in database."
        };
        setReports(prev => [newReport, ...prev]);
      }

      setFileName("");
      setSelectedFile(null);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      alert(e.response?.data?.message || e.message || "Failed to upload file.");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const deleteReport = (id: number) => {
    setReports(prev => prev.filter(r => r.id !== id));
  };

  // Queue Handlers
  const handleQueueSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctor) return;

    setQueuing(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      const nowTime = new Date().toTimeString().slice(0, 5); // "HH:MM"

      await apiClient.post("/appointments", {
        patient_id: Number(patientId),
        doctor_id: Number(selectedDoctor),
        appointment_date: today,
        appointment_time: nowTime,
        type: "walk_in",
        triage_level: "green",
        chief_complaint: "Routine Consultation",
        notes: "Queued via Registry Dossier"
      });

      setQueueSuccess(true);
      setTimeout(() => setQueueSuccess(false), 3000);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      alert(e.response?.data?.message || e.message || "Failed to dispatch patient to queue.");
    } finally {
      setQueuing(false);
    }
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4 max-w-md mx-auto text-center">
        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-650 mb-2 text-xl font-bold">
          ⚠️
        </div>
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

  if (isLoadingPatient || !patient) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <Spinner />
        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
          Loading Patient Profile...
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Structural Page Header */}
      <div className="border-b border-gray-200 pb-6 mb-6 flex justify-between items-end">
        <div>
          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-1">
            Registry Dossier
          </span>
          <h2 className="text-2xl font-bold text-gray-650 tracking-tight leading-none uppercase">
            Patient Record Viewer
          </h2>
        </div>
        <Link href="/reception">
          <Button variant="secondary" size="sm">
            Back to Registry
          </Button>
        </Link>
      </div>

      {/* Patient Header Card */}
      <Card className="border border-gray-300 p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-[4px] bg-gray-100 border border-gray-300 flex items-center justify-center text-gray-600 font-bold text-2xl shrink-0">
            {patient.name.charAt(0)}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-2xl font-bold text-gray-605">{patient.name}</h2>
              <span className="text-xs bg-gray-100 border border-gray-300 px-3 py-1 rounded-[4px] text-gray-500 font-bold font-mono uppercase tracking-wider">
                {patient.code}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-2 font-medium">
              {patient.age} YEARS OLD • {patient.gender} • BLOOD GROUP: <span className="text-clinical-blue font-bold">{patient.blood_group}</span>
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <div className="bg-[#F0F8F4] text-clinical-green border border-clinical-green/20 px-4 py-3 rounded-[4px] text-xs font-bold uppercase tracking-wider">
            Consent Signed (DPDP Compliant)
          </div>
          {soapApproved && (
            <Button variant="secondary" size="sm" onClick={() => setShowSoap(true)} className="text-xs font-bold uppercase tracking-wider">
              📄 View SOAP Note
            </Button>
          )}
          {rxApproved && (
            <Button variant="secondary" size="sm" onClick={() => setShowRx(true)} className="text-xs font-bold uppercase tracking-wider">
              💊 View Prescription
            </Button>
          )}
        </div>
      </Card>

      {/* SOAP Note Modal */}
      <Modal isOpen={showSoap} onClose={() => setShowSoap(false)} titleText="Signed SOAP Note">
        {soapNote && (
          <div className="space-y-4 text-xs text-gray-650 text-left">
            {(["subjective", "objective", "assessment", "plan"] as const).map((field) => (
              <div key={field} className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">{field}</span>
                <p className="leading-relaxed bg-gray-50 border border-gray-200 p-3 rounded font-normal normal-case">
                  {soapNote[field] || "—"}
                </p>
              </div>
            ))}
          </div>
        )}
      </Modal>

      {/* Prescription Modal */}
      <Modal isOpen={showRx} onClose={() => setShowRx(false)} titleText="Signed Prescription">
        {prescription && (
          <div className="space-y-3 text-xs text-gray-650 text-left">
            <p className="font-bold uppercase text-[10px] text-gray-400 tracking-wider">Diagnosis: <span className="text-gray-600 font-bold">{prescription.selectedDiagnosis}</span></p>
            {prescription.medications.map((med) => (
              <div key={med.id} className="bg-gray-50 border border-gray-200 p-3 rounded space-y-1">
                <span className="font-bold text-gray-650 block">{med.name}</span>
                <span className="text-gray-500 normal-case font-normal">{med.dosage} — {med.frequency} — {med.duration}</span>
                <span className="text-gray-400 normal-case text-[10px] block">{med.instructions}</span>
              </div>
            ))}
          </div>
        )}
      </Modal>

      {/* Main Grid: Details vs Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Demographics Details */}
        <div className="lg:col-span-1 space-y-6">
          <Card titleText="Patient Dossier" className="border border-gray-300">
            <div className="space-y-4 text-sm text-gray-600">
              <div className="space-y-1">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Mobile Number</span>
                <span className="font-semibold text-gray-600">
                  +91 {patient.mobile}
                </span>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Email</span>
                <span className="font-semibold text-gray-600">{patient.email || "Not Provided"}</span>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Permanent Address</span>
                <span className="font-semibold text-gray-600">
                  {patient.address}
                </span>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">ABHA Health ID</span>
                <span className="font-semibold text-clinical-blue font-mono tracking-wider">{patient.abha_id || "Not Linked"}</span>
              </div>

              <div className="pt-4 border-t border-gray-200 space-y-2">
                <span className="text-[10px] text-clinical-red font-bold uppercase tracking-wider block">
                  Emergency Contact
                </span>
                <p className="text-sm font-semibold text-gray-600">{patient.emergency_name}</p>
                <p className="text-xs text-gray-500 font-medium">+91 {patient.emergency_mobile}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column: Handoff / Reports */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Panel 1: Doctor Handoff */}
          <Card titleText="Encounter Queue Dispatch" className="border border-gray-300">
            <p className="text-xs text-gray-450 mt-1 leading-normal mb-4">
              Assign the patient to a consultation queue for further intake and diagnostic checkups.
            </p>

            {queueSuccess && (
              <Alert type="success" titleText="Patient Queued" className="mb-4">
                Patient successfully queued and dispatched to consultation list.
              </Alert>
            )}

            <form onSubmit={handleQueueSubmit} className="flex flex-col sm:flex-row gap-4 items-end">
              <div className="flex-1 w-full">
                <Select
                  label="Select Assigned Doctor"
                  value={selectedDoctor}
                  onChange={(e) => setSelectedDoctor(e.target.value)}
                  required
                >
                  <option value="">-- Choose Consulting Specialist --</option>
                  <option value="1">Dr. Alok Verma (ENT Spec.)</option>
                  <option value="2">Dr. Neha Shah (Otology Spec.)</option>
                </Select>
              </div>
              <Button
                type="submit"
                variant="primary"
                disabled={queuing || !selectedDoctor}
                className="w-full sm:w-auto shrink-0 mb-0.5"
              >
                {queuing ? "Queuing..." : "Send to Doctor"}
              </Button>
            </form>
          </Card>

          {/* Panel 2: Diagnostics/Upload reports */}
          <Card titleText="Patient Diagnostic Records" className="border border-gray-300">
            <p className="text-xs text-gray-450 mt-1 leading-normal mb-4">
              Upload diagnostic files. The AI engine summarizes the report information.
            </p>

            {/* Upload Form */}
            <form onSubmit={uploadReport} className="bg-gray-50 p-6 rounded-[4px] border border-gray-250 flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-1 w-full space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Select
                    label="Report Type"
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                  >
                    <option value="Audiogram">Audiogram</option>
                    <option value="Blood Test">Blood Test</option>
                    <option value="CT Scan">CT Scan</option>
                    <option value="X-Ray">X-Ray</option>
                    <option value="Other Report">Other Report</option>
                  </Select>

                  <div className="flex flex-col space-y-2 text-left w-full">
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Select File
                    </label>
                    <input
                      type="file"
                      id="reportFile"
                      onChange={handleFileChange}
                      required
                      className="hidden"
                    />
                    <label 
                      htmlFor="reportFile" 
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded text-base text-gray-400 focus-visible:outline-none focus-visible:border-clinical-blue transition-colors flex items-center justify-between cursor-pointer hover:border-gray-400"
                    >
                      <span className="truncate max-w-[150px]">{fileName || "Choose PDF/Image..."}</span>
                      <span className="text-xs text-clinical-blue font-bold uppercase tracking-wider">Browse</span>
                    </label>
                  </div>
                </div>

                {uploading && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      <span>Uploading to S3 MinIO storage...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-clinical-blue transition-all duration-200" style={{ width: `${uploadProgress}%` }} />
                    </div>
                  </div>
                )}
              </div>
              
              <Button
                type="submit"
                variant="secondary"
                disabled={uploading || !fileName}
                className="w-full md:w-auto shrink-0 mb-0.5"
              >
                Upload File
              </Button>
            </form>

            {/* List of Uploaded Files */}
            <div className="space-y-4 mt-6">
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">
                Uploaded Files ({reports.length})
              </span>
              
              <div className="space-y-4">
                {reports.map((report) => (
                  <div 
                    key={report.id} 
                    className="p-4 rounded-[4px] bg-gray-50 border border-gray-250 flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
                  >
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-3 flex-wrap">
                        <Badge variant="blue">
                          {report.type}
                        </Badge>
                        <h4 className="font-bold text-gray-600 text-sm">{report.name}</h4>
                        <span className="text-xs text-gray-450 font-medium">({report.size})</span>
                      </div>
                      <p className="text-xs text-gray-500 bg-white p-3 rounded border border-gray-200 leading-relaxed italic">
                        {report.summary}
                      </p>
                    </div>

                    <div className="flex gap-2 shrink-0 self-end md:self-auto">
                      <Button
                        onClick={() => deleteReport(report.id)}
                        variant="danger"
                        size="sm"
                        className="px-3 min-w-0"
                        title="Delete Report"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}

                {reports.length === 0 && (
                  <div className="text-center py-8 text-gray-450 text-xs font-semibold">
                    No diagnostic reports uploaded yet.
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
