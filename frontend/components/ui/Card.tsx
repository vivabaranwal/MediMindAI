import * as React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padded?: boolean;
  border?: boolean;
  titleText?: string;
  footerActions?: React.ReactNode;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className = "", padded = true, border = true, titleText, footerActions, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`bg-white rounded-[4px] flex flex-col justify-between ${
          border ? "border border-gray-300" : ""
        } ${padded ? "p-6" : ""} ${className}`}
        {...props}
      >
        {titleText && (
          <div className="border-b border-gray-200 pb-3 mb-4">
            <h3 className="font-semibold text-lg text-gray-600 uppercase tracking-wider">
              {titleText}
            </h3>
          </div>
        )}
        <div className="flex-1 space-y-4">{children}</div>
        {footerActions && (
          <div className="border-t border-gray-200 pt-4 mt-6 flex justify-end gap-3">
            {footerActions}
          </div>
        )}
      </div>
    );
  }
);

Card.displayName = "Card";
