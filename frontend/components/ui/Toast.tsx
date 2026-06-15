import * as React from "react";

export type ToastVariant = "success" | "error" | "info";

export interface ToastProps {
  messageText: string;
  variant?: ToastVariant;
  onClose?: () => void;
  duration?: number;
}

export const Toast: React.FC<ToastProps> = ({
  messageText,
  variant = "success",
  onClose,
  duration = 3000,
}) => {
  React.useEffect(() => {
    if (duration > 0 && onClose) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  let styles = "bg-[#1A1D24] text-white border-l-4";
  switch (variant) {
    case "success":
      styles += " border-clinical-green";
      break;
    case "error":
      styles += " border-clinical-red";
      break;
    case "info":
      styles += " border-clinical-blue";
      break;
  }

  return (
    <div className={`fixed bottom-4 right-4 z-50 flex items-center justify-between p-4 rounded-[4px] shadow-lg max-w-sm animate-fade-in-up ${styles}`}>
      <span className="text-sm font-semibold leading-normal mr-6">{messageText}</span>
      {onClose && (
        <button
          onClick={onClose}
          className="text-white hover:text-gray-300 font-light text-xl focus:outline-none"
        >
          ×
        </button>
      )}
    </div>
  );
};

Toast.displayName = "Toast";
