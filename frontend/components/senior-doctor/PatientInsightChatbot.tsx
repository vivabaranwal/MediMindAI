"use client";

import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import { Patient, JuniorDoctorAssessment, Recommendation, SimilarCase, OutcomeStatistic, UploadedReport } from "@/types/senior-doctor";
import { Button } from "@/components/ui/Button";

interface ChatMessage {
  role: "user" | "bot";
  text: string;
}

interface PatientInsightChatbotProps {
  patient: Patient;
  assessment?: JuniorDoctorAssessment;
  recommendations?: Recommendation[];
  similarCases?: SimilarCase[];
  outcomeStats?: OutcomeStatistic[];
  className?: string;
}

/**
 * Generates a context-aware response based on the patient's available clinical data.
 */
function buildBotResponse(
  query: string,
  patient: Patient,
  assessment?: JuniorDoctorAssessment,
  recommendations?: Recommendation[],
  similarCases?: SimilarCase[],
  _outcomeStats?: OutcomeStatistic[]
): string {
  const q = query.toLowerCase();

  // Allergy queries
  if (q.includes("allerg")) {
    const allergies = patient.allergies;
    if (!allergies || allergies.length === 0) return "No documented allergies for this patient.";
    return `Patient has documented allergies to: ${allergies.join(", ")}. Please cross-check any prescribed medication.`;
  }

  // Active Medications queries
  if (q.includes("medication") || q.includes("rx") || q.includes("drug") || q.includes("medicine") || q.includes("current med")) {
    const meds = patient.currentMedications;
    if (!meds || meds.length === 0) return "No active medications on record for this patient.";
    return `Current active medications: ${meds.join(", ")}.`;
  }

  // Vitals queries
  if (q.includes("vital") || q.includes("blood pressure") || q.includes("heart rate") || q.includes("temperature") || q.includes("spo2") || q.includes("oxygen")) {
    const v = patient.vitals;
    if (!v) return "No vital signs recorded for this patient.";
    return `Latest vitals — BP: ${v.bp ?? "--"}, HR: ${v.hr ? v.hr + " bpm" : "--"}, Temp: ${v.temp ?? "--"}, SpO2: ${v.spo2 ? v.spo2 + "%" : "--"}.`;
  }

  // Chief complaint / presentation
  if (q.includes("complaint") || q.includes("present") || q.includes("symptom") || q.includes("problem") || q.includes("chief")) {
    const cc = assessment?.chiefComplaint || patient.chiefComplaint;
    if (!cc) return "No chief complaint recorded for this patient.";
    return `Chief presentation: "${cc}". Timeline: ${assessment?.timeline ?? "Not specified"}.`;
  }

  // Reports / scans / labs
  if (q.includes("report") || q.includes("scan") || q.includes("lab") || q.includes("ocr") || q.includes("upload")) {
    const reports = patient.uploadedReports;
    if (!reports || reports.length === 0) return "No diagnostic reports have been uploaded for this patient.";
    const summaries = reports.map((r: UploadedReport) =>
      `[${r.name}]: ${r.ocrFindings}. Abnormal: ${r.abnormalFindings?.join(", ") || "None"}.`
    );
    return `Uploaded report findings:\n${summaries.join("\n")}`;
  }

  // Diagnosis / differentials
  if (q.includes("diagnos") || q.includes("differential") || q.includes("condition")) {
    const dxRecs = recommendations?.filter((r) => r.type === "diagnosis");
    if (!dxRecs || dxRecs.length === 0) return "No AI differential diagnoses have been calculated for this patient yet.";
    return `AI Differentials: ${dxRecs.map((r) => `${r.title} (${r.confidence}% confidence)`).join("; ")}.`;
  }

  // Medications / pharmacotherapy suggestions
  if (q.includes("suggest") || q.includes("recommend") || q.includes("prescrib")) {
    const medRecs = recommendations?.filter((r) => r.type === "medication");
    if (!medRecs || medRecs.length === 0) return "No medication recommendations have been generated for this patient.";
    return `Suggested pharmacotherapy: ${medRecs.map((r) => r.title).join(", ")}.`;
  }

  // Similar cases
  if (q.includes("similar") || q.includes("case") || q.includes("historical") || q.includes("outcome")) {
    if (!similarCases || similarCases.length === 0) return "No similar case history has been resolved for this patient.";
    return `${similarCases.length} similar case(s) found. Top match: ${similarCases[0].caseCode} (${similarCases[0].similarityPercent}% similarity) — ${similarCases[0].outcomeSummary}`;
  }

  // History / previous visits
  if (q.includes("history") || q.includes("previous") || q.includes("visit") || q.includes("past")) {
    const visits = patient.previousVisits;
    if (!visits || visits.length === 0) return "No previous consultation records found in the EMR.";
    return `Previous consultations: ${visits.map((v) => `${v.date} — ${v.diagnosis} (${v.doctor})`).join("; ")}.`;
  }

  // Patient identity
  if (q.includes("name") || q.includes("age") || q.includes("gender") || q.includes("patient")) {
    return `Patient: ${patient.name}, ${patient.age} years old, ${patient.gender}. Code: ${patient.code}.`;
  }

  return "I don't have enough context to answer that precisely. Try asking about allergies, vitals, reports, medications, diagnoses, or similar cases for this patient.";
}

