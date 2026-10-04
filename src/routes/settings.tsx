import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Bell,
  ChevronRight,
  FileText,
  Globe,
  LogOut,
  Moon,
  Ruler,
  ShieldCheck,
  CircleQuestionMark,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell, PageHeader } from "@/components/vv/app-shell";
import { GlassCard, SectionTitle } from "@/components/vv/glass-card";
import { profile } from "@/lib/vitals";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — VisionVitals AI" },
      {
        name: "description",
        content:
          "Control appearance, notifications, privacy, language, measurement units and your account.",
      },
      { property: "og:title", content: "Settings — VisionVitals AI" },
      { property: "og:description", content: "Appearance, privacy and account controls." },
    ],
  }),
  component: SettingsScreen,
});

function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "press relative h-7 w-12 rounded-full border transition-colors duration-300",
        checked ? "border-transparent aurora" : "border-border bg-white/8",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 size-5.5 rounded-full bg-white shadow transition-all duration-300 ease-[var(--ease-smooth)]",
          checked ? "left-[calc(100%-1.5rem)]" : "left-0.5",
        )}
      />
    </button>
  );
}

function Row({
  icon: Icon,
  label,
  hint,
  right,
  onClick,
}: {
  icon: typeof Bell;
  label: string;
  hint?: string;
  right?: React.ReactNode;
  onClick?: () => void;
}) {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      {...(onClick ? { type: "button" as const, onClick } : {})}
      className="flex w-full items-center gap-3.5 px-5 py-4 text-left"
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/6">
        <Icon className="size-4 text-secondary" />
      </span>
      <span className="flex-1">
        <span className="block text-sm font-medium">{label}</span>
        {hint ? <span className="block text-xs text-muted-foreground">{hint}</span> : null}
      </span>
      {right ?? <ChevronRight className="size-4 text-muted-foreground" />}
    </Comp>
  );
}

function SettingsScreen() {
  const [dark, setDark] = useState(true);
  const [notify, setNotify] = useState(true);
  const [analytics, setAnalytics] = useState(false);
  const [metric, setMetric] = useState(true);

  return (
    <AppShell>
      <PageHeader
        eyebrow="Preferences"
        title="Settings"
        subtitle={`${profile.plan} · renews 12 Apr`}
      />

      <GlassCard className="animate-scale-in p-5" interactive>
        <Link to="/profile" className="flex items-center gap-4">
          <span className="grid size-14 place-items-center rounded-2xl aurora text-lg font-bold text-primary-foreground">
            {profile.name
              .split(" ")
              .map((n) => n[0])
              .join("")}
          </span>
          <span className="flex-1">
            <span className="block text-[15px] font-semibold">{profile.name}</span>
            <span className="block text-xs text-muted-foreground">
              {profile.age} · {profile.height} cm · {profile.weight} kg
            </span>
          </span>
          <ChevronRight className="size-4 text-muted-foreground" />
        </Link>
      </GlassCard>

      <SectionTitle className="mt-8 mb-3" title="Appearance & alerts" />
      <GlassCard className="divide-y divide-border overflow-hidden">
        <Row
          icon={Moon}
          label="Dark mode"
          hint="Deep space theme"
          right={<Switch checked={dark} onChange={setDark} label="Dark mode" />}
        />
        <Row
          icon={Bell}
          label="Scan reminders"
          hint="Daily at 08:00"
          right={<Switch checked={notify} onChange={setNotify} label="Scan reminders" />}
        />
        <Row
          icon={Ruler}
          label="Units"
          hint={metric ? "Metric · cm / kg" : "Imperial · ft / lb"}
          right={<Switch checked={metric} onChange={setMetric} label="Metric units" />}
        />
        <Row
          icon={Globe}
          label="Language"
          hint="English (UK)"
          onClick={() => toast("12 languages available")}
        />
      </GlassCard>

      <SectionTitle className="mt-8 mb-3" title="Privacy" />
      <GlassCard className="divide-y divide-border overflow-hidden">
        <Row
          icon={ShieldCheck}
          label="On-device processing"
          hint="Scans never leave your phone"
          right={
            <Switch
              checked={!analytics}
              onChange={(v) => setAnalytics(!v)}
              label="On-device processing"
            />
          }
        />
        <Row
          icon={FileText}
          label="Terms & privacy policy"
          onClick={() => toast("Opening policy")}
        />
        <Row
          icon={CircleQuestionMark}
          label="Help centre"
          hint="Guides and troubleshooting"
          onClick={() => toast("Help centre")}
        />
      </GlassCard>

      <button
        type="button"
        onClick={() => toast("Signed out")}
        className="press glass mt-6 flex w-full items-center justify-center gap-2 rounded-3xl py-4 text-sm font-semibold text-destructive"
      >
        <LogOut className="size-4" /> Log out
      </button>

      <p className="mt-6 text-center text-[11px] text-muted-foreground">
        VisionVitals AI · version 2.4.0
      </p>
    </AppShell>
  );
}
