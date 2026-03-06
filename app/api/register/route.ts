import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { WeHomeApiError, type WeHomeApiEnvelope, wehomeFetchJson } from "@/lib/wehome-api";

type RegisterPayload = {
  fullName: unknown;
  email: unknown;
  phone: unknown;
  registerTypeId?: unknown;
  genderId?: unknown;
  customerTypeId?: unknown;
};

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function splitName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  const firstName = parts[0] ?? "";
  const lastName = parts.slice(1).join(" ");
  return { firstName, lastName };
}

type InsertUpdateCustomerResponseItem = {
  company_id?: string;
  customer_id?: string;
  customer_code?: string;
  customer_name?: string;
  coupons?: unknown[];
};

type InsertUpdateCustomerResponse = WeHomeApiEnvelope<InsertUpdateCustomerResponseItem[]> & {
  status?: number;
  message?: string;
  data?: InsertUpdateCustomerResponseItem[];
};

function asInt(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === "string" && value.trim()) {
    const n = Number(value);
    return Number.isFinite(n) ? Math.trunc(n) : null;
  }
  return null;
}

function asBool(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
}

function asDate(value: unknown): Date | null {
  if (typeof value !== "string") return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as RegisterPayload | null;

  const fullName = asNonEmptyString(body?.fullName);
  const email = asNonEmptyString(body?.email)?.toLowerCase();
  const phone = asNonEmptyString(body?.phone);
  const registerTypeId = asNonEmptyString(body?.registerTypeId) ?? "1";
  const genderId = asNonEmptyString(body?.genderId) ?? "1";
  const customerTypeId = asNonEmptyString(body?.customerTypeId) ?? "1";

  if (!fullName || !email || !phone) {
    return NextResponse.json(
      { ok: false, error: "INVALID_INPUT" },
      { status: 400 }
    );
  }

  const exists = await prisma.customer.findUnique({
    where: { mobile: phone },
    select: { id: true },
  });

  if (exists) {
    return NextResponse.json({ ok: false, error: "PHONE_TAKEN" }, { status: 409 });
  }

  const { firstName, lastName } = splitName(fullName);

  const apiPayload = {
    customer_id: "0",
    customer_code: "Running",
    tax_code: "XXXXXXXXXXXXX",
    id_card: "XXXXXXXXXXXXX",
    title_id: "7",
    first_name: firstName,
    last_name: lastName,
    full_name: fullName,
    first_name_eng: firstName,
    last_name_eng: lastName,
    full_name_eng: fullName,
    full_address: "ทดสอบ API",
    mobile: phone,
    office_phone: "",
    birthday: "2000-01-01",
    gender_id: genderId,
    register_type_id: registerTypeId,
    customer_rank_id: "1",
    customer_type_id: customerTypeId,
    religion_id: "4",
    remark: "",
    line_id: "",
    fax: "",
    facebook: "",
    attach_file: "",
    chrage_credit_active: true,
    date_now: "NOW()",
    active: true,
    branch_code: "00016CB",
    suffix_id: "0",
    seqbrchno: "",
    save_emp: "ADMIN0001",
    save_name: "ADMIN0001",
    edit_emp: "ADMIN0001",
    edit_name: "ADMIN0001",
    app_name: "ONLINE_APP",
    customer_address_list: [
      {
        listno: 1,
        is_main: true,
        customer_name: fullName,
        house_no: "",
        street: "",
        village_id: 0,
        village_name: "",
        subdistrict_id: 24,
        subdistrict_name: "",
        district_id: 3,
        district_name: "",
        province_id: 1,
        province_name: "",
        country_id: 1,
        country_name: "",
        zipcode: "",
        full_address: "",
        address_latitude: "",
        address_longitude: "",
      },
    ],
    customer_email_list: [{ email }],
    approve_list: [],
  };

  try {
    const apiRes = await wehomeFetchJson<InsertUpdateCustomerResponse>(
      "/thirdParty/member/customer/InsertUpdateCustomer",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(apiPayload),
      }
    );

    const first = Array.isArray(apiRes.data) ? apiRes.data[0] : undefined;
    if (!first || apiRes.status !== 200) {
      return NextResponse.json(
        { ok: false, error: "UPSTREAM_ERROR", upstream: apiRes },
        { status: 502 }
      );
    }

    const coupons = Array.isArray(first.coupons) ? first.coupons : [];

    const created = await prisma.customer.create({
      data: {
        fullName,
        firstName,
        lastName,
        fullNameEng: fullName,
        firstNameEng: firstName,
        lastNameEng: lastName,
        mobile: phone,
        customerCode: apiPayload.customer_code,
        taxCode: apiPayload.tax_code,
        idCard: apiPayload.id_card,
        titleId: apiPayload.title_id,
        fullAddress: apiPayload.full_address,
        officePhone: apiPayload.office_phone,
        birthday: asDate(apiPayload.birthday),
        customerRankId: apiPayload.customer_rank_id,
        religionId: apiPayload.religion_id,
        remark: apiPayload.remark,
        lineId: apiPayload.line_id,
        fax: apiPayload.fax,
        facebook: apiPayload.facebook,
        attachFile: apiPayload.attach_file,
        chrageCreditActive: apiPayload.chrage_credit_active,
        dateNow: apiPayload.date_now,
        active: apiPayload.active,
        branchCode: apiPayload.branch_code,
        suffixId: apiPayload.suffix_id,
        seqbrchno: apiPayload.seqbrchno,
        saveEmp: apiPayload.save_emp,
        saveName: apiPayload.save_name,
        editEmp: apiPayload.edit_emp,
        editName: apiPayload.edit_name,
        appName: apiPayload.app_name,
        registerTypeId,
        genderId,
        customerTypeId,
        remoteCompanyId: first.company_id ?? null,
        remoteCustomerId: first.customer_id ?? null,
        remoteCustomerCode: first.customer_code ?? null,
        rawRequest: apiPayload as unknown as object,
        rawResponse: apiRes as unknown as object,
        emails: { create: [{ email }] },
        addresses: {
          create: [
            {
              listno: 1,
              isMain: true,
              customerName: fullName,
              houseNo: "",
              street: "",
              villageId: 0,
              villageName: "",
              subdistrictId: 24,
              subdistrictName: "",
              districtId: 3,
              districtName: "",
              provinceId: 1,
              provinceName: "",
              countryId: 1,
              countryName: "",
              zipcode: "",
              fullAddress: "",
              addressLatitude: "",
              addressLongitude: "",
            },
          ],
        },
        coupons: {
          create: coupons.map((c) => {
            const r = c as Record<string, unknown>;
            return {
              companyId: asInt(r.company_id),
              branchCode: asNonEmptyString(r.branch_code) ?? "",
              saleDocno: asNonEmptyString(r.sale_docno) ?? "",
              active: asBool(r.active) ?? true,
              couponBarcode: asNonEmptyString(r.coupon_barcode) ?? "",
              couponId: asInt(r.coupon_id),
              pay: asBool(r.pay) ?? false,
              dateExpire: asDate(r.date_expire),
              dateExpireLabel: asNonEmptyString(r.date_expire_label) ?? "",
              discountValue: asInt(r.discount_value),
              goodsBarcode: asNonEmptyString(r.goods_barcode) ?? "",
              goodsName: asNonEmptyString(r.goods_name) ?? "",
              proDocNo: asNonEmptyString(r.pro_doc_no) ?? "",
              proDocId: asInt(r.pro_doc_id),
              proItemsId: asInt(r.pro_items_id),
              proDocTypeId: asInt(r.pro_doc_type_id),
              typeName: asNonEmptyString(r.type_name) ?? "",
              docNote: asNonEmptyString(r.doc_note) ?? "",
              imgUrl: asNonEmptyString(r.img_url) ?? "",
            };
          }),
        },
      },
      select: { id: true, remoteCustomerId: true, remoteCustomerCode: true },
    });

    return NextResponse.json({ ok: true, id: created.id }, { status: 201 });
	  } catch (e) {
	    if (e instanceof WeHomeApiError) {
	      console.error("[wehome] InsertUpdateCustomer failed", {
	        status: e.status,
	        body: e.body,
	      });
	      const isCloudflare =
	        typeof e.body === "string" && e.body.includes("CLOUDFLARE_CHALLENGE");
	      return NextResponse.json(
	        {
	          ok: false,
	          error: isCloudflare ? "CLOUDFLARE_CHALLENGE" : "UPSTREAM_ERROR",
	          upstreamStatus: e.status,
	        },
	        { status: 502 }
	      );
	    }

    console.error("[register] server error", e);
    return NextResponse.json({ ok: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}
