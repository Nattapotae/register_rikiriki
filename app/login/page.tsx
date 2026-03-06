"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

export default function LoginPage() {
  const [isLoadingMasters, setIsLoadingMasters] = React.useState(true);
  const [registerTypes, setRegisterTypes] = React.useState<Option[]>([]);
  const [genders, setGenders] = React.useState<Option[]>([]);
  const [customerTypes, setCustomerTypes] = React.useState<Option[]>([]);

  const [form, setForm] = React.useState({
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
          <CardTitle>Login</CardTitle>
          <CardDescription>ตัวอย่าง dropdown จาก master data</CardDescription>
        </CardHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
          }}
        >
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="phone">เบอร์โทร</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                placeholder="เช่น 0812345678"
                autoComplete="tel"
                inputMode="tel"
                value={form.phone}
                onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
              />
            </div>

            <div className="grid gap-2">
              <Label>Register Type</Label>
              <Select
                value={form.registerTypeId}
                onValueChange={(v) =>
                  setForm((prev) => ({ ...prev, registerTypeId: v }))
                }
                disabled={isLoadingMasters}
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
                onValueChange={(v) => setForm((prev) => ({ ...prev, genderId: v }))}
                disabled={isLoadingMasters}
              >
                <SelectTrigger>
                  <SelectValue placeholder="เลือก Gender" />
                </SelectTrigger>
                <SelectContent>
                  {(genders.length ? genders : [{ value: "1", label: "1" }]).map(
                    (opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    )
                  )}
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
                disabled={isLoadingMasters}
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
          </CardContent>
          <CardFooter className="justify-end">
            <Button type="submit" variant="secondary">
              เข้าสู่ระบบ (ตัวอย่าง)
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
