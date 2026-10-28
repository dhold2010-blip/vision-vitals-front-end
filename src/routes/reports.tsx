import { createFileRoute } from "@tanstack/react-router";
import { Download, Share2, Sparkles } from "lucide-react";
import { useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import { AppShell, PageHeader } from "@/components/vv/app-shell";
import { Chip, GlassCard, SectionTitle } from "@/components/vv/glass-card";
import { compositionSplit, monthlyTrend, weeklyTrend } from "@/lib/vitals";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Progress reports — VisionVitals AI" },
      {
        name: "description",
        content:
          "Weekly and monthly progress charts for your health score, posture, resting heart rate and weight, with an AI written summary.",
      },
      { property: "og:title", content: "Progress reports — VisionVitals AI" },
      {
        property: "og:description",
        content: "Charts and AI summaries of your body analysis trends.",
      },
    ],
  }),
  component: Reports,
});

const tooltipStyle = {
  background: "color-mix(in oklab, var(--color-background) 90%, transparent)",
  border: "1px solid var(--color-border)",
  borderRadius: 14,
  fontSize: 12,
  color: "var(--color-foreground)",
} as const;

function Reports() {
  const [range, setRange] = useState<"Weekly" | "Monthly">("Weekly");

  return (
    <AppShell>
      <p className="mb-5 rounded-2xl border border-warning/30 bg-warning/10 p-4 text-sm text-muted-foreground">
        Sample dashboard data — these numbers are not measurements from your camera scan. Your real
        photo report appears after scanning.
      </p>
      <PageHeader
        eyebrow="Analytics"
        title="Reports"
        subtitle="How your body is trending over time"
      />

      <div className="mb-4 flex gap-2">
        {(["Weekly", "Monthly"] as const).map((r) => (
          <Chip key={r} active={r === range} onClick={() => setRange(r)}>
            {r}
          </Chip>
        ))}
      </div>

      <GlassCard className="animate-scale-in p-5">
        <div className="flex items-baseline justify-between">
          <p className="text-sm font-semibold">Health score</p>
          <p className="text-xs text-success">+8 this {range === "Weekly" ? "week" : "quarter"}</p>
        </div>
        <div className="mt-4 h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={range === "Weekly" ? weeklyTrend : monthlyTrend}>
              <defs>
                <linearGradient id="scoreFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.65} />
                  <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--color-border)" vertical={false} />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                fontSize={11}
                stroke="var(--color-muted-foreground)"
              />
              <YAxis
                width={28}
                tickLine={false}
                axisLine={false}
                fontSize={11}
                stroke="var(--color-muted-foreground)"
                domain={[60, 100]}
              />
              <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: "var(--color-secondary)" }} />
              <Area
                type="monotone"
                dataKey="score"
                stroke="var(--color-chart-2)"
                strokeWidth={2.5}
                fill="url(#scoreFill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </GlassCard>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <GlassCard className="p-5">
          <p className="text-sm font-semibold">Posture vs resting HR</p>
          <div className="mt-4 h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyTrend} barGap={4}>
                <CartesianGrid stroke="var(--color-border)" vertical={false} />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                  stroke="var(--color-muted-foreground)"
                />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                <Bar dataKey="posture" fill="var(--color-chart-1)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="hr" fill="var(--color-chart-3)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard className="p-5">
          <p className="text-sm font-semibold">Body composition</p>
          <div className="mt-2 flex items-center gap-4">
            <div className="h-40 w-40">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={compositionSplit}
                    dataKey="value"
                    nameKey="label"
                    innerRadius={44}
                    outerRadius={64}
                    paddingAngle={3}
                    stroke="none"
                  >
                    {compositionSplit.map((c) => (
                      <Cell key={c.label} fill={c.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="grid gap-2.5">
              {compositionSplit.map((c) => (
                <li key={c.label} className="flex items-center gap-2 text-xs">
                  <span className="size-2.5 rounded-full" style={{ background: c.color }} />
                  <span className="text-muted-foreground">{c.label}</span>
                  <span className="font-semibold tabular-nums">{c.value}%</span>
                </li>
              ))}
            </ul>
          </div>
        </GlassCard>
      </div>

      <SectionTitle className="mt-8 mb-3" title="AI summary" />
      <GlassCard className="p-5">
        <Sparkles className="size-4 text-accent" />
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Over the last five weeks your health score climbed from 68 to 86 while measured weight
          fell 1.9 kg. The strongest driver was posture, up 10 points after your forward head
          carriage narrowed from 19° to 12°. Resting heart rate is trending down at roughly 1 bpm
          per week, which usually follows improved sleep consistency. Keep the current cadence and
          your projected score for next month is 89.
        </p>
        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={() => toast.success("Downloading monthly-report.pdf")}
            className="press flex flex-1 items-center justify-center gap-2 rounded-2xl aurora py-3 text-sm font-semibold text-primary-foreground"
          >
            <Download className="size-4" /> Download PDF
          </button>
          <button
            type="button"
            onClick={() => toast("Share link copied")}
            className="press glass flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-medium"
          >
            <Share2 className="size-4" /> Share
          </button>
        </div>
      </GlassCard>
    </AppShell>
  );
}
