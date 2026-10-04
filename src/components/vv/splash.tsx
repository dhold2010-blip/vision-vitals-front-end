import { useEffect, useState } from "react";
import { Activity } from "lucide-react";
import { cn } from "@/lib/utils";

export function Splash() {
  const [phase, setPhase] = useState<"in" | "out" | "gone">("in");

  useEffect(() => {
    const a = window.setTimeout(() => setPhase("out"), 1500);
    const b = window.setTimeout(() => setPhase("gone"), 2200);
    return () => {
      window.clearTimeout(a);
      window.clearTimeout(b);
    };
  }, []);

  if (phase === "gone") return null;

  return (
    <div
      aria-hidden="true"
      className={cn(
        "fixed inset-0 z-[60] grid place-items-center bg-background transition-opacity duration-700 ease-[var(--ease-smooth)]",
        phase === "out" ? "pointer-events-none opacity-0" : "opacity-100",
      )}
    >
      <div className="absolute -top-20 left-1/4 size-72 rounded-full bg-primary/30 blur-[120px]" />
      <div className="absolute -bottom-16 right-1/4 size-72 rounded-full bg-accent/30 blur-[120px]" />
      <div className="relative text-center">
        <div className="relative mx-auto grid size-28 place-items-center">
          <span className="animate-spin-slow absolute inset-0 rounded-full border-t-2 border-secondary/70" />
          <span className="animate-spin-slow absolute inset-3 rounded-full border-b-2 border-accent/70 [animation-direction:reverse]" />
          <span className="animate-pulse-ring absolute inset-5 rounded-full border border-primary/60" />
          <span className="grid size-16 place-items-center rounded-3xl aurora shadow-[var(--shadow-glow)]">
            <Activity className="size-7 text-primary-foreground" />
          </span>
        </div>
        <p className="animate-rise mt-8 text-xl font-extrabold tracking-tight [animation-delay:200ms]">
          Vision<span className="text-gradient">Vitals</span> AI
        </p>
        <p className="animate-rise mt-2 text-xs tracking-[0.2em] text-muted-foreground uppercase [animation-delay:350ms]">
          Analysing you, beautifully
        </p>
        <div className="mx-auto mt-7 h-1 w-40 overflow-hidden rounded-full bg-white/10">
          <div className="shimmer h-full w-full rounded-full aurora" />
        </div>
      </div>
    </div>
  );
}
