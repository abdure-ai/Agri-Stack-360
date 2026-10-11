import { type ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// tailwind-merge only knows Tailwind's built-in sizes. Without this, it reads
// the theme's custom sizes (text-title-sm, text-theme-xs, … in index.css) as
// text colours and drops them whenever a colour class such as text-gray-800 is
// also present, so headline numbers rendered at body size.
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ["title-2xl", "title-xl", "title-lg", "title-md", "title-sm", "theme-xl", "theme-sm", "theme-xs"],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(...inputs));
}
