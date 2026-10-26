import { useEffect, useState } from "react";

type LocalizedDateProps = {
  value: string;
  format?: "date" | "datetime";
};

export function LocalizedDate({ value, format = "datetime" }: LocalizedDateProps) {
  const [mounted, setMounted] = useState(false);
  const date = new Date(value);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (Number.isNaN(date.getTime())) {
    return <time>Date unavailable</time>;
  }

  const isoValue = date.toISOString();
  const localValue = format === "date" ? date.toLocaleDateString() : date.toLocaleString();

  return <time dateTime={isoValue}>{mounted ? localValue : isoValue}</time>;
}
