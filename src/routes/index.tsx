import { requireAuthenticatedRoute } from "@/lib/route-auth";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, Bell, Flame, Heart, Ruler, Sparkles, Waves, Weight } from "lucide-react";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/vv/app-shell";
import { Chip, GlassCard, SectionTitle } from "@/components/vv/glass-card";
import { ProgressBar, ProgressRing } from "@/components/vv/progress";
import { aiTips, history, latestScan, profile } from "@/lib/vitals";

export const Route = createFileRoute("/")({
  beforeLoad: requireAuthenticatedRoute,
  head: () => ({
    meta: [
      { title: "VisionVitals AI — Camera-based body & health analysis" },
      {
        name: "description",
        content:
          "Stand in front of your camera and let VisionVitals AI estimate age, BMI, posture, symmetry and heart rate with a full health score.",
      },
      { property: "og:title", content: "VisionVitals AI — Camera-based body & health analysis" },
      {
        property: "og:description",
        content: "A premium AI health scanner: instant body analysis, trends and reports.",
      },
    ],
  }),
  component: Home,
});

const quick = [
  { icon: Ruler, label: "Height", value: `${latestScan.height} cm` },
  { icon: Weight, label: "Weight", value: `${latestScan.weight} kg` },
  { icon: Heart, label: "Resting HR", value: `${latestScan.heartRate} bpm` },
  { icon: Waves, label: "Hydration", value: `${latestScan.hydration}%` },
];

function Home() {
  const [greeting, setGreeting] = useState("Welcome back");
  useEffect(() => {
    const hour = new Date().getHours();
    setGreeting(hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening");
  }, []);

  return (
    <AppShell>
      <div className="animate-rise flex items-center justify-between">
        <Link to="/profile" className="press flex items-center gap-3">
          <span className="grid size-12 place-items-center rounded-2xl aurora text-base font-bold text-primary-foreground">
            {profile.name
              .split(" ")
              .map((n) => n[0])
              .join("")}
          </span>
          <span className="text-left">
            <span className="block text-xs text-muted-foreground">{greeting},</span>
            <span className="block text-[17px] font-semibold tracking-tight">{profile.name}</span>
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <span className="glass flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold">
            <Flame className="size-3.5 text-warning" />
            {profile.streak}
          </span>
          <button
            type="button"
            aria-label="Notifications"
            className="press glass grid size-10 place-items-center rounded-full"
          >
            <Bell className="size-4" />
          </button>
        </div>
      </div>

      <GlassCard className="animate-scale-in mt-6 overflow-hidden p-6 [animation-delay:80ms]">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
          <ProgressRing
            value={latestScan.score}
            size={168}
            caption="Health score"
            gradientId="home-ring"
          />
          <div className="flex-1">
            <p className="text-[11px] font-semibold tracking-[0.18em] text-secondary uppercase">
              {latestScan.capturedAt}
            </p>
            <p className="mt-2 text-lg leading-snug font-semibold">
              You are up <span className="text-success">{latestScan.delta} points</span> this week.
            </p>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Posture and resting heart rate carried the gain. Confidence {latestScan.confidence}%.
            </p>
            <div className="mt-5 grid gap-3">
              <ProgressBar value={latestScan.posture} label="Posture" tone="secondary" />
              <ProgressBar value={latestScan.symmetry} label="Face symmetry" tone="accent" />
            </div>
          </div>
        </div>
      </GlassCard>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {quick.map(({ icon: Icon, label, value }, i) => (
          <GlassCard key={label} className="animate-rise p-4" interactive>
            <div style={{ animationDelay: `${120 + i * 60}ms` }}>
              <Icon className="size-4 text-secondary" />
              <p className="mt-3 text-lg font-bold tracking-tight tabular-nums">{value}</p>
              <p className="text-[11px] text-muted-foreground">{label}</p>
            </div>
          </GlassCard>
        ))}
      </div>

      <GlassCard className="animate-rise mt-4 flex items-center gap-4 p-5" interactive>
        <Link to="/scan" className="flex flex-1 items-center gap-4">
          <span className="relative grid size-14 shrink-0 place-items-center rounded-2xl aurora">
            <span className="animate-pulse-ring absolute inset-0 rounded-2xl border border-secondary/50" />
            <Sparkles className="size-6 text-primary-foreground" />
          </span>
          <span>
            <span className="block text-[15px] font-semibold">Start a quick scan</span>
            <span className="block text-xs text-muted-foreground">
              14 seconds · full body and face analysis
            </span>
          </span>
          <ArrowUpRight className="ml-auto size-5 text-muted-foreground" />
        </Link>
      </GlassCard>

      <SectionTitle
        className="mt-8 mb-3"
        title="AI tips for you"
        action={<span className="text-xs text-secondary">Updated daily</span>}
      />
      <div className="-mx-5 flex snap-x gap-3 overflow-x-auto px-5 pb-1 sm:mx-0 sm:px-0">
        {aiTips.map((tip) => (
          <GlassCard key={tip} className="w-[250px] shrink-0 snap-start p-5">
            <Sparkles className="size-4 text-accent" />
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{tip}</p>
          </GlassCard>
        ))}
      </div>

      <SectionTitle
        className="mt-8 mb-3"
        title="Recent reports"
        action={
          <Link to="/history" className="text-xs font-medium text-secondary">
            See all
          </Link>
        }
      />
      <ul className="grid gap-3">
        {history.slice(0, 3).map((scan) => (
          <GlassCard as="li" key={scan.id} className="p-4" interactive>
            <Link to="/results" className="flex items-center gap-4">
              <ProgressRing value={scan.score} size={54} stroke={5} gradientId={`ring-${scan.id}`}>
                <span className="text-sm font-bold tabular-nums">{scan.score}</span>
              </ProgressRing>
              <div className="flex-1">
                <p className="text-sm font-semibold">
                  {scan.date} · {scan.time}
                </p>
                <p className="text-xs text-muted-foreground">
                  BMI {scan.bmi} · {scan.weight} kg · {scan.heartRate} bpm
                </p>
              </div>
              <Chip>{scan.tag}</Chip>
            </Link>
          </GlassCard>
        ))}
      </ul>
    </AppShell>
  );
}
