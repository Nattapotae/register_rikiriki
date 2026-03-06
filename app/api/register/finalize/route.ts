import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import type { WeHomeApiEnvelope } from "@/lib/wehome-api";

type FinalizePayload = {
  form?: {
    fullName?: unknown;
    email?: unknown;
    phone?: unknown;
    registerTypeId?: unknown;
    genderId?: unknown;
    customerTypeId?: unknown;
  };
  wehomeResponse?: unknown;
  wehomeRequest?: unknown;
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

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as FinalizePayload | null;

  const fullName = asNonEmptyString(body?.form?.fullName);
  const email = asNonEmptyString(body?.form?.email)?.toLowerCase();
  const phone = asNonEmptyString(body?.form?.phone);
  const registerTypeId = asNonEmptyString(body?.form?.registerTypeId) ?? "1";
  const genderId = asNonEmptyString(body?.form?.genderId) ?? "1";
  const customerTypeId = asNonEmptyString(body?.form?.customerTypeId) ?? "1";

  if (!fullName || !email || !phone) {
    return NextResponse.json({ ok: false, error: "INVALID_INPUT" }, { status: 400 });
  }

  const wehome = body?.wehomeResponse as InsertUpdateCustomerResponse | undefined;
  const first = Array.isArray(wehome?.data) ? wehome?.data?.[0] : undefined;
  if (!wehome || wehome.status !== 200 || !first) {
    return NextResponse.json(
      { ok: false, error: "INVALID_WEHOME_RESPONSE" },
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
      customerCode: "Running",
      taxCode: "XXXXXXXXXXXXX",
      idCard: "XXXXXXXXXXXXX",
      titleId: "7",
      fullAddress: "ทดสอบ API",
      officePhone: "",
      birthday: asDate("2000-01-01"),
      customerRankId: "1",
      religionId: "4",
      remark: "",
      lineId: "",
      fax: "",
      facebook: "",
      attachFile: "",
      chrageCreditActive: true,
      dateNow: "NOW()",
      active: true,
      branchCode: "00016CB",
      suffixId: "0",
      seqbrchno: "",
      saveEmp: "ADMIN0001",
      saveName: "ADMIN0001",
      editEmp: "ADMIN0001",
      editName: "ADMIN0001",
      appName: "ONLINE_APP",
      registerTypeId,
      genderId,
      customerTypeId,
      remoteCompanyId: first.company_id ?? null,
      remoteCustomerId: first.customer_id ?? null,
      remoteCustomerCode: first.customer_code ?? null,
      rawRequest: (body.wehomeRequest ?? null) as unknown as object,
      rawResponse: wehome as unknown as object,
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
    select: { id: true },
  });

  return NextResponse.json({ ok: true, id: created.id }, { status: 201 });
}

