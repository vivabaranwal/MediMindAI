"use client";

import React, { useState, useRef, useEffect } from "react";
import { Patient } from "@/types/senior-doctor";
import { CitationDto } from "@/types/ai";
import { AiService } from "@/services/ai.service";
import { toApiError } from "@/lib/errors";
import { Button } from "@/components/ui/Button";

interface ChatMessage {
  role: "user" | "assistant" | "error";
  text: string;
  citations?: CitationDto[];
  notFound?: boolean;
}

interface PatientInsightChatbotProps {
  patient: Patient;
  className?: string;
}

/**
 * Grounded Q&A about one patient. Answers come only from the patient's chart and uploaded
 * reports and cite their sources; if the record doesn't contain the answer it says so.
 * There is deliberately no offline fallback: a failed request shows an error, never an invented answer.
 */
export const PatientInsightChatbot: React.FC<PatientInsightChatbotProps> = ({ patient, className = "" }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking]);

  const noConsent = patient.aiConsent === false;
  const canChat = !!patient.encounterId && !noConsent;

  const handleSend = async () => {
    const query = input.trim();
    if (!query || !patient.encounterId || isThinking) return;

    const history = messages
      .filter((m): m is ChatMessage & { role: "user" | "assistant" } => m.role !== "error")
      .slice(-10)
      .map((m) => ({ role: m.role, content: m.text }));

    setMessages((prev) => [...prev, { role: "user", text: query }]);
    setInput("");
    setIsThinking(true);

    try {
      const res = await AiService.chat(patient.encounterId, query, history);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: res.answer, citations: res.citations, notFound: res.insufficient_information },
      ]);
    } catch (err) {
      setMessages((prev) => [...prev, { role: "error", text: toApiError(err, "The assistant could not answer.").message }]);
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <div className={`border border-gray-300 rounded-[4px] overflow-hidden ${className}`}>
      <div className="px-4 py-3 border-b border-gray-200 bg-white">
        <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest block mb-0.5">AI ASSISTANT</span>
        <h3 className="text-xs font-bold text-gray-655 uppercase tracking-wider">Patient Record Q&amp;A</h3>
      </div>

      <div className="h-[260px] overflow-y-auto px-4 py-3 space-y-3 bg-gray-50/40">
        {messages.length === 0 && (
          <p className="text-[11px] text-gray-400 leading-relaxed">
            {noConsent
              ? "This patient has not consented to AI-assisted processing. Record their consent on the patient profile to enable the assistant."
              : `Ask about ${patient.name}'s chart or uploaded reports, for example allergies, lab values or the intake findings. Answers cite the record they came from.`}
          </p>
        )}

        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[88%] px-3 py-2 rounded text-[11px] leading-relaxed font-medium whitespace-pre-wrap ${
                msg.role === "user"
                  ? "bg-clinical-blue text-white rounded-br-none"
                  : msg.role === "error"
                    ? "bg-clinical-red-light text-clinical-red border border-clinical-red/20 rounded-bl-none"
                    : "bg-white border border-gray-200 text-gray-650 rounded-bl-none"
              }`}
            >
              {msg.text}
              {msg.citations && msg.citations.length > 0 && (
                <div className="mt-2 pt-2 border-t border-gray-150 space-y-1">
                  {msg.citations.map((c) => (
                    <div key={c.source_id} className="text-[10px] text-gray-450 font-normal">
                      <span className="font-bold text-gray-500">Source: {c.label}</span>
                      <span className="block italic truncate" title={c.snippet}>&ldquo;{c.snippet}&rdquo;</span>
                    </div>
                  ))}
                </div>
              )}
              {msg.notFound && <div className="mt-1 text-[10px] text-gray-400 font-normal">Not found in the record.</div>}
            </div>
          </div>
        ))}

        {isThinking && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 text-gray-400 text-[11px] px-3 py-2 rounded rounded-bl-none font-medium">Searching the record…</div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-gray-200 px-3 py-2.5 flex gap-2 bg-white">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder={canChat ? "Ask about this patient's record…" : "Assistant unavailable"}
          disabled={!canChat}
          maxLength={2000}
          className="flex-1 text-xs text-gray-650 bg-gray-50 border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-clinical-blue disabled:opacity-60"
        />
        <Button variant="primary" size="sm" onClick={handleSend} disabled={!canChat || !input.trim() || isThinking} className="text-[11px] px-3 font-bold tracking-wider">
          SEND
        </Button>
      </div>
      <p className="px-3 pb-2 bg-white text-[9px] text-gray-400 leading-snug">AI-generated from the patient record. Verify before acting; not a clinical decision.</p>
    </div>
  );
};
