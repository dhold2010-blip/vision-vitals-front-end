import { measurementFields, type MeasurementFields } from "@/lib/measurement-inputs";
export function MeasurementSetup({
  fields,
  onChange,
  guided,
  onGuidedChange,
  disabled,
}: {
  fields: MeasurementFields;
  onChange: (fields: MeasurementFields) => void;
  guided: boolean;
  onGuidedChange: (enabled: boolean) => void;
  disabled: boolean;
}) {
  return (
    <details className="glass mt-5 rounded-2xl p-4">
      <summary className="cursor-pointer text-sm font-semibold">
        Add readings / guided height (optional)
      </summary>
      <p className="mt-3 text-xs text-muted-foreground">
        Saved with this scan only. Enter measured readings, not guesses. Leave unknown values blank.
        Adult BMI requires age 20+ and measured height and weight.
      </p>
      <fieldset disabled={disabled} className="mt-4 grid gap-3 sm:grid-cols-2">
        {measurementFields.map((f) => (
          <label key={f.key} className="text-sm">
            {f.label}
            <input
              type="number"
              inputMode={f.step === 1 ? "numeric" : "decimal"}
              min={f.min}
              max={f.max}
              step={f.step}
              value={fields[f.key] ?? ""}
              onChange={(e) => onChange({ ...fields, [f.key]: e.target.value })}
              className="mt-1 w-full rounded-xl border border-border bg-background p-3"
            />
            <span className="mt-1 block text-xs text-muted-foreground">{f.help}</span>
          </label>
        ))}
        <label className="mt-2 flex gap-2 text-sm sm:col-span-2">
          <input
            type="checkbox"
            checked={guided}
            onChange={(e) => onGuidedChange(e.target.checked)}
          />
          Guided reference-based height estimate
        </label>
        {guided && (
          <p className="text-xs text-muted-foreground sm:col-span-2">
            Before scanning: place a known-length vertical ruler or marked strip beside you at the
            same distance from the camera. Keep the camera level, stand upright and barefoot, and
            include your head, feet and full reference. After capture, you will mark its endpoints
            and your head/feet. A reference at another distance will give a wrong estimate.
          </p>
        )}
      </fieldset>
    </details>
  );
}
