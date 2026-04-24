import { cn } from "@/lib/utils";
import { ImageWithFallback } from "../figma/ImageWithFallback";

interface BrandLogoProps {
  src?: string | null;
  alt?: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  containerClassName?: string;
}

export function BrandLogo({ src, alt, size = "md", className, containerClassName }: BrandLogoProps) {
  if (!src) return null;

  const heights = {
    sm: "h-10 md:h-12",
    md: "h-14 md:h-18",
    lg: "h-20 md:h-28",
    xl: "h-32 md:h-40"
  };

  return (
    <div className={cn(
      "bg-white rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1),0_10px_15px_-3px_rgba(0,0,0,0.05)] border border-slate-100 p-2 flex items-center justify-center transition-all duration-300 hover:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.15)] hover:scale-[1.08] active:scale-[0.95] group/logo",
      heights[size],
      containerClassName
    )}>
      <ImageWithFallback
        src={src}
        alt={alt || "Logo"}
        className={cn("h-full w-auto object-contain max-w-full drop-shadow-sm transition-transform duration-500", className)}
      />
    </div>
  );
}
