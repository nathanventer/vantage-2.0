import logoUrl from "@/assets/vantage-logo.png";
import { cn } from "@/lib/utils";

const sizes = {
  sm: "h-8",
  md: "h-11",
  lg: "h-14",
} as const;

type VantageLogoProps = {
  size?: keyof typeof sizes;
  /** Invert for readability on light backgrounds */
  onLight?: boolean;
  className?: string;
};

export function VantageLogo({ size = "md", onLight = false, className }: VantageLogoProps) {
  return (
    <img
      src={logoUrl}
      alt="Vantage"
      className={cn(
        sizes[size],
        "w-auto shrink-0 object-contain",
        onLight && "brightness-0 invert",
        className,
      )}
    />
  );
}
