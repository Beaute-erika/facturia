"use client";

import { clsx } from "clsx";

interface ToggleProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  size?: "sm" | "md";
}

export default function Toggle({ checked, onChange, label, description, disabled, size = "md" }: ToggleProps) {
  return (
    <label className={clsx("flex items-center gap-3 cursor-pointer group", disabled && "opacity-50 cursor-not-allowed")}>
      <button
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={clsx(
          "relative flex-shrink-0 rounded-full transition-all duration-200 focus:outline-none",
          size === "sm" ? "w-8 h-4.5" : "w-11 h-6",
          checked ? "bg-primary" : "bg-surface-active border border-surface-border"
        )}
      >
        <span className={clsx(
          "absolute top-0.5 rounded-full bg-white shadow transition-transform duration-200",
          size === "sm" ? "w-3.5 h-3.5" : "w-5 h-5",
          checked
            ? size === "sm" ? "translate-x-4" : "translate-x-5"
            : "translate-x-0.5"
        )} />
      </button>
      {(label || description) && (
        <div>
          {label && <p className={clsx("font-medium text-text-primary", size === "sm" ? "text-xs" : "text-sm")}>{label}</p>}
          {description && <p className="text-xs text-text-muted mt-0.5">{description}</p>}
        </div>
      )}
    </label>
  );
}
