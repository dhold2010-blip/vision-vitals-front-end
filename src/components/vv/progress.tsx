import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

export function ProgressRing({
  value,
  size = 160,
  stroke = 12,
  label,
  caption,
  gradientId = "vv-ring",
  className,
  children,
}: {
  value: number;
  size?: number;
  stroke?: number;
  label?: string;
  caption?: string;
  gradientId?: string;
  className?: string;
  children?: ReactNode;
}) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const t = window.setTimeout(() => setShown(value), 120);
    return () => window.clearTimeout(t);
  }, [value]);

  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;

  return (
    <div
      className={cn("relative grid place-items-center", className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--color-chart-3)" />
            <stop offset="50%" stopColor="var(--color-chart-1)" />
            <stop offset="100%" stopColor="var(--color-chart-2)" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          className="stroke-white/8"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          stroke={`url(#${gradientId})`}
          strokeDasharray={c}
          strokeDashoffset={c - (c * shown) / 100}
          style={{ transition: "stroke-dashoffset 1.2s var(--ease-smooth)" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        {children ?? (
          <div>
            <div className="text-4xl font-extrabold tracking-tight tabular-nums">
              {label ?? value}
            </div>
            {caption ? (
              <div className="mt-0.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                {caption}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

export function ProgressBar({
  value,
  label,
  right,
  tone = "primary",
}: {
  value: number;
  label: string;
  right?: string;
  tone?: "primary" | "secondary" | "accent" | "success" | "warning";
}) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const t = window.setTimeout(() => setShown(value), 150);
    return () => window.clearTimeout(t);
  }, [value]);

  const toneClass = {
    primary: "bg-primary",
    secondary: "bg-secondary",
    accent: "bg-accent",
    success: "bg-success",
    warning: "bg-warning",
  }[tone];

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between text-xs">
        <span className="font-medium text-muted-foreground">{label}</span>
        <span className="font-semibold tabular-nums">{right ?? `${value}%`}</span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-white/8"
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div
          className={cn("h-full rounded-full", toneClass)}
          style={{ width: `${shown}%`, transition: "width 1s var(--ease-smooth)" }}
        />
      </div>
    </div>
  );
}
