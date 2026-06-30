import { cn } from "@/lib/utils";

const sizes = {
  sm: "text-xs tracking-[0.14em]",
  md: "text-xl tracking-[0.16em] sm:text-2xl sm:tracking-[0.18em]",
  lg: "text-3xl tracking-[0.18em]",
} as const;

const tones = {
  default: "text-foreground",
  light: "text-white",
  sidebar: "text-sidebar-foreground",
} as const;

type VantageLogoProps = {
  size?: keyof typeof sizes;
  tone?: keyof typeof tones;
  /** Sidebar icon mode — single-letter mark */
  compact?: boolean;
  className?: string;
};

export function VantageLogo({
  size = "md",
  tone = "default",
  compact = false,
  className,
}: VantageLogoProps) {
  return (
    <span
      className={cn(
        "font-display shrink-0 font-bold uppercase leading-none",
        sizes[size],
        tones[tone],
        className,
      )}
    >
      {compact ? "V" : "VANTAGE"}
    </span>
  );
}
