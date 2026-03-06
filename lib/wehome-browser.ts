const DEFAULT_BASE_URL = "https://api-pos-wehome-test.gbhpos.com";

export type WeHomeApiEnvelope<T> = {
  status?: number;
  message?: string;
  data?: T;
};

export class WeHomeBrowserError extends Error {
  status: number;
  body: string;

  constructor(status: number, body: string) {
    super(`WeHome API ${status}: ${body}`);
    this.name = "WeHomeBrowserError";
    this.status = status;
    this.body = body;
  }
}

export type WeHomeBrowserConfig = {
  baseUrl: string;
  authtoken: string;
  companyid: string;
};

function looksLikeCloudflareChallenge(contentType: string | null, body: string) {
  if (!contentType?.toLowerCase().includes("text/html")) return false;
  const b = body.toLowerCase();
  return (
    b.includes("just a moment") ||
    b.includes("cdn-cgi/challenge-platform") ||
    b.includes("window._cf_chl_opt") ||
    b.includes("__cf_chl")
  );
}

function truncate(text: string, max = 600) {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}...`;
}

export function getWeHomeBrowserBaseUrl() {
  return process.env.NEXT_PUBLIC_WEHOME_API_BASE_URL?.trim() || DEFAULT_BASE_URL;
}

export function getWeHomeBrowserAuthHeaders(): Record<string, string> {
  const authToken = process.env.NEXT_PUBLIC_WEHOME_AUTH_TOKEN?.trim() || "";
  const companyId = process.env.NEXT_PUBLIC_WEHOME_COMPANY_ID?.trim() || "";

  const headers: Record<string, string> = {};
  if (authToken) headers.authtoken = authToken;
  if (companyId) headers.companyid = companyId;
  return headers;
}

export function getWeHomeBrowserConfigFromEnv(): WeHomeBrowserConfig | null {
  const baseUrl = getWeHomeBrowserBaseUrl();
  const authtoken = process.env.NEXT_PUBLIC_WEHOME_AUTH_TOKEN?.trim() || "";
  const companyid = process.env.NEXT_PUBLIC_WEHOME_COMPANY_ID?.trim() || "";
  if (!authtoken || !companyid) return null;
  return { baseUrl, authtoken, companyid };
}

export async function wehomeBrowserFetchJsonWithConfig<T>(
  config: WeHomeBrowserConfig,
  path: string,
  init?: Omit<RequestInit, "headers"> & { headers?: Record<string, string> }
): Promise<T> {
  const url = new URL(path, config.baseUrl);
  return wehomeBrowserFetchAbsoluteJson<T>(url, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      authtoken: config.authtoken,
      companyid: config.companyid,
    },
  });
}

async function wehomeBrowserFetchAbsoluteJson<T>(
  url: URL,
  init?: Omit<RequestInit, "headers"> & { headers?: Record<string, string> }
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
      cache: "no-store",
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    throw new Error(`WeHome API network error: ${message}`);
  }

  if (!res.ok) {
    const contentType = res.headers.get("content-type");
    const body = await res.text().catch(() => "");
    if (looksLikeCloudflareChallenge(contentType, body)) {
      throw new WeHomeBrowserError(
        res.status,
        "CLOUDFLARE_CHALLENGE: Upstream returned a Cloudflare browser challenge page."
      );
    }
    throw new WeHomeBrowserError(res.status, truncate(body));
  }

  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.toLowerCase().includes("text/html")) {
    const body = await res.text().catch(() => "");
    if (looksLikeCloudflareChallenge(contentType, body)) {
      throw new WeHomeBrowserError(
        403,
        "CLOUDFLARE_CHALLENGE: Upstream returned a Cloudflare browser challenge page."
      );
    }
  }

  return (await res.json()) as T;
}

export async function wehomeBrowserFetchJson<T>(
  path: string,
  init?: Omit<RequestInit, "headers"> & { headers?: Record<string, string> }
): Promise<T> {
  const url = new URL(path, getWeHomeBrowserBaseUrl());
  return wehomeBrowserFetchAbsoluteJson<T>(url, {
    ...init,
    headers: {
      ...getWeHomeBrowserAuthHeaders(),
      ...(init?.headers ?? {}),
    },
  });
}
