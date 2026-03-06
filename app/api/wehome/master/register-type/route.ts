import { NextResponse } from "next/server";

import { WeHomeApiError, toSelectOptionsByKeys, type WeHomeApiEnvelope, wehomeFetchJson } from "@/lib/wehome-api";

export async function GET() {
  try {
    const res = await wehomeFetchJson<WeHomeApiEnvelope<unknown>>(
      "/thirdParty/member/master/getRegisterType"
    );
    const options = toSelectOptionsByKeys(res, "type_id", "type_name");
    return NextResponse.json({ options });
  } catch (e) {
    console.error("[wehome master] register-type", e);
    return NextResponse.json(
      { options: [], error: e instanceof Error ? e.message : "UPSTREAM_ERROR" },
      { status: e instanceof WeHomeApiError ? e.status : 502 }
    );
  }
}
