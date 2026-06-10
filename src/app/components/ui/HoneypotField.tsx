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
  name = "website",
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
      <input
        type="text"
        name={name}
        value={value}
        onChange={onChange}
        tabIndex={-1}
        autoComplete="off"
      />
    </div>
  );
};
