"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { Button } from "@/app/components/ui/button";
import { AlertTriangle, Info, CheckCircle2, AlertCircle, LucideIcon } from "lucide-react";
import { cn } from "@/app/components/ui/utils";

export type ConfirmVariant = "default" | "destructive" | "warning" | "success" | "info";

interface ActionConfirmModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmVariant;
  isLoading?: boolean;
}

const variantStyles: Record<ConfirmVariant, { icon: LucideIcon, color: string, button: string }> = {
  default: {
    icon: Info,
    color: "text-blue-600 bg-blue-50",
    button: "bg-blue-600 hover:bg-blue-700",
  },
  info: {
    icon: Info,
    color: "text-blue-600 bg-blue-50",
    button: "bg-blue-600 hover:bg-blue-700",
  },
  destructive: {
    icon: AlertCircle,
    color: "text-red-600 bg-red-50",
    button: "bg-red-600 hover:bg-red-700",
  },
  warning: {
    icon: AlertTriangle,
    color: "text-amber-600 bg-amber-50",
    button: "bg-amber-600 hover:bg-amber-700",
  },
  success: {
    icon: CheckCircle2,
    color: "text-emerald-600 bg-emerald-50",
    button: "bg-emerald-600 hover:bg-emerald-700",
  },
};

export function ActionConfirmModal({
  isOpen,
  onOpenChange,
  onConfirm,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "default",
  isLoading = false,
}: ActionConfirmModalProps) {
  const Icon = variantStyles[variant].icon;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] overflow-hidden border-none shadow-2xl p-0">
        <div className="p-6 space-y-4">
          <div className="flex items-start gap-4">
            <div className={cn("p-3 rounded-full shrink-0", variantStyles[variant].color)}>
              <Icon className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold tracking-tight">
                  {title}
                </DialogTitle>
                <DialogDescription className="text-slate-500 text-sm leading-relaxed whitespace-pre-wrap pt-2">
                  {description}
                </DialogDescription>
              </DialogHeader>
            </div>
          </div>
        </div>
        
        <DialogFooter className="bg-slate-50/80 p-4 border-t flex flex-row gap-2 sm:gap-0 justify-end">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="text-slate-600 hover:bg-slate-200"
          >
            {cancelText}
          </Button>
          <Button
            onClick={() => {
              onConfirm();
            }}
            disabled={isLoading}
            className={cn("font-semibold shadow-sm transition-all active:scale-95", variantStyles[variant].button)}
          >
            {isLoading ? "Processing..." : confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
