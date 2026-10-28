import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

export function ReportDate({ value }: { value: string }) {
  // Older records may omit a UTC offset. Backend timestamps are stored in UTC.
  const normalized =
    /^\d{4}-\d{2}-\d{2}T/.test(value) && !/(Z|[+-]\d{2}:\d{2})$/.test(value) ? `${value}Z` : value;
  const date = new Date(normalized);
  const valid = Number.isFinite(date.getTime());
  const text = useSyncExternalStore(
    subscribe,
    () => (valid ? date.toLocaleString() : "Date unavailable"),
    () => (valid ? `${date.toISOString().slice(0, 16).replace("T", " ")} UTC` : "Date unavailable"),
  );
  return <time dateTime={valid ? date.toISOString() : undefined}>{text}</time>;
}
