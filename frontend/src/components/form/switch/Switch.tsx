import { cn } from "@/utils";

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
}

/** Controlled toggle in the template's switch style. */
const Switch: React.FC<SwitchProps> = ({ checked, onChange, label, disabled = false }) => (
  <label
    className={cn(
      "inline-flex cursor-pointer items-center gap-3 text-sm font-medium select-none",
      disabled ? "cursor-not-allowed text-gray-400" : "text-gray-700 dark:text-gray-300",
    )}
  >
    <input
      type="checkbox"
      role="switch"
      className="peer sr-only"
      checked={checked}
      disabled={disabled}
      onChange={(e) => onChange(e.target.checked)}
    />
    <span
      className={cn(
        "relative block h-6 w-11 shrink-0 rounded-full transition duration-150 ease-linear peer-focus-visible:shadow-focus-ring",
        checked ? "bg-brand-500" : "bg-gray-200 dark:bg-white/10",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 inset-s-0.5 h-5 w-5 rounded-full bg-white shadow-theme-sm transition-transform duration-150 ease-linear",
          checked && "translate-x-5 rtl:-translate-x-5",
        )}
      />
    </span>
    {label}
  </label>
);

export default Switch;
