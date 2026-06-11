import { cn } from "@/lib/utils";

import { ImageWithFallback } from "../figma/ImageWithFallback";

interface BrandLogoProps {
  src?: string | null;
  alt?: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  containerClassName?: string;
  transparent?: boolean;
}

export function BrandLogo({
  src,
  alt,
  size = "md",
  className,
  containerClassName,
  transparent = false,
}: BrandLogoProps) {
  if (!src) return null;

  // Final widths in rem: 5rem (80px), 6rem (96px), 7.5rem (120px)
  const widths = {
    sm: "w-[5rem] md:w-[6rem] lg:w-[7.5rem]",
    md: "w-[7rem] md:w-[9rem] lg:w-[11rem]",
    lg: "w-[10rem] md:w-[15rem] lg:w-[20rem]",
    xl: "w-[15rem] md:w-[20rem] lg:w-[25rem]",
  };

  return (
    <div
      className={cn(
        transparent
          ? "bg-transparent border-none shadow-none p-0 flex items-center justify-center transition-all duration-300 hover:scale-[1.05] active:scale-[0.95] group/logo overflow-hidden h-auto"
          : "bg-white rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.2),0_15px_25px_-5px_rgba(0,0,0,0.1)] border border-slate-100 p-0 flex items-center justify-center transition-all duration-300 hover:shadow-[0_40px_70px_-12px_rgba(0,0,0,0.25)] hover:scale-[1.12] active:scale-[0.9] group/logo overflow-hidden h-auto",
        widths[size],
        containerClassName,
      )}
    >
      <ImageWithFallback
        src={src}
        alt={alt || "Logo"}
        fetchpriority="high"
        className={cn(
          "w-full h-auto object-contain drop-shadow-sm transition-transform duration-500",
          className,
        )}
      />
    </div>
  );
}
