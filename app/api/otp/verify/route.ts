import { NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "crypto";

import { prisma } from "@/lib/prisma";

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function normalizePhone(phone: string) {
  return phone.replace(/\s+/g, "");
}

function isValidThaiMobile(phone: string) {
  return /^0\d{9}$/.test(phone);
}

function hashCode(phone: string, code: string) {
  const pepper = process.env.OTP_SECRET?.trim() || "dev-otp-secret";
  return createHash("sha256").update(`${pepper}:${phone}:${code}`).digest("hex");
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as unknown;
  const record =
    body && typeof body === "object" ? (body as Record<string, unknown>) : null;

  const rawPhone = asNonEmptyString(record?.phone);
  const code = asNonEmptyString(record?.code);
  if (!rawPhone || !code) {
    return NextResponse.json({ ok: false, error: "INVALID_INPUT" }, { status: 400 });
  }

  const phone = normalizePhone(rawPhone);
  if (!isValidThaiMobile(phone) || !/^\d{6}$/.test(code)) {
    return NextResponse.json({ ok: false, error: "INVALID_INPUT" }, { status: 400 });
  }

  const now = new Date();
  const otp = await prisma.phoneOtp.findFirst({
    where: {
      mobile: phone,
      verifiedAt: null,
      expiresAt: { gt: now },
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, codeHash: true, attempts: true },
  });

  if (!otp) {
    return NextResponse.json({ ok: false, error: "OTP_NOT_FOUND" }, { status: 404 });
  }

  if (otp.attempts >= 5) {
    return NextResponse.json({ ok: false, error: "OTP_LOCKED" }, { status: 429 });
  }

  const expected = Buffer.from(otp.codeHash, "hex");
  const actual = Buffer.from(hashCode(phone, code), "hex");

  const ok =
    expected.length === actual.length && timingSafeEqual(expected, actual);

  if (!ok) {
    await prisma.phoneOtp.update({
      where: { id: otp.id },
      data: { attempts: { increment: 1 } },
      select: { id: true },
    });
    return NextResponse.json({ ok: false, error: "OTP_INVALID" }, { status: 400 });
  }

  await prisma.phoneOtp.update({
    where: { id: otp.id },
    data: { verifiedAt: now },
    select: { id: true },
  });

  return NextResponse.json({ ok: true }, { status: 200 });
}

