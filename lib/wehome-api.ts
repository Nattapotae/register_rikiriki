const DEFAULT_BASE_URL = "https://api-pos-wehome-test.gbhpos.com";

export type WeHomeApiEnvelope<T> = {
  status?: number;
  message?: string;
  data?: T;
};

export class WeHomeApiError extends Error {
  status: number;
  body: string;

  constructor(status: number, body: string) {
    super(`WeHome API ${status}: ${body}`);
    this.name = "WeHomeApiError";
    this.status = status;
    this.body = body;
  }
}

export function getWeHomeBaseUrl() {
  return process.env.WEHOME_API_BASE_URL?.trim() || DEFAULT_BASE_URL;
}

export function getWeHomeAuthHeaders(): Record<string, string> {
  const authToken =
    process.env.WEHOME_AUTH_TOKEN?.trim() ||
    process.env.JWT_TOKEN_SECRET?.trim() ||
    "";
  const companyId =
    process.env.WEHOME_COMPANY_ID?.trim() || process.env.COMPANY_ID?.trim() || "";

  const headers: Record<string, string> = {};
  if (authToken) headers.authtoken = authToken;
  if (companyId) headers.companyid = companyId;
  return headers;
}

export async function wehomeFetchJson<T>(
  path: string,
  init?: Omit<RequestInit, "headers"> & { headers?: Record<string, string> }
): Promise<T> {
  const url = new URL(path, getWeHomeBaseUrl());

  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers: {
        Accept: "application/json",
        ...getWeHomeAuthHeaders(),
        ...(init?.headers ?? {}),
      },
      cache: "no-store",
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    throw new Error(`WeHome API network error: ${message}`);
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new WeHomeApiError(res.status, body);
  }

  return (await res.json()) as T;
}

export type SelectOption = { value: string; label: string };

export function unwrapWeHomeDataArray(input: unknown): unknown[] {
  if (Array.isArray(input)) return input;
  if (input && typeof input === "object") {
    const record = input as Record<string, unknown>;
    if (Array.isArray(record.data)) return record.data;
  }
  return [];
}

export function toSelectOptionsByKeys(
  input: unknown,
  valueKey: string,
  labelKey: string
): SelectOption[] {
  const arr = unwrapWeHomeDataArray(input);

  return arr
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;

      const value = record[valueKey];
      const label = record[labelKey];

      const valueStr =
        typeof value === "string" || typeof value === "number"
          ? String(value)
          : null;
      const labelStr =
        typeof label === "string" || typeof label === "number"
          ? String(label)
          : null;

      if (!valueStr) return null;
      return { value: valueStr, label: labelStr ?? valueStr } satisfies SelectOption;
    })
    .filter((x): x is SelectOption => Boolean(x));
}
