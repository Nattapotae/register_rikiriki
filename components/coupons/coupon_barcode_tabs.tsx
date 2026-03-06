"use client";

import * as React from "react";

import JsBarcode from "jsbarcode";
import { QRCodeSVG } from "qrcode.react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function BarcodeSvg({ value }: { value: string }) {
  const ref = React.useRef<SVGSVGElement | null>(null);

  React.useEffect(() => {
    if (!ref.current) return;
    if (!value) return;

    try {
      JsBarcode(ref.current, value, {
        format: "CODE128",
        displayValue: true,
        fontSize: 14,
        height: 56,
        margin: 8,
      });
    } catch {
      // ignore rendering errors (invalid characters, etc.)
    }
  }, [value]);

  return <svg ref={ref} className="w-full" />;
}

export function CouponBarcodeTabs({ couponBarcode }: { couponBarcode: string }) {
  const code = couponBarcode?.trim() ?? "";
  const [copied, setCopied] = React.useState(false);

  return (
    <Tabs defaultValue="code">
      <TabsList className="w-full">
        <TabsTrigger className="flex-1" value="code">
          Code
        </TabsTrigger>
        <TabsTrigger className="flex-1" value="barcode">
          Barcode
        </TabsTrigger>
        <TabsTrigger className="flex-1" value="qr">
          QR
        </TabsTrigger>
      </TabsList>

      <TabsContent value="code">
        <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-background px-3 py-2">
          <div className="truncate font-mono text-sm text-foreground">
            {code || "-"}
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!code}
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(code);
                setCopied(true);
                window.setTimeout(() => setCopied(false), 1200);
              } catch {
                // ignore
              }
            }}
          >
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
      </TabsContent>

      <TabsContent value="barcode">
        <div className="rounded-md border border-border bg-background p-2">
          {code ? (
            <BarcodeSvg value={code} />
          ) : (
            <div className="p-3 text-sm text-muted-foreground">ไม่มี coupon_barcode</div>
          )}
        </div>
      </TabsContent>

      <TabsContent value="qr">
        <div className="flex items-center justify-center rounded-md border border-border bg-background p-4">
          {code ? (
            <QRCodeSVG value={code} size={160} />
          ) : (
            <div className="text-sm text-muted-foreground">ไม่มี coupon_barcode</div>
          )}
        </div>
      </TabsContent>
    </Tabs>
  );
}

