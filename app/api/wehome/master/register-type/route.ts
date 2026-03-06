import { NextResponse } from "next/server";

import { WeHomeApiError, getWeHomeAuthHeaders, toSelectOptionsByKeys, type WeHomeApiEnvelope, wehomeFetchJson } from "@/lib/wehome-api";

export async function GET() {
  const auth = getWeHomeAuthHeaders();
  if (!auth.authtoken || !auth.companyid) {
    return NextResponse.json({
      options: [],
      error: "Missing WEHOME_AUTH_TOKEN / WEHOME_COMPANY_ID on the server.",
    });
  }

  try {
    const res = await wehomeFetchJson<WeHomeApiEnvelope<unknown>>(
      "/thirdParty/member/master/getRegisterType"
    );
    const options = toSelectOptionsByKeys(res, "type_id", "type_name");
    return NextResponse.json({ options });
  } catch (e) {
    console.error("[wehome master] register-type", e);
    return NextResponse.json({
      options: [],
      error: e instanceof Error ? e.message : "UPSTREAM_ERROR",
      upstreamStatus: e instanceof WeHomeApiError ? e.status : undefined,
    });
  }
}
