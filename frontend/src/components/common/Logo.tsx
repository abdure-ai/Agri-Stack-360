import { LogoMark } from "@/icons";
import { cn } from "@/utils";

interface LogoProps {
  /** Hide the wordmark (collapsed sidebar). */
  iconOnly?: boolean;
  /** Light text for dark backgrounds (auth side panel). */
  inverted?: boolean;
  size?: "md" | "lg";
  className?: string;
}

export default function Logo({ iconOnly = false, inverted = false, size = "md", className }: LogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark className={cn("shrink-0", size === "lg" ? "size-12" : "size-9")} aria-hidden="true" />
      {!iconOnly && (
        <span
          className={cn(
            "font-semibold tracking-tight whitespace-nowrap",
            size === "lg" ? "text-3xl" : "text-xl",
            inverted ? "text-white" : "text-gray-900 dark:text-white",
          )}
        >
          Agri-Stack{" "}
          <span className={inverted ? "text-brand-300" : "text-brand-500 dark:text-brand-400"}>360</span>
        </span>
      )}
    </span>
  );
}
