import * as React from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger";
  size?: "sm" | "md" | "lg";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "primary", size = "md", disabled, children, ...props }, ref) => {
    const baseStyles = "inline-flex items-center justify-center font-semibold rounded transition-all duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clinical-blue";
    
    let variantStyles = "";
    if (disabled) {
      variantStyles = "bg-gray-300 text-gray-500 border-none cursor-not-allowed";
    } else {
      switch (variant) {
        case "primary":
          variantStyles = "bg-clinical-blue text-white hover:bg-clinical-blue-dark active:bg-clinical-blue-dark border-none";
          break;
        case "secondary":
          variantStyles = "bg-transparent border border-gray-300 text-gray-600 hover:bg-gray-50 hover:border-gray-500 active:bg-gray-100";
          break;
        case "danger":
          variantStyles = "bg-clinical-red text-white hover:bg-clinical-red hover:brightness-90 active:brightness-85 border-none";
          break;
      }
    }

    let sizeStyles = "";
    switch (size) {
      case "sm":
        sizeStyles = "px-3 py-1.5 text-xs min-h-[36px] min-w-[80px]";
        break;
      case "md":
        sizeStyles = "px-6 py-3 text-base min-h-[44px] min-w-[120px]";
        break;
      case "lg":
        sizeStyles = "px-8 py-4 text-lg min-h-[52px] min-w-[160px]";
        break;
    }

    return (
      <button
        ref={ref}
        disabled={disabled}
        className={`${baseStyles} ${variantStyles} ${sizeStyles} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
