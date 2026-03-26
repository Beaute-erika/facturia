"use client";

import { Sparkles } from "lucide-react";
import { clsx } from "clsx";
import { useAgent, type AgentContextType } from "./AgentContext";

interface AgentButtonProps {
  context: AgentContextType;
  label?: string;
  variant?: "icon" | "compact" | "full";
  className?: string;
}

export default function AgentButton({
  context,
  label = "Demander à l'IA",
  variant = "compact",
  className,
}: AgentButtonProps) {
  const { openAgent } = useAgent();

  if (variant === "icon") {
    return (
      <button
        onClick={(e) => { e.stopPropagation(); openAgent(context); }}
        title={label}
        className={clsx(
          "p-1.5 rounded-lg text-text-muted hover:text-primary hover:bg-primary/10 transition-all",
          className
        )}
      >
        <Sparkles className="w-4 h-4" />
      </button>
    );
  }

  if (variant === "full") {
    return (
      <button
        onClick={(e) => { e.stopPropagation(); openAgent(context); }}
        className={clsx(
          "flex items-center justify-center gap-2 px-4 py-2 rounded-xl",
          "bg-primary/10 border border-primary/20 text-primary",
          "hover:bg-primary/20 transition-all text-sm font-semibold",
          className
        )}
      >
        <Sparkles className="w-4 h-4" />
        {label}
      </button>
    );
  }

  // compact (default)
  return (
    <button
      onClick={(e) => { e.stopPropagation(); openAgent(context); }}
      className={clsx(
        "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg",
        "bg-primary/10 border border-primary/15 text-primary",
        "hover:bg-primary/20 transition-all text-xs font-semibold",
        className
      )}
    >
      <Sparkles className="w-3.5 h-3.5" />
      IA
    </button>
  );
}
