import Link from "next/link";
import { notFound } from "next/navigation";

import { CalendarDays, StickyNote } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CouponBarcodeTabs } from "@/components/coupons/coupon_barcode_tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";

export default async function RegisterSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }> | { id?: string };
}) {
  const sp = await Promise.resolve(searchParams);
  const id = (sp.id ?? "").trim();
  if (!id) notFound();

  const customer = await prisma.customer.findUnique({
    where: { id },
    include: { coupons: true },
  });

  if (!customer) notFound();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>สำเร็จ</CardTitle>
          <CardDescription>
            บันทึกข้อมูลเรียบร้อยแล้ว{customer.remoteCustomerCode ? ` (${customer.remoteCustomerCode})` : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6">
          <div className="grid gap-2 rounded-lg border border-border bg-card p-4">
            <div className="text-sm text-muted-foreground">ข้อมูลสมาชิก</div>
            <div className="grid gap-1 text-sm">
              <div>
                <span className="text-muted-foreground">ชื่อ:</span>{" "}
                <span className="font-medium text-foreground">{customer.fullName}</span>
              </div>
              <div>
                <span className="text-muted-foreground">เบอร์โทร:</span>{" "}
                <span className="font-medium text-foreground">{customer.mobile}</span>
              </div>
              {/* {customer.remoteCustomerId ? (
                <div>
                  <span className="text-muted-foreground">customer_id:</span>{" "}
                  <span className="font-medium text-foreground">{customer.remoteCustomerId}</span>
                </div>
              ) : null} */}
            </div>
          </div>

          <div className="grid gap-3">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold">Coupons</div>
              <Badge variant="secondary">{customer.coupons.length}</Badge>
            </div>

            {customer.coupons.length === 0 ? (
              <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
                ไม่มีคูปอง
              </div>
	            ) : (
	              <div className="grid gap-3 md:grid-cols-2">
	                {customer.coupons.map((c) => (
	                  <div
	                    key={c.id}
	                    className="rounded-lg border border-orange-200 bg-orange-50/40 p-4"
	                  >
		                    <div className="flex items-start justify-between gap-3">
		                      <div className="min-w-0">
		                        <div className="truncate text-sm font-semibold text-foreground">
		                          {c.goodsName || c.typeName || "Coupon"}
	                        </div>
	                        <div className="mt-1 truncate text-xs text-muted-foreground">
	                          {c.saleDocno ? c.saleDocno : "SALE -"}{" "}
	                          {typeof c.couponId === "number"
	                            ? `• ID: ${c.couponId}`
	                            : ""}
	                        </div>
	                      </div>
	                      <div className="flex shrink-0 flex-col items-end gap-2">
	                        <Badge variant={c.pay ? "secondary" : "outline"}>
	                          {c.pay ? "Paid" : "Unpaid"}
	                        </Badge>
	                        <Badge variant={c.active ? "default" : "destructive"}>
	                          {c.active ? "Active" : "Inactive"}
	                        </Badge>
		                      </div>
		                    </div>

		                    <div className="mt-3 rounded-md border border-orange-200 bg-orange-50 px-3 py-2">
		                      <div className="text-xs font-medium text-orange-700">
		                        ส่วนลด
		                      </div>
		                      <div className="mt-1 text-2xl font-semibold text-orange-900">
		                        {typeof c.discountValue === "number"
		                          ? `฿${new Intl.NumberFormat("th-TH").format(c.discountValue)}`
		                          : "-"}
		                      </div>
		                    </div>

		                    <div className="mt-3">
		                      <CouponBarcodeTabs couponBarcode={c.couponBarcode} />
		                    </div>

	                    {c.imgUrl ? (
	                      // Use <img> to avoid Next/Image remotePatterns config for external URLs.
	                      // eslint-disable-next-line @next/next/no-img-element
	                      <img
	                        src={c.imgUrl}
	                        alt={c.goodsName || c.typeName || "coupon"}
	                        className="mt-3 h-36 w-full rounded-md border border-border object-cover"
	                        loading="lazy"
	                      />
	                    ) : null}

		                    <div className="mt-3 grid gap-2">
	                      <div className="rounded-md border border-border bg-background px-3 py-2">
	                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
	                          <CalendarDays className="h-4 w-4" />
	                          หมดอายุ
	                        </div>
	                        <div className="mt-1 text-sm font-semibold text-foreground">
	                          {c.dateExpireLabel
	                            ? c.dateExpireLabel
	                            : c.dateExpire
	                              ? c.dateExpire.toISOString().slice(0, 10)
	                              : "-"}
	                        </div>
	                      </div>
	                      <div className="rounded-md border border-border bg-background px-3 py-2">
	                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
	                          <StickyNote className="h-4 w-4" />
	                          หมายเหตุ
	                        </div>
	                        <div className="mt-1 break-words text-sm text-foreground">
	                          {c.docNote || "-"}
		                        </div>
		                      </div>
		                    </div>
		                  </div>
		                ))}
		              </div>
		            )}
          </div>

          <div className="flex justify-end">
            <Button asChild variant="outline">
              <Link href="/register">กลับไปหน้า Register</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
