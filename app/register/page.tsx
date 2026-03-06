"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Option = { value: string; label: string };

function extractOptions(
  payload: unknown,
  valueKey: string,
  labelKey: string
): Option[] {
  if (!payload || typeof payload !== "object") return [];
  const record = payload as Record<string, unknown>;

  if (Array.isArray(record.options)) {
    return record.options.filter(
      (x): x is Option =>
        Boolean(x) &&
        typeof (x as Option).value === "string" &&
        typeof (x as Option).label === "string"
    );
  }

  const data = record.data;
  if (!Array.isArray(data)) return [];

  return data
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const it = item as Record<string, unknown>;
      const v = it[valueKey];
      const l = it[labelKey];
      const value =
        typeof v === "string" || typeof v === "number" ? String(v) : null;
      const label =
        typeof l === "string" || typeof l === "number" ? String(l) : null;
      if (!value) return null;
      return { value, label: label ?? value } satisfies Option;
    })
    .filter((x): x is Option => Boolean(x));
}

export default function RegisterPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [isLoadingMasters, setIsLoadingMasters] = React.useState(true);
  const [registerTypes, setRegisterTypes] = React.useState<Option[]>([]);
  const [genders, setGenders] = React.useState<Option[]>([]);
  const [customerTypes, setCustomerTypes] = React.useState<Option[]>([]);
  const [form, setForm] = React.useState({
    fullName: "",
    email: "",
    phone: "",
    registerTypeId: "1",
    genderId: "1",
    customerTypeId: "1",
  });

  React.useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const [rt, g, ct] = await Promise.all([
          fetch("/api/wehome/master/register-type").then((r) => r.json()),
          fetch("/api/wehome/master/gender").then((r) => r.json()),
          fetch("/api/wehome/master/customer-type").then((r) => r.json()),
        ]);

        if (cancelled) return;

        setRegisterTypes(extractOptions(rt, "type_id", "type_name"));
        setGenders(extractOptions(g, "gender_id", "gender_name"));
        setCustomerTypes(extractOptions(ct, "type_id", "type_name"));
      } catch {
        if (!cancelled) {
          setRegisterTypes([]);
          setGenders([]);
          setCustomerTypes([]);
        }
      } finally {
        if (!cancelled) setIsLoadingMasters(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Register</CardTitle>
          <CardDescription>กรอกข้อมูลเพื่อสมัครสมาชิก</CardDescription>
        </CardHeader>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setError(null);
            setIsSubmitting(true);

            try {
              const res = await fetch("/api/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
              });

              const data = (await res.json().catch(() => null)) as
                | { ok: true; id: string }
                | { ok: false; error: string }
                | null;

              if (res.ok && data && data.ok && typeof data.id === "string") {
                router.push(
                  `/register/success?id=${encodeURIComponent(data.id)}`,
                );
                return;
              }

              if (data && !data.ok && data.error === "PHONE_TAKEN") {
                setError("เบอร์โทรนี้ถูกใช้งานแล้ว");
                return;
              }

              setError("บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
            } catch {
              setError("เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาลองใหม่อีกครั้ง");
            } finally {
              setIsSubmitting(false);
            }
          }}
        >
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="fullName">ชื่อ - สกุล</Label>
              <Input
                id="fullName"
                name="fullName"
                placeholder="เช่น Nattapon Ch..."
                autoComplete="name"
                required
                disabled={isSubmitting}
                value={form.fullName}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, fullName: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                required
                disabled={isSubmitting}
                value={form.email}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, email: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone">เบอร์โทร</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                placeholder="เช่น 0812345678"
                autoComplete="tel"
                inputMode="tel"
                required
                disabled={isSubmitting}
                value={form.phone}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, phone: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label>Register Type</Label>
              <Select
                value={form.registerTypeId}
                onValueChange={(v) =>
                  setForm((prev) => ({ ...prev, registerTypeId: v }))
                }
                disabled={isSubmitting || isLoadingMasters}
              >
                <SelectTrigger>
                  <SelectValue placeholder="เลือก Register Type" />
                </SelectTrigger>
                <SelectContent>
                  {(registerTypes.length
                    ? registerTypes
                    : [{ value: "1", label: "1" }]
                  ).map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Gender</Label>
              <Select
                value={form.genderId}
                onValueChange={(v) =>
                  setForm((prev) => ({ ...prev, genderId: v }))
                }
                disabled={isSubmitting || isLoadingMasters}
              >
                <SelectTrigger>
                  <SelectValue placeholder="เลือก Gender" />
                </SelectTrigger>
                <SelectContent>
                  {(genders.length
                    ? genders
                    : [{ value: "1", label: "1" }]
                  ).map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Customer Type</Label>
              <Select
                value={form.customerTypeId}
                onValueChange={(v) =>
                  setForm((prev) => ({ ...prev, customerTypeId: v }))
                }
                disabled={isSubmitting || isLoadingMasters}
              >
                <SelectTrigger>
                  <SelectValue placeholder="เลือก Customer Type" />
                </SelectTrigger>
                <SelectContent>
                  {(customerTypes.length
                    ? customerTypes
                    : [{ value: "1", label: "1" }]
                  ).map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </CardContent>
          <CardFooter className="justify-end">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "กำลังบันทึก..." : "สมัครสมาชิก"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
