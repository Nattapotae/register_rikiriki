import { NextResponse } from "next/server";

import { WeHomeApiError, getWeHomeAuthHeaders, toSelectOptionsByKeys, type WeHomeApiEnvelope, wehomeFetchJson } from "@/lib/wehome-api";

const FALLBACK_OPTIONS = [
  { value: "1", label: "ชาย" },
  { value: "2", label: "หญิง" },
  { value: "3", label: "ไม่ระบุ" },
];

export async function GET() {
  const auth = getWeHomeAuthHeaders();
  const debug = {
    baseUrl:
      process.env.WEHOME_API_BASE_URL || "https://api-pos-wehome-test.gbhpos.com",
    hasAuthtoken: Boolean(auth.authtoken),
    hasCompanyId: Boolean(auth.companyid),
  };
  if (!auth.authtoken || !auth.companyid) {
    return NextResponse.json({
      options: FALLBACK_OPTIONS,
      warning:
        "Missing WEHOME_AUTH_TOKEN / WEHOME_COMPANY_ID on the server. Using fallback options.",
      debug,
    });
  }

  try {
    const res = await wehomeFetchJson<WeHomeApiEnvelope<unknown>>(
      "/thirdParty/member/master/getGender"
    );
    const options = toSelectOptionsByKeys(res, "gender_id", "gender_name");
    return NextResponse.json({ options });
  } catch (e) {
    console.error("[wehome master] gender", e);

    if (
      e instanceof WeHomeApiError &&
      typeof e.body === "string" &&
      e.body.includes("CLOUDFLARE_CHALLENGE")
    ) {
      return NextResponse.json({
        options: FALLBACK_OPTIONS,
        warning:
          "WeHome API ถูก Cloudflare บล็อกบนสภาพแวดล้อม server-to-server (เช่น Vercel). ใช้ข้อมูลสำรองชั่วคราว",
        upstreamStatus: e.status,
        debug,
      });
    }

    return NextResponse.json({
      options: [],
      error: e instanceof Error ? e.message : "UPSTREAM_ERROR",
      upstreamStatus: e instanceof WeHomeApiError ? e.status : undefined,
      debug,
    });
  }
}
