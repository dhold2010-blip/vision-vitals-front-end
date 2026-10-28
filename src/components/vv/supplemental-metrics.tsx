import { measurementSource, type SupplementalMetrics } from "@/lib/measurement-inputs";
import { GlassCard, SectionTitle } from "./glass-card";
export function AdditionalMeasurements({ report }: { report: SupplementalMetrics }) {
  return (
    <section className="mt-6" aria-label="Additional measurements">
      <SectionTitle title="Readings and reference estimates" className="mb-3" />
      <p className="mb-3 text-sm text-muted-foreground">
        Entered readings, calculated BMI, and a guided photo estimate are labeled separately.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {report.metrics.map((m) => (
          <GlassCard key={m.key} className="p-5">
            <h3 className="text-sm font-semibold">{m.label}</h3>
            <p className="mt-2 text-2xl font-bold text-secondary">
              {m.value === null ? "—" : `${m.value} ${m.unit}`}
            </p>
            <p className="mt-1 text-xs font-semibold">{measurementSource(m)}</p>
            <p className="mt-2 text-xs text-muted-foreground">{m.reason}</p>
          </GlassCard>
        ))}
      </div>
    </section>
  );
}
