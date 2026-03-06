"use client";

import * as React from "react";

import JsBarcode from "jsbarcode";
import { QRCodeSVG } from "qrcode.react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function downloadSvgAsPng(svg: SVGSVGElement, filename: string) {
  const serializer = new XMLSerializer();
  const svgText = serializer.serializeToString(svg);
  const svgBlob = new Blob([svgText], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);

  const image = new Image();
  image.onload = () => {
    const canvas = document.createElement("canvas");
    const w = image.naturalWidth || image.width || 320;
    const h = image.naturalHeight || image.height || 320;
    canvas.width = w;
    canvas.height = h;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // white background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0);

    URL.revokeObjectURL(url);

    const pngUrl = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = pngUrl;
    a.download = filename;
    a.click();
  };
  image.onerror = () => URL.revokeObjectURL(url);
  image.src = url;
}

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
  const qrWrapRef = React.useRef<HTMLDivElement | null>(null);

  return (
    <Tabs defaultValue="qr">
      <TabsList className="w-full bg-orange-100 text-orange-700">
        <TabsTrigger
          className="flex-1 data-[state=active]:bg-white data-[state=active]:text-orange-900"
          value="code"
        >
          Code
        </TabsTrigger>
        <TabsTrigger
          className="flex-1 data-[state=active]:bg-white data-[state=active]:text-orange-900"
          value="barcode"
        >
          Barcode
        </TabsTrigger>
        <TabsTrigger
          className="flex-1 data-[state=active]:bg-white data-[state=active]:text-orange-900"
          value="qr"
        >
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
        <div className="grid gap-3 rounded-md border border-border bg-background p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs text-muted-foreground">QR</div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!code}
              onClick={() => {
                const svg = qrWrapRef.current?.querySelector("svg") ?? null;
                if (!svg) return;
                downloadSvgAsPng(svg, `${code || "qr"}.png`);
              }}
            >
              บันทึกรูป
            </Button>
          </div>
          <div ref={qrWrapRef} className="flex items-center justify-center">
            {code ? (
              <QRCodeSVG
                value={code}
                size={200}
                includeMargin
                bgColor="#ffffff"
                fgColor="#111827"
              />
            ) : (
              <div className="text-sm text-muted-foreground">ไม่มี coupon_barcode</div>
            )}
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );
}
