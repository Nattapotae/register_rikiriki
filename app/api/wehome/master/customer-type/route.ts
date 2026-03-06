import { NextResponse } from "next/server";

import {
  WeHomeApiError,
  getWeHomeAuthHeaders,
  toSelectOptionsByKeys,
  type WeHomeApiEnvelope,
  wehomeFetchJson,
} from "@/lib/wehome-api";

const FALLBACK_OPTIONS = [
  { value: "1", label: "ลูกค้าทั่วไป" },
  { value: "2", label: "ผู้รับเหมา" },
  { value: "3", label: "โครงการ" },
  { value: "4", label: "กิจการที่เกี่ยวข้องกัน" },
  { value: "5", label: "พนักงานบริษัทฯ" },
  { value: "6", label: "ผู้จำหน่ายสินค้า" },
];

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
      options: FALLBACK_OPTIONS,
      warning:
        "Missing WEHOME_AUTH_TOKEN / WEHOME_COMPANY_ID on the server. Using fallback options.",
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