export const PatientInsightChatbot: React.FC<PatientInsightChatbotProps> = ({
  patient,
  assessment,
  recommendations,
  similarCases,
  outcomeStats,
  className = "",
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "bot", text: `Hello! I'm the Patient Insight AI. Ask me anything about ${patient.name}'s clinical data, reports, allergies, vitals, or similar cases.` },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    const userText = input.trim();
    if (!userText) return;

    // Construct previous message history mapped to FastAPI ChatRequest schema
    const history = messages.map((msg) => ({
      role: msg.role === "user" ? ("user" as const) : ("assistant" as const),
      content: msg.text,
    }));

    setMessages((prev) => [...prev, { role: "user", text: userText }]);
    setInput("");
    setIsTyping(true);

    const encounterId = patient.encounterId || patient.id || 0;
    const aiEngineUrl = process.env.NEXT_PUBLIC_AI_ENGINE_URL || "http://localhost:8080";

    let botReply = "";
    try {
      const response = await axios.post(
        `${aiEngineUrl}/api/ai/chat`,
        {
          query: userText,
          encounter_id: encounterId,
          history,
        },
        {
          headers: {
            "Content-Type": "application/json",
            "X-Internal-Secret": "super-secret-token",
          },
          timeout: 5000,
        }
      );

      if (response.data && response.data.success && response.data.response) {
        botReply = response.data.response;
      } else {
        throw new Error("Response structure invalid or unsuccessful");
      }
    } catch (err) {
      console.warn("FastAPI chat engine unreachable, executing local fallback", err);
      // Simulate slight delay for realism before fallback response
      await new Promise((r) => setTimeout(r, 350));
      botReply = buildBotResponse(
        userText,
        patient,
        assessment,
        recommendations,
        similarCases,
        outcomeStats
      );
    }

    setMessages((prev) => [...prev, { role: "bot", text: botReply }]);
    setIsTyping(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSend();
  };

  return (
    <div className={`border border-gray-300 rounded-[4px] overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 bg-white">
        <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest block mb-0.5">
          AI ASSISTANT
        </span>
        <h3 className="text-xs font-bold text-gray-655 uppercase tracking-wider">
          Patient Insight Chatbot
        </h3>
      </div>

      {/* Message Thread */}
      <div className="h-[220px] overflow-y-auto px-4 py-3 space-y-3 bg-gray-50/40">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] px-3 py-2 rounded text-[11px] leading-relaxed font-medium ${
                msg.role === "user"
                  ? "bg-clinical-blue text-white rounded-br-none"
                  : "bg-white border border-gray-200 text-gray-650 rounded-bl-none"
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 text-gray-400 text-[11px] px-3 py-2 rounded rounded-bl-none font-medium">
              Thinking…
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input Row */}
      <div className="border-t border-gray-200 px-3 py-2.5 flex gap-2 bg-white">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about allergies, vitals, reports, diagnoses…"
          className="flex-1 text-xs text-gray-650 bg-gray-50 border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-clinical-blue"
        />
        <Button
          variant="primary"
          size="sm"
          onClick={handleSend}
          disabled={!input.trim() || isTyping}
          className="text-[11px] px-3 font-bold tracking-wider"
        >
          SEND
        </Button>
      </div>
    </div>
  );
};
