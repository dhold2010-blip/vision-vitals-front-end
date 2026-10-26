import { getCurrentUser } from "@/lib/auth";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { ArrowUpRight, ClipboardList, ScanFace, ShieldCheck, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/vv/app-shell";
import { GlassCard, SectionTitle } from "@/components/vv/glass-card";
import { LocalizedDate } from "@/components/vv/localized-date";
import { getMyProfile, listAnalyses } from "@/lib/records";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    if (!(await getCurrentUser())) throw redirect({ to: "/auth" });
  },
  loader: async () => {
    const [profile, analyses] = await Promise.all([getMyProfile(), listAnalyses()]);
    return { profile, analyses };
  },
  head: () => ({
    meta: [
      { title: "VisionVitals AI — Your scan dashboard" },
      {
        name: "description",
        content: "Access your saved VisionVitals analyses and start a new camera scan.",
      },
      { property: "og:title", content: "VisionVitals AI — Your scan dashboard" },
      {
        property: "og:description",
        content: "Your saved analyses, account and camera scan.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const { profile, analyses } = Route.useLoaderData();
  const [greeting, setGreeting] = useState("Welcome");
  useEffect(() => {
    const hour = new Date().getHours();
    setGreeting(hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening");
  }, []);

  const displayName = profile.profile.display_name?.trim() || profile.user.email;
  const latest = analyses[0];

  return (
    <AppShell>
      <div className="animate-rise flex items-center justify-between">
        <Link to="/profile" className="press flex min-w-0 items-center gap-3">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl aurora text-base font-bold text-primary-foreground">
            {displayName.slice(0, 1).toUpperCase()}
          </span>
          <span className="min-w-0 text-left">
            <span className="block text-xs text-muted-foreground">{greeting},</span>
            <span className="block truncate text-[17px] font-semibold tracking-tight">{displayName}</span>
          </span>
        </Link>
        <span className="glass flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold">
          <ShieldCheck className="size-3.5 text-secondary" />
          Private account
        </span>
      </div>

      <GlassCard className="animate-scale-in mt-6 overflow-hidden p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <span className="grid size-16 shrink-0 place-items-center rounded-2xl aurora">
            <ScanFace className="size-8 text-primary-foreground" />
          </span>
          <div className="flex-1">
            <p className="text-[11px] font-semibold tracking-[0.18em] text-secondary uppercase">
              Your VisionVitals
            </p>
            <h1 className="mt-2 text-xl font-semibold">
              {latest ? "Your latest saved analysis" : "Start with your first scan"}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {latest ? (
                <>
                  Latest analysis: <LocalizedDate value={latest.created_at} />. Status:{" "}
                  {latest.result?.result_status ?? latest.status}.
                </>
              ) : (
                "When you complete a scan, its available analysis and warnings will appear here. No sample health measurements are shown."
              )}
            </p>
            {latest?.result?.observation ? (
              <p className="mt-2 text-sm leading-relaxed">{latest.result.observation}</p>
            ) : null}
          </div>
        </div>
      </GlassCard>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <GlassCard className="p-4">
          <ClipboardList className="size-4 text-secondary" />
          <p className="mt-3 text-2xl font-bold tabular-nums">{analyses.length}</p>
          <p className="text-xs text-muted-foreground">Saved analyses</p>
        </GlassCard>
        <GlassCard className="p-4">
          <ShieldCheck className="size-4 text-secondary" />
          <p className="mt-3 text-sm font-semibold">Account-scoped</p>
          <p className="text-xs text-muted-foreground">Records loaded after sign-in</p>
        </GlassCard>
      </div>

      <GlassCard className="animate-rise mt-4 flex items-center gap-4 p-5" interactive>
        <Link to="/scan" className="flex flex-1 items-center gap-4">
          <span className="relative grid size-14 shrink-0 place-items-center rounded-2xl aurora">
            <span className="animate-pulse-ring absolute inset-0 rounded-2xl border border-secondary/50" />
            <Sparkles className="size-6 text-primary-foreground" />
          </span>
          <span>
            <span className="block text-[15px] font-semibold">Start a camera scan</span>
            <span className="block text-xs text-muted-foreground">
              Camera permission is requested when needed
            </span>
          </span>
          <ArrowUpRight className="ml-auto size-5 text-muted-foreground" />
        </Link>
      </GlassCard>

      <SectionTitle
        className="mt-8 mb-3"
        title="Recent analyses"
        action={
          <Link to="/history" className="text-xs font-medium text-secondary">
            See all
          </Link>
        }
      />
      {analyses.length ? (
        <ul className="grid gap-3">
          {analyses.slice(0, 3).map((analysis) => (
            <GlassCard as="li" key={analysis.id} className="p-4">
              <p className="text-sm font-semibold">
                <LocalizedDate value={analysis.created_at} />
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {analysis.result?.result_status ?? analysis.status}
                {analysis.result?.confidence != null
                  ? ` · ${Math.round(analysis.result.confidence * 100)}% confidence`
                  : ""}
              </p>
              {analysis.result?.observation ? (
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {analysis.result.observation}
                </p>
              ) : null}
            </GlassCard>
          ))}
        </ul>
      ) : (
        <GlassCard className="p-5">
          <p className="text-sm text-muted-foreground">
            No saved analyses yet. After your first scan, the backend's returned result will be shown here.
          </p>
        </GlassCard>
      )}
      <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
        VisionVitals analysis is informational and may be uncertain. It is not a medical diagnosis or a substitute for professional care.
      </p>
    </AppShell>
  );
}
