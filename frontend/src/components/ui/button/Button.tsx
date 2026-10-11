import { cn } from "@/utils";
import type { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  children: ReactNode;
  size?: "xs" | "sm" | "md";
  variant?: "primary" | "outline" | "danger" | "ghost";
  startIcon?: ReactNode;
  endIcon?: ReactNode;
  /** Shows a spinner and disables the button. */
  loading?: boolean;
}

const SIZES = {
  xs: "px-3 py-2 text-sm",
  sm: "px-4 py-2.5 text-sm",
  md: "px-5 py-3.5 text-sm",
};

const VARIANTS = {
  primary: "bg-brand-500 text-white shadow-theme-xs hover:bg-brand-600 disabled:bg-brand-300 dark:disabled:bg-brand-800",
  outline:
    "bg-white text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-700 dark:hover:bg-white/3 dark:hover:text-gray-300",
  danger:
    "bg-white text-error-600 ring-1 ring-inset ring-error-300 hover:bg-error-50 dark:bg-gray-800 dark:text-error-500 dark:ring-error-500/40 dark:hover:bg-error-500/10",
  ghost: "text-gray-600 hover:bg-gray-100 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-200",
};

const Button: React.FC<ButtonProps> = ({
  children,
  size = "md",
  variant = "primary",
  startIcon,
  endIcon,
  loading = false,
  className,
  disabled,
  type = "button",
  ...props
}) => {
  const isDisabled = disabled || loading;
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition focus-visible:shadow-focus-ring focus-visible:outline-hidden",
        SIZES[size],
        VARIANTS[variant],
        isDisabled && "cursor-not-allowed opacity-60",
        className,
      )}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? (
        <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
      ) : (
        startIcon && <span className="flex items-center">{startIcon}</span>
      )}
      {children}
      {endIcon && <span className="flex items-center">{endIcon}</span>}
    </button>
  );
};

export default Button;
