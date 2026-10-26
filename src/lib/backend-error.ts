function readStringProperty(value: unknown, key: string): string | undefined {
  if (typeof value !== "object" || value === null || !(key in value)) return undefined;

  const property = (value as Record<string, unknown>)[key];
  return typeof property === "string" ? property : undefined;
}

export function getBackendErrorMessage(payload: unknown, fallback: string): string {
  if (typeof payload !== "object" || payload === null) return fallback;

  const response = payload as Record<string, unknown>;
  const errorMessage = readStringProperty(response.error, "message");
  const detail =
    typeof response.detail === "string"
      ? response.detail
      : readStringProperty(response.detail, "message");

  return errorMessage || detail || fallback;
}
