import React, { useState } from "react";
import { Question } from "@/types/junior-doctor";
import { Button } from "@/components/ui/Button";

interface QuestionCardProps {
  question: Question;
  onAccept: () => void;
  onReject: () => void;
  onUpdateText: (text: string) => void;
  onAnswerChange: (answer: string) => void;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  onAccept,
  onReject,
  onUpdateText,
  onAnswerChange,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(question.text);
  const [localAnswer, setLocalAnswer] = useState(question.answer || "");

  const handleSaveEdit = () => {
    onUpdateText(editText);
    setIsEditing(false);
  };

  const handleBlurAnswer = () => {
    onAnswerChange(localAnswer);
  };

  return (
    <div
      className={`border rounded-[4px] p-4 transition-all duration-150 ${
        question.status === "accepted"
          ? "border-clinical-blue bg-white shadow-sm"
          : question.status === "rejected"
          ? "border-gray-200 bg-gray-50 opacity-60"
          : "border-gray-300 border-dashed bg-gray-50/50"
      }`}
    >
      <div className="flex justify-between items-start gap-4">
        {/* Category & Status labels */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-100 px-2 py-0.5 rounded">
            {question.category}
          </span>
          <span
            className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.25 rounded ${
              question.status === "accepted"
                ? "bg-clinical-blue-light text-clinical-blue"
                : question.status === "rejected"
                ? "bg-clinical-red-light text-clinical-red"
                : "bg-gray-200 text-gray-400"
            }`}
          >
            {question.status}
          </span>
        </div>

        {/* Action Triggers */}
        <div className="flex gap-2">
          {question.status === "suggested" && (
            <>
              <Button variant="secondary" size="sm" onClick={onReject} className="h-7 text-[11px]">
                REJECT
              </Button>
              <Button variant="primary" size="sm" onClick={onAccept} className="h-7 text-[11px]">
                ACCEPT
              </Button>
            </>
          )}

          {question.status === "accepted" && (
            <>
              {!isEditing && (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="text-[11px] font-bold text-gray-400 hover:text-gray-600 uppercase tracking-wider h-7 px-2"
                >
                  EDIT TEXT
                </button>
              )}
              <Button variant="secondary" size="sm" onClick={onReject} className="h-7 text-[11px] text-clinical-red hover:bg-clinical-red-light border-clinical-red/20">
                REJECT
              </Button>
            </>
          )}

          {question.status === "rejected" && (
            <Button variant="secondary" size="sm" onClick={onAccept} className="h-7 text-[11px]">
              RESTORE
            </Button>
          )}
        </div>
      </div>

      {/* Question Text Area */}
      <div className="mt-3">
        {isEditing ? (
          <div className="space-y-2">
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="w-full text-sm font-semibold text-gray-600 p-2.5 bg-white border border-gray-350 rounded focus:outline-none focus:border-clinical-blue"
              rows={2}
            />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleSaveEdit}>
                Save
              </Button>
            </div>
          </div>
        ) : (
          <p
            className={`text-sm font-semibold uppercase tracking-wide leading-relaxed ${
              question.status === "rejected" ? "line-through text-gray-400" : "text-gray-600"
            }`}
          >
            {question.text}
          </p>
        )}
      </div>

      {/* Answer Capture Text Area */}
      {question.status === "accepted" && !isEditing && (
        <div className="mt-4 pt-3 border-t border-gray-150">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">
            CAPTURE RESPONSE
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. Yes, worsening at night / No discomfort..."
              value={localAnswer}
              onChange={(e) => setLocalAnswer(e.target.value)}
              onBlur={handleBlurAnswer}
              className="w-full text-xs font-semibold text-gray-500 bg-white px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-clinical-blue placeholder:text-gray-300"
            />
            <div className="flex gap-1">
              <Button
                variant="secondary"
                size="sm"
                className="h-8 font-bold text-[10px] uppercase shrink-0"
                onClick={() => {
                  setLocalAnswer("Yes");
                  onAnswerChange("Yes");
                }}
              >
                Yes
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="h-8 font-bold text-[10px] uppercase shrink-0"
                onClick={() => {
                  setLocalAnswer("No");
                  onAnswerChange("No");
                }}
              >
                No
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
