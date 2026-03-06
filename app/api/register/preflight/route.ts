import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as unknown;
  const record = body && typeof body === "object" ? (body as Record<string, unknown>) : null;
  const phone = asNonEmptyString(record?.phone);

  if (!phone) {
    return NextResponse.json({ ok: false, error: "INVALID_INPUT" }, { status: 400 });
  }

  const exists = await prisma.customer.findUnique({
    where: { mobile: phone },
    select: { id: true },
  });

  if (exists) {
    return NextResponse.json({ ok: false, error: "PHONE_TAKEN" }, { status: 409 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}

