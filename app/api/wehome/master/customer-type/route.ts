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
      process.env.WEHOME_API_BASE_URL ||
      "https://api-pos-wehome-test.gbhpos.com",
    hasAuthtoken: Boolean(auth.authtoken),
    hasCompanyId: Boolean(auth.companyid),
  };
  // Previous behavior (kept for reference):
  // if (!auth.authtoken || !auth.companyid) {
  //   return NextResponse.json({
  //     options: [],
  //     error: "Missing WEHOME_AUTH_TOKEN / WEHOME_COMPANY_ID on the server.",
  //     debug,
  //   });
  // }

  try {
    // const res = await wehomeFetchJson<WeHomeApiEnvelope<unknown>>(
    //   "/thirdParty/member/master/getCustomerType"
    // );
    const res = await fetch(
      "https://api-pos-wehome-test.gbhpos.com/thirdParty/member/master/getCustomerType",
      {
        method: "GET",
        headers: {
          authtoken:"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjb21wYW55aWQiOjEsInVzZXJuYW1lIjoidGVzdF93ZWhvbWUiLCJmdWxsbmFtZSI6InRlc3Rfd2Vob21lIiwibmlja25hbWUiOiJ0ZXN0X3dlaG9tZSIsImlhdCI6MTc3Mjc2NDE0NCwiZXhwIjoxNzcyODIxNzQ0fQ.lCpQ3-cqNUfGATCloGogg43oEVsI17diCpgBnZEIIOI",
          companyid: "1",
          "Content-Type": "application/json",
        },
      },
    );

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
