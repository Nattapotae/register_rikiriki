import { NextResponse } from "next/server";
import { randomInt, createHash } from "crypto";

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
  if (!rawPhone) {
    return NextResponse.json({ ok: false, error: "INVALID_INPUT" }, { status: 400 });
  }

  const phone = normalizePhone(rawPhone);
  if (!isValidThaiMobile(phone)) {
    return NextResponse.json({ ok: false, error: "INVALID_PHONE" }, { status: 400 });
  }

  const exists = await prisma.customer.findUnique({
    where: { mobile: phone },
    select: { id: true },
  });
  if (exists) {
    return NextResponse.json({ ok: false, error: "PHONE_TAKEN" }, { status: 409 });
  }

  const now = new Date();
  const recentCount = await prisma.phoneOtp.count({
    where: {
      mobile: phone,
      createdAt: { gte: new Date(now.getTime() - 60_000) },
    },
  });
  if (recentCount >= 3) {
    return NextResponse.json(
      { ok: false, error: "TOO_MANY_REQUESTS" },
      { status: 429 }
    );
  }

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const codeHash = hashCode(phone, code);
  const expiresAt = new Date(now.getTime() + 5 * 60_000);

  await prisma.phoneOtp.create({
    data: { mobile: phone, codeHash, expiresAt },
    select: { id: true },
  });

  // TODO: integrate SMS provider here (Twilio / etc.)
  // For now we only log the code on server (dev/test).
  console.log("[otp] request", { phone, code });

  const shouldReturnCode =
    process.env.NODE_ENV !== "production" &&
    process.env.OTP_DEV_RETURN_CODE?.trim() === "true";

  return NextResponse.json(
    {
      ok: true,
      expiresInSec: 300,
      ...(shouldReturnCode ? { code } : {}),
    },
    { status: 200 }
  );
}

