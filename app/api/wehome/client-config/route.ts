import { NextResponse } from "next/server";

import { getWeHomeAuthHeaders, getWeHomeBaseUrl } from "@/lib/wehome-api";

// SECURITY WARNING:
// This endpoint intentionally exposes `authtoken` + `companyid` to the browser.
// Use only in test/staging environments. Anyone who can load your site can read these values.
export async function GET() {
  const headers = getWeHomeAuthHeaders();
  return NextResponse.json({
    baseUrl: getWeHomeBaseUrl(),
    authtoken: headers.authtoken ?? "",
    companyid: headers.companyid ?? "",
  });
}

