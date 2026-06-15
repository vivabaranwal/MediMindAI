import React from "react";
import { Patient, JuniorDoctorAssessment, Recommendation } from "@/types/senior-doctor";
import { RiskBadge } from "./RiskBadge";
import { Card } from "@/components/ui/Card";

interface DoctorBriefCardProps {
  patient: Patient;
  assessment?: JuniorDoctorAssessment;
  recommendations: Recommendation[];
  className?: string;
}

export const DoctorBriefCard: React.FC<DoctorBriefCardProps> = ({
  patient,
  assessment,
  recommendations,
  className = "",
}) => {
  const differentials = recommendations.filter((r) => r.type === "diagnosis");
  const investigations = recommendations.filter((r) => r.type === "investigation");
  const treatments = recommendations.filter((r) => r.type === "treatment" || r.type === "procedure");

  return (
    <Card className={`border border-gray-300 ${className}`}>
      <div className="space-y-5">
        <div className="flex justify-between items-start border-b border-gray-200 pb-3 gap-2">
          <div>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest block mb-0.5">
              AI CLINICAL BRIEFING
            </span>
            <h3 className="text-lg font-bold text-gray-650 uppercase tracking-tight">
              Executive Diagnostics Synthesizer
            </h3>
          </div>
          <RiskBadge acuity={patient.acuity} />
        </div>

        {/* Complaint & Timeline */}
        <div className="space-y-3 text-xs uppercase font-semibold text-gray-650 text-left">
          <div>
            <span className="text-[10px] text-gray-400 block font-bold tracking-wider">CHIEF PRESENTATION</span>
            <p className="normal-case font-normal text-sm text-gray-650 leading-relaxed mt-1 bg-gray-50 p-3 rounded border border-gray-200">
              &ldquo;{patient.chiefComplaint || "No complaint recorded."}&rdquo;
            </p>
          </div>

          {assessment && (
            <>
              <div>
                <span className="text-[10px] text-gray-400 block font-bold tracking-wider">CLINICAL TIMELINE PROGRESSION</span>
                <p className="normal-case font-normal text-gray-550 leading-relaxed mt-0.5">{assessment.timeline}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] text-clinical-green block font-bold tracking-wider">IDENTIFIED POSITIVES</span>
                  <ul className="list-disc pl-4 mt-1 space-y-1 text-gray-600 normal-case font-normal">
                    {assessment.positives.map((p, i) => (
                      <li key={i}>{p}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <span className="text-[10px] text-clinical-red block font-bold tracking-wider">RELEVANT NEGATIVES</span>
                  <ul className="list-disc pl-4 mt-1 space-y-1 text-gray-600 normal-case font-normal">
                    {assessment.negatives.map((n, i) => (
                      <li key={i}>{n}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </>
          )}

          {/* Differential Diagnosis */}
          <div className="pt-3 border-t border-gray-200">
            <span className="text-[10px] text-gray-400 block font-bold tracking-wider">TOP DIFFERENTIAL DIAGNOSES</span>
            <div className="space-y-2 mt-2">
              {differentials.map((diff) => (
                <div key={diff.id} className="flex justify-between items-center bg-gray-50 border border-gray-200 p-2.5 rounded">
                  <div>
                    <span className="text-gray-650 font-bold block text-xs leading-none">{diff.title}</span>
                    <span className="text-[9px] text-gray-400 block mt-1 normal-case font-normal">{diff.detail}</span>
                  </div>
                  <span className="bg-clinical-blue-light text-clinical-blue font-bold px-2 py-0.5 rounded text-[10px] tracking-normal">
                    {diff.confidence}% Conf.
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Diagnostic & Treatment Recommendations */}
          <div className="grid grid-cols-2 gap-4 pt-3 border-t border-gray-200">
            <div>
              <span className="text-[10px] text-gray-400 block font-bold tracking-wider">SUGGESTED INVESTIGATIONS</span>
              <ul className="list-disc pl-4 mt-1.5 space-y-1 text-gray-600 normal-case font-normal">
                {investigations.slice(0, 3).map((inv) => (
                  <li key={inv.id}>{inv.title}</li>
                ))}
                {investigations.length === 0 && <li>No investigations suggested.</li>}
              </ul>
            </div>
            <div>
              <span className="text-[10px] text-gray-400 block font-bold tracking-wider">SUGGESTED THERAPEUTICS</span>
              <ul className="list-disc pl-4 mt-1.5 space-y-1 text-gray-600 normal-case font-normal">
                {treatments.slice(0, 3).map((tr) => (
                  <li key={tr.id}>{tr.title}</li>
                ))}
                {treatments.length === 0 && <li>No treatments suggested.</li>}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};
