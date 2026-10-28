import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Activity, Lock, ScanFace } from "lucide-react";
import { useState } from "react";
import { Backdrop } from "@/components/vv/app-shell";
import { GlassCard } from "@/components/vv/glass-card";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "How VisionVitals AI works" },
      {
        name: "description",
        content: "Learn how camera capture, visual observations, and server processing work.",
      },
      { property: "og:title", content: "How VisionVitals AI works" },
      { property: "og:description", content: "Scan, analyse, stay private — a 60 second tour." },
    ],
  }),
  component: Onboarding,
});

const steps = [
  {
    icon: ScanFace,
    eyebrow: "Step one",
    title: "Capture one clear photo",
    body: "Allow camera access, include the body parts you want described, and hold still while the app captures one photo.",
  },
  {
    icon: Activity,
    eyebrow: "Step two",
    title: "Observations from your photo",
    body: "See observations about framing, lighting, and visible body position. This scan does not measure clinical vitals or calculate a health score.",
  },
  {
    icon: Lock,
    eyebrow: "Step three",
    title: "Know where your photo goes",
    body: "Your photo is uploaded to the VisionVitals backend and sent to Google Gemini for analysis. Reports are saved to your account; you can delete reports and their stored images from History.",
  },
];

function Onboarding() {
  const [i, setI] = useState(0);
  const navigate = useNavigate();
  const step = steps[i] ?? steps[0]!;
  const Icon = step.icon;
  const last = i === steps.length - 1;

  return (
    <div className="relative min-h-dvh">
      <Backdrop />
      <div className="relative mx-auto flex min-h-dvh w-full max-w-lg flex-col px-6 py-8">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold tracking-tight">
            Vision<span className="text-gradient">Vitals</span>
          </span>
          <Link to="/auth" className="press text-xs font-medium text-muted-foreground">
            Skip
          </Link>
        </div>

        <div className="flex flex-1 flex-col justify-center">
          <div key={i} className="animate-rise">
            <GlassCard className="relative overflow-hidden p-8">
              <span className="animate-float absolute -top-16 -right-16 size-48 rounded-full bg-accent/25 blur-3xl" />
              <span className="relative grid size-16 place-items-center rounded-3xl aurora">
                <span className="animate-pulse-ring absolute inset-0 rounded-3xl border border-secondary/50" />
                <Icon className="size-7 text-primary-foreground" />
              </span>
              <p className="mt-8 text-[11px] font-semibold tracking-[0.18em] text-secondary uppercase">
                {step.eyebrow}
              </p>
              <h1 className="mt-2 text-[30px] leading-[1.1] font-extrabold tracking-tight">
                {step.title}
              </h1>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
            </GlassCard>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex gap-2" aria-hidden="true">
            {steps.map((s, idx) => (
              <span
                key={s.title}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-500 ease-[var(--ease-smooth)]",
                  idx === i ? "w-8 bg-secondary" : "w-1.5 bg-white/20",
                )}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => (last ? navigate({ to: "/auth" }) : setI(i + 1))}
            className="press flex items-center gap-2 rounded-full aurora px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)]"
          >
            {last ? "Get started" : "Next"}
            <ArrowRight className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
