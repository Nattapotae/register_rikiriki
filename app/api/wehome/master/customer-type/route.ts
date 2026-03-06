import { NextResponse } from "next/server";

import {
  WeHomeApiError,
  getWeHomeAuthHeaders,
  toSelectOptionsByKeys,
  type WeHomeApiEnvelope,
  wehomeFetchJson,
} from "@/lib/wehome-api";

export async function GET() {
  const auth = getWeHomeAuthHeaders();
  const debug = {
    baseUrl:
      process.env.WEHOME_API_BASE_URL || "https://api-pos-wehome-test.gbhpos.com",
    hasAuthtoken: Boolean(auth.authtoken),
    hasCompanyId: Boolean(auth.companyid),
  };

  // Previous behavior (kept for reference):
  if (!auth.authtoken || !auth.companyid) {
    return NextResponse.json({
      options: [],
      error: "Missing WEHOME_AUTH_TOKEN / WEHOME_COMPANY_ID on the server.",
      debug,
    });
  }

  try {
    const res = await wehomeFetchJson<WeHomeApiEnvelope<unknown>>(
      "/thirdParty/member/master/getCustomerType"
    );

    // Hardcode/debug alternative (avoid putting tokens in code; prefer Vercel env vars):
    // const raw = await fetch(
    //   `${debug.baseUrl}/thirdParty/member/master/getCustomerType`,
    //   {
    //     method: "GET",
    //     headers: {
    //       ...getWeHomeAuthHeaders(),
    //       "Content-Type": "application/json",
    //       Accept: "application/json",
    //     },
    //     cache: "no-store",
    //   }
    // ).then((r) => r.json());
    // const options = toSelectOptionsByKeys(raw, "type_id", "type_name");

    const options = toSelectOptionsByKeys(res, "type_id", "type_name");
    return NextResponse.json({ options });
  } catch (e) {
    console.error("[wehome master] customer-type", e);
    return NextResponse.json({
      options: [],
      error: e instanceof Error ? e.message : "UPSTREAM_ERROR",
      upstreamStatus: e instanceof WeHomeApiError ? e.status : undefined,
      debug,
    });
  }
}

