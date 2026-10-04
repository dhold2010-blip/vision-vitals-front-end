import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function GlassCard({
  children,
  className,
  interactive = false,
  as: As = "div",
}: {
  children: ReactNode;
  className?: string;
  interactive?: boolean;
  as?: "div" | "section" | "li" | "article";
}) {
  return (
    <As
      className={cn(
        "glass rounded-3xl",
        interactive &&
          "press cursor-pointer hover:border-primary/40 hover:shadow-[var(--shadow-glow)]",
        className,
      )}
    >
      {children}
    </As>
  );
}

export function SectionTitle({
  title,
  action,
  className,
}: {
  title: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-end justify-between px-1", className)}>
      <h2 className="text-[15px] font-semibold tracking-tight">{title}</h2>
      {action}
    </div>
  );
}

export function Chip({
  children,
  active = false,
  onClick,
}: {
  children: ReactNode;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "press rounded-full border px-3.5 py-1.5 text-xs font-medium whitespace-nowrap",
        active
          ? "border-primary/50 bg-primary/20 text-foreground shadow-[var(--shadow-glow)]"
          : "border-border bg-white/5 text-muted-foreground hover:text-foreground",
      )}
      aria-pressed={active}
    >
      {children}
    </button>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("shimmer rounded-2xl bg-white/5", className)} />;
}
