import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNaira(amount: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 2,
  })
    .format(amount)
    .replace("NGN", "₦")
    .replace("NGN ", "₦");
}

export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "decimal",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

export function formatStatusOrType(val: string | undefined | null): string {
  if (!val) return "";
  if (val.toLowerCase() === "service_charge") return "System Charge";

  return val.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}
