"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
import { Alert } from "@/components/ui/Alert";

// Mock Database of Patients
const mockPatientsDb = {
  "1": { id: 1, code: "MM-2026-00001", name: "Ramesh Sharma", age: 45, gender: "Male", mobile: "9876543210", email: "ramesh@domain.com", address: "Sector 4, Gomti Nagar, Lucknow", blood_group: "O+", abha_id: "12-3456-7890-12", emergency_name: "Anjali Sharma", emergency_mobile: "9876543211", consent: true },
  "2": { id: 2, code: "MM-2026-00002", name: "Sunita Gupta", age: 38, gender: "Female", mobile: "9123456789", email: "sunita@domain.com", address: "Aliganj, Lucknow", blood_group: "B+", abha_id: "43-2109-8765-43", emergency_name: "Ramesh Gupta", emergency_mobile: "9123456780", consent: true },
  "3": { id: 3, code: "MM-2026-00003", name: "Kabir Mehra", age: 29, gender: "Male", mobile: "9567890123", email: "kabir@domain.com", address: "Hazratganj, Lucknow", blood_group: "AB-", abha_id: "56-7890-1234-56", emergency_name: "Sanjay Mehra", emergency_mobile: "9567890124", consent: true },
  "4": { id: 4, code: "MM-2026-00004", name: "Ananya Deshmukh", age: 12, gender: "Female", mobile: "9890123456", email: "parent.ananya@domain.com", address: "Indira Nagar, Lucknow", blood_group: "A+", abha_id: "78-9012-3456-78", emergency_name: "Rajesh Deshmukh", emergency_mobile: "9890123457", consent: true },
  "5": { id: 5, code: "MM-2026-00005", name: "William D'Souza", age: 61, gender: "Male", mobile: "9765432109", email: "william@domain.com", address: "Mahanagar, Lucknow", blood_group: "Unknown", abha_id: "", emergency_name: "Stella D'Souza", emergency_mobile: "9765432100", consent: true },
};

// Mock Reports Database
const initialReports = [
  { id: 101, name: "Audiology_Report_2026.pdf", type: "Audiogram", size: "1.2 MB", uploadedAt: "2026-06-10", summary: "Moderate conductive hearing loss in left ear. Normal right ear." },
  { id: 102, name: "CBC_BloodTest.pdf", type: "Blood Test", size: "850 KB", uploadedAt: "2026-05-15", summary: "Hemoglobin slightly low (12.5 g/dL). All other CBC counts within normal reference intervals." },
];

export default function PatientProfile() {
  const params = useParams();
  const patientId = (params?.id as string) || "1";
  
  const patient = mockPatientsDb[patientId as keyof typeof mockPatientsDb] || mockPatientsDb["1"];

  // States
  const [reports, setReports] = useState(initialReports);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedType, setSelectedType] = useState("Audiogram");
  const [fileName, setFileName] = useState("");
  
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [queuing, setQueuing] = useState(false);
  const [queueSuccess, setQueueSuccess] = useState(false);

  // File Upload Handlers
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFileName(e.target.files[0].name);
    }
  };

  const uploadReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileName) return;

    setUploading(true);
    setUploadProgress(0);

    // Simulate progress ticks
    for (let p = 0; p <= 100; p += 20) {
      setUploadProgress(p);
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    const newReport = {
      id: Math.floor(1000 + Math.random() * 9000),
      name: fileName,
      type: selectedType,
      size: "1.4 MB",
      uploadedAt: new Date().toISOString().split("T")[0],
      summary: "Processing completed. AI Summary: Diagnostic coordinates match normal values; minor deviations in specific benchmarks."
    };

    setReports(prev => [newReport, ...prev]);
    setUploading(false);
    setFileName("");
    setUploadProgress(0);
  };

  const deleteReport = (id: number) => {
    setReports(prev => prev.filter(r => r.id !== id));
  };

  // Queue Handlers
  const handleQueueSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctor) return;

    setQueuing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setQueuing(false);
    setQueueSuccess(true);
    
    // Clear success after 3 seconds
    setTimeout(() => setQueueSuccess(false), 3000);
  };

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
        </div>
      </Card>

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
