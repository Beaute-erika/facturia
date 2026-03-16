import { clsx } from "clsx";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
  onClick?: () => void;
}

export default function Card({ children, className, glow, onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={clsx(
        "glass-card p-5 transition-all duration-200",
        glow && "shadow-glow hover:shadow-glow-lg",
        onClick && "cursor-pointer hover:border-primary/30",
        className
      )}
    >
      {children}
    </div>
  );
}
