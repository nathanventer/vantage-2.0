import wordmark from "@/assets/vantage-wordmark.png";
import icon from "@/assets/vantage-icon.png";
import { cn } from "@/lib/utils";

const wordmarkHeights = {
  sm: "h-6",
  md: "h-8 sm:h-9",
  lg: "h-11 sm:h-12",
} as const;

const iconHeights = {
  sm: "h-8 w-8",
  md: "h-9 w-9",
  lg: "h-11 w-11",
} as const;

/** White assets on dark surfaces; monochrome on light surfaces. */
const tones = {
  default: "brightness-0",
  light: "",
  sidebar: "",
} as const;

type VantageLogoProps = {
  size?: keyof typeof wordmarkHeights;
  tone?: keyof typeof tones;
  /** Collapsed sidebar — V icon mark only */
  compact?: boolean;
  className?: string;
};

export function VantageLogo({
  size = "md",
  tone = "default",
  compact = false,
  className,
}: VantageLogoProps) {
  const src = compact ? icon : wordmark;
  const alt = compact ? "Vantage" : "VANTAGE";

  return (
    <img
      src={src}
      alt={alt}
      width={compact ? 36 : 200}
      height={compact ? 36 : 32}
      decoding="async"
      draggable={false}
      className={cn(
        "block shrink-0 select-none object-contain object-left",
        compact ? iconHeights[size] : wordmarkHeights[size],
        tones[tone],
        className,
      )}
    />
  );
}
