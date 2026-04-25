import * as React from "react";

import { Eye, EyeOff } from "lucide-react";

import { Button } from "./button";
import { Input } from "./input";

type PasswordInputProps = React.ComponentProps<"input">;

const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, ...props }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false);

    return (
      <div className="relative">
        <Input
          type={showPassword ? "text" : "password"}
          className={className}
          ref={ref}
          {...props}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 p-0 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-400 hover:text-emerald-600 z-20"
          onClick={() => setShowPassword((prev) => !prev)}
          tabIndex={-1}
        >
          {showPassword ? (
            <EyeOff className="h-5 w-5" aria-hidden="true" />
          ) : (
            <Eye className="h-5 w-5" aria-hidden="true" />
          )}
          <span className="sr-only">{showPassword ? "Hide password" : "Show password"}</span>
        </Button>
      </div>
    );
  },
);
PasswordInput.displayName = "PasswordInput";

export { PasswordInput };
