import { NextResponse } from "next/server";
export async function GET() {
    const res = await fetch("https://api-pos-wehome-test.gbhpos.com/thirdParty/member/master/getCustomerType", {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            "authtoken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjb21wYW55aWQiOjEsInVzZXJuYW1lIjoidGVzdF93ZWhvbWUiLCJmdWxsbmFtZSI6InRlc3Rfd2Vob21lIiwibmlja25hbWUiOiJ0ZXN0X3dlaG9tZSIsImlhdCI6MTc3Mjc2NDE0NCwiZXhwIjoxNzcyODIxNzQ0fQ.lCpQ3-cqNUfGATCloGogg43oEVsI17diCpgBnZEIIOI",
            "companyid": "1"
        },
        cache: "no-store",
    }).then((r) => r.json());
    return NextResponse.json({ res });
}