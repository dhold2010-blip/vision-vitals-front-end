import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft, Pencil, Target } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/vv/app-shell";
import { Chip, GlassCard, SectionTitle } from "@/components/vv/glass-card";
import { ProgressBar } from "@/components/vv/progress";
import { profile } from "@/lib/vitals";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Your profile — VisionVitals AI" },
      {
        name: "description",
        content:
          "Your avatar, age, gender, height, weight and body goals used to calibrate every AI scan.",
      },
      { property: "og:title", content: "Your profile — VisionVitals AI" },
      { property: "og:description", content: "Profile details that calibrate your scans." },
    ],
  }),
  component: Profile,
});

const facts = [
  { label: "Age", value: `${profile.age}` },
  { label: "Gender", value: profile.gender },
  { label: "Height", value: `${profile.height} cm` },
  { label: "Weight", value: `${profile.weight} kg` },
];

function Profile() {
  return (
    <AppShell>
      <div className="animate-rise mb-6 flex items-center justify-between">
        <Link
          to="/settings"
          aria-label="Back"
          className="press glass grid size-10 place-items-center rounded-full"
        >
          <ChevronLeft className="size-4" />
        </Link>
        <button
          type="button"
          onClick={() => toast("Profile editor opened")}
          className="press glass flex items-center gap-2 rounded-full px-4 py-2.5 text-xs font-medium"
        >
          <Pencil className="size-3.5 text-secondary" /> Edit
        </button>
      </div>

      <GlassCard className="animate-scale-in p-7 text-center">
        <span className="mx-auto grid size-24 place-items-center rounded-[32px] aurora text-2xl font-extrabold text-primary-foreground">
          {profile.name
            .split(" ")
            .map((n) => n[0])
            .join("")}
        </span>
        <h1 className="mt-5 text-2xl font-extrabold tracking-tight">{profile.name}</h1>
        <p className="text-sm text-muted-foreground">
          {profile.handle} · {profile.plan}
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Chip active>{profile.streak} day streak</Chip>
          <Chip>Mesomorph</Chip>
        </div>
      </GlassCard>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {facts.map((f) => (
          <GlassCard key={f.label} className="p-4 text-center">
            <p className="text-lg font-bold tracking-tight tabular-nums">{f.value}</p>
            <p className="text-[11px] text-muted-foreground">{f.label}</p>
          </GlassCard>
        ))}
      </div>

      <SectionTitle className="mt-8 mb-3" title="Goal" />
      <GlassCard className="p-5">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-white/6">
            <Target className="size-4 text-secondary" />
          </span>
          <div>
            <p className="text-sm font-semibold">{profile.goal}</p>
            <p className="text-xs text-muted-foreground">4.4 kg to go · on track for 18 June</p>
          </div>
        </div>
        <div className="mt-5 grid gap-3">
          <ProgressBar value={62} label="Goal progress" tone="success" />
          <ProgressBar value={78} label="Weekly consistency" tone="secondary" />
        </div>
      </GlassCard>
    </AppShell>
  );
}
