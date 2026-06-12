import React from "react";

interface HoneypotFieldProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  name?: string;
}

/**
 * A visually hidden input field for honeypot validation.
 */
export const HoneypotField: React.FC<HoneypotFieldProps> = ({
  value,
  onChange,
  name = "honeypot",
}) => {
  return (
    <div
      style={{
        position: "absolute",
        opacity: 0,
        zIndex: -1,
        left: "-9999px",
        height: 0,
        width: 0,
        overflow: "hidden",
      }}
      aria-hidden="true"
    >
      <textarea
        name={name}
        value={value}
        onChange={onChange as any}
        tabIndex={-1}
        autoComplete="new-password"
        data-lpignore="true"
        data-form-type="other"
        data-1p-ignore="true"
      />
    </div>
  );
};
