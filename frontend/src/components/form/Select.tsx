import { cn } from "@/utils";

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  /** Adds a first option with an empty value (e.g. "All regions"). */
  placeholder?: string;
  /** Whether the empty placeholder option can be chosen. */
  placeholderSelectable?: boolean;
  id?: string;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
}

/** Controlled select in the template's input style. */
const Select: React.FC<SelectProps> = ({
  options,
  value,
  onChange,
  placeholder,
  placeholderSelectable = true,
  id,
  disabled = false,
  className,
  ...aria
}) => (
  <div className="relative">
    <select
      id={id}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "h-11 w-full appearance-none rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 pe-11 text-sm shadow-theme-xs focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:focus:border-brand-800",
        value ? "text-gray-800 dark:text-white/90" : "text-gray-500 dark:text-gray-400",
        disabled && "cursor-not-allowed opacity-50",
        className,
      )}
      {...aria}
    >
      {placeholder !== undefined && (
        <option value="" disabled={!placeholderSelectable} className="text-gray-700 dark:bg-gray-900 dark:text-gray-400">
          {placeholder}
        </option>
      )}
      {options.map((o) => (
        <option key={o.value} value={o.value} className="text-gray-700 dark:bg-gray-900 dark:text-gray-300">
          {o.label}
        </option>
      ))}
    </select>
    <svg
      className="pointer-events-none absolute inset-e-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400"
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <path d="M4.79175 8.02075L10.0001 13.2291L15.2084 8.02075" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  </div>
);

export default Select;
