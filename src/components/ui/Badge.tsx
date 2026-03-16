import { clsx } from "clsx";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "error" | "info";
  size?: "sm" | "md";
  dot?: boolean;
}

const variants = {
  default: "bg-surface-active text-text-secondary border-surface-border",
  success: "bg-primary/10 text-primary border-primary/20",
  warning: "bg-status-warning/10 text-status-warning border-status-warning/20",
  error: "bg-status-error/10 text-status-error border-status-error/20",
  info: "bg-status-info/10 text-status-info border-status-info/20",
};

const dotColors = {
  default: "bg-text-muted",
  success: "bg-primary",
  warning: "bg-status-warning",
  error: "bg-status-error",
  info: "bg-status-info",
};

export default function Badge({ children, variant = "default", size = "md", dot }: BadgeProps) {
  return (
    <span className={clsx(
      "inline-flex items-center gap-1.5 font-medium border rounded-full",
      size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs",
      variants[variant]
    )}>
      {dot && (
        <span className={clsx("w-1.5 h-1.5 rounded-full flex-shrink-0", dotColors[variant])} />
      )}
      {children}
    </span>
  );
}
