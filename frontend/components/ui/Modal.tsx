import * as React from "react";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  titleText: string;
  footerActions?: React.ReactNode;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, titleText, footerActions, children }) => {
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleEscape);
    }
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/20" 
        onClick={onClose}
      />
      
      {/* Frame */}
      <div className="relative z-10 w-full max-w-[540px] bg-white border border-gray-300 rounded-[4px] p-8 shadow-none animate-fade-in-up">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-gray-200 pb-4 mb-6">
          <h2 className="text-xl font-bold text-gray-600">
            {titleText}
          </h2>
          <button 
            onClick={onClose}
            className="text-2xl font-light text-gray-500 hover:text-gray-600 focus:outline-none w-8 h-8 flex items-center justify-center"
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="text-base text-gray-600 leading-relaxed mb-6">
          {children}
        </div>

        {/* Footer */}
        {footerActions && (
          <div className="flex justify-end gap-3 border-t border-gray-200 pt-4">
            {footerActions}
          </div>
        )}
      </div>
    </div>
  );
};

Modal.displayName = "Modal";
