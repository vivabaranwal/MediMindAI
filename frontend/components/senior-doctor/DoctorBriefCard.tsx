import React from "react";
import { Patient, JuniorDoctorAssessment, Recommendation } from "@/types/senior-doctor";
import { AiBriefDto } from "@/types/ai";
import { Section } from "@/store/seniorDoctorStore";
import { ConfidenceBadge } from "./ConfidenceBadge";
import { AiBriefPanel } from "./AiBriefPanel";
import { Card } from "@/components/ui/Card";

interface DoctorBriefCardProps {
  patient: Patient;
  assessment?: JuniorDoctorAssessment;
  recommendations: Recommendation[];
  brief: Section<AiBriefDto>;
  onRegenerateBrief: () => void;
  className?: string;
}

/** Side panel shown next to the SOAP, prescription and follow-up editors. */
export const DoctorBriefCard: React.FC<DoctorBriefCardProps> = ({
  patient,
  assessment,
  recommendations,
  brief,
  onRegenerateBrief,
  className = "",
}) => {
  const differentials = recommendations.filter((r) => r.type === "diagnosis");

  return (
    <div className={`space-y-6 ${className}`}>
      <AiBriefPanel brief={brief} onRegenerate={onRegenerateBrief} />

      <Card className="border border-gray-300">
        <div className="space-y-4 text-xs uppercase font-semibold text-gray-650 text-left">
          <div>
            <span className="text-[10px] text-gray-400 block font-bold tracking-wider">CHIEF PRESENTATION</span>
            <p className="normal-case font-normal text-sm text-gray-650 leading-relaxed mt-1 bg-gray-50 p-3 rounded border border-gray-200">
              &ldquo;{patient.chiefComplaint || "No complaint recorded."}&rdquo;
            </p>
          </div>

          {assessment && (
            <>
              <div>
                <span className="text-[10px] text-gray-400 block font-bold tracking-wider">TIMELINE (FROM INTAKE)</span>
                <p className="normal-case font-normal text-gray-550 leading-relaxed mt-0.5">
                  {assessment.summary?.timeline || "Not documented"}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] text-clinical-green block font-bold tracking-wider">POSITIVES</span>
                  <ul className="list-disc pl-4 mt-1 space-y-1 text-gray-600 normal-case font-normal">
                    {assessment.positives.length > 0 ? assessment.positives.map((p, i) => <li key={i}>{p}</li>) : <li>None documented</li>}
                  </ul>
                </div>
                <div>
                  <span className="text-[10px] text-clinical-red block font-bold tracking-wider">NEGATIVES</span>
                  <ul className="list-disc pl-4 mt-1 space-y-1 text-gray-600 normal-case font-normal">
                    {assessment.negatives.length > 0 ? assessment.negatives.map((n, i) => <li key={i}>{n}</li>) : <li>None documented</li>}
                  </ul>
                </div>
              </div>
            </>
          )}

          {differentials.length > 0 && (
            <div className="pt-3 border-t border-gray-200">
              <span className="text-[10px] text-gray-400 block font-bold tracking-wider">AI DIFFERENTIALS (FOR CONSIDERATION)</span>
              <div className="space-y-2 mt-2">
                {differentials.map((d) => (
                  <div key={d.id} className="flex justify-between items-center bg-gray-50 border border-gray-200 p-2.5 rounded gap-2">
                    <div>
                      <span className="text-gray-650 font-bold block text-xs leading-none">{d.title}</span>
                      <span className="text-[9px] text-gray-400 block mt-1 normal-case font-normal">{d.detail}</span>
                    </div>
                    {d.likelihood && <ConfidenceBadge likelihood={d.likelihood} />}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};
