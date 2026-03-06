"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  WeHomeBrowserError,
  type WeHomeApiEnvelope,
  type WeHomeBrowserConfig,
  getWeHomeBrowserConfigFromEnv,
  wehomeBrowserFetchJsonWithConfig,
} from "@/lib/wehome-browser";

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

function extractMessage(payload: unknown, key: "error" | "warning"): string | null {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;
  const raw = record[key];
  return typeof raw === "string" && raw.trim()
    ? raw.trim()
    : null;
}

export default function RegisterPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitStatus, setSubmitStatus] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [otpStatus, setOtpStatus] = React.useState<string | null>(null);
  const [otpError, setOtpError] = React.useState<string | null>(null);
  const [isRequestingOtp, setIsRequestingOtp] = React.useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = React.useState(false);
  const [otpCode, setOtpCode] = React.useState("");
  const [isPhoneVerified, setIsPhoneVerified] = React.useState(false);
  const [isLoadingMasters, setIsLoadingMasters] = React.useState(true);
  const [mastersError, setMastersError] = React.useState<{
    registerType?: string;
    gender?: string;
    customerType?: string;
  }>({});
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

  const [wehomeConfig, setWehomeConfig] =
    React.useState<WeHomeBrowserConfig | null>(null);
  const [canCallWeHomeFromBrowser, setCanCallWeHomeFromBrowser] =
    React.useState<boolean | null>(null);

  React.useEffect(() => {
    const envConfig = getWeHomeBrowserConfigFromEnv();
    if (envConfig) {
      setWehomeConfig(envConfig);
      setCanCallWeHomeFromBrowser(true);
      return;
    }

    fetch("/api/wehome/client-config")
      .then((r) => r.json())
      .then((json) => {
        const baseUrl = typeof json?.baseUrl === "string" ? json.baseUrl : "";
        const authtoken =
          typeof json?.authtoken === "string" ? json.authtoken : "";
        const companyid =
          typeof json?.companyid === "string" ? json.companyid : "";

        if (baseUrl && authtoken && companyid) {
          setWehomeConfig({ baseUrl, authtoken, companyid });
          setCanCallWeHomeFromBrowser(true);
        } else {
          setCanCallWeHomeFromBrowser(false);
        }
      })
      .catch(() => setCanCallWeHomeFromBrowser(false));
  }, []);

  const loadMasters = React.useCallback(async () => {
    setIsLoadingMasters(true);
    setMastersError({});

    try {
      if (!wehomeConfig) {
        setRegisterTypes([]);
        setGenders([]);
        setCustomerTypes([]);
        setMastersError({
          registerType: "ยังไม่ได้ตั้งค่า WeHome token/companyId",
          gender: "ยังไม่ได้ตั้งค่า WeHome token/companyId",
          customerType: "ยังไม่ได้ตั้งค่า WeHome token/companyId",
        });
        return;
      }

      const [rt, g, ct] = await Promise.all([
        wehomeBrowserFetchJsonWithConfig<WeHomeApiEnvelope<unknown>>(
          wehomeConfig,
          "/thirdParty/member/master/getRegisterType"
        ),
        wehomeBrowserFetchJsonWithConfig<WeHomeApiEnvelope<unknown>>(
          wehomeConfig,
          "/thirdParty/member/master/getGender"
        ),
        wehomeBrowserFetchJsonWithConfig<WeHomeApiEnvelope<unknown>>(
          wehomeConfig,
          "/thirdParty/member/master/getCustomerType"
        ),
      ]);

      setRegisterTypes(extractOptions(rt, "type_id", "type_name"));
      setGenders(extractOptions(g, "gender_id", "gender_name"));
      setCustomerTypes(extractOptions(ct, "type_id", "type_name"));

      setMastersError({
        registerType: extractMessage(rt, "error") ?? undefined,
        gender: extractMessage(g, "error") ?? undefined,
        customerType: extractMessage(ct, "error") ?? undefined,
      });
    } catch (e) {
      setRegisterTypes([]);
      setGenders([]);
      setCustomerTypes([]);
      const message = e instanceof Error ? e.message : "โหลดข้อมูลจริงจาก WeHome ไม่สำเร็จ";
      setMastersError({
        registerType: message,
        gender: message,
        customerType: message,
      });
    } finally {
      setIsLoadingMasters(false);
    }
  }, [wehomeConfig]);

  React.useEffect(() => {
    if (canCallWeHomeFromBrowser !== true) return;
    void loadMasters();
  }, [canCallWeHomeFromBrowser, loadMasters]);

  React.useEffect(() => {
    // reset OTP state when phone changes
    setIsPhoneVerified(false);
    setOtpCode("");
    setOtpError(null);
    setOtpStatus(null);
  }, [form.phone]);

  async function requestOtp() {
    setOtpError(null);
    setOtpStatus(null);

    const phone = form.phone.trim();
    if (!phone) {
      setOtpError("กรุณากรอกเบอร์โทรก่อน");
      return;
    }

    setIsRequestingOtp(true);
    try {
      const res = await fetch("/api/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const json = (await res.json().catch(() => null)) as
        | { ok: true; expiresInSec?: number; code?: string }
        | { ok: false; error: string }
        | null;

      if (res.ok && json && json.ok) {
        setOtpStatus("ส่ง OTP แล้ว (อายุ 5 นาที)");
        if (json.code) setOtpStatus(`DEV OTP: ${json.code}`);
        return;
      }

      if (json && json.ok === false && json.error === "PHONE_TAKEN") {
        setOtpError("เบอร์โทรนี้ถูกใช้งานแล้ว");
        return;
      }
      if (json && json.ok === false && json.error === "TOO_MANY_REQUESTS") {
        setOtpError("ขอ OTP บ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่");
        return;
      }
      if (json && json.ok === false && json.error === "INVALID_PHONE") {
        setOtpError("รูปแบบเบอร์โทรไม่ถูกต้อง (ต้องเป็น 0xxxxxxxxx)");
        return;
      }

      setOtpError("ส่ง OTP ไม่สำเร็จ");
    } catch {
      setOtpError("เชื่อมต่อเซิร์ฟเวอร์ไม่ได้");
    } finally {
      setIsRequestingOtp(false);
    }
  }

  async function verifyOtp() {
    setOtpError(null);
    setOtpStatus(null);

    const phone = form.phone.trim();
    const code = otpCode.trim();
    if (!phone) {
      setOtpError("กรุณากรอกเบอร์โทรก่อน");
      return;
    }
    if (!/^\d{6}$/.test(code)) {
      setOtpError("กรุณากรอก OTP 6 หลัก");
      return;
    }

    setIsVerifyingOtp(true);
    try {
      const res = await fetch("/api/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code }),
      });
      const json = (await res.json().catch(() => null)) as
        | { ok: true }
        | { ok: false; error: string }
        | null;

      if (res.ok && json && json.ok) {
        setIsPhoneVerified(true);
        setOtpStatus("ยืนยันเบอร์โทรสำเร็จ");
        return;
      }

      if (json && json.ok === false && json.error === "OTP_INVALID") {
        setOtpError("OTP ไม่ถูกต้อง");
        return;
      }
      if (json && json.ok === false && json.error === "OTP_NOT_FOUND") {
        setOtpError("ไม่พบ OTP หรือหมดอายุแล้ว กรุณาขอใหม่");
        return;
      }
      if (json && json.ok === false && json.error === "OTP_LOCKED") {
        setOtpError("ลองผิดหลายครั้ง กรุณาขอ OTP ใหม่");
        return;
      }

      setOtpError("ยืนยัน OTP ไม่สำเร็จ");
    } catch {
      setOtpError("เชื่อมต่อเซิร์ฟเวอร์ไม่ได้");
    } finally {
      setIsVerifyingOtp(false);
    }
  }
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
		            setSubmitStatus("กำลังตรวจสอบเบอร์โทร...");
		            setIsSubmitting(true);

		            try {
		              if (!isPhoneVerified) {
		                setError("กรุณายืนยันเบอร์โทรด้วย OTP ก่อนสมัคร");
		                return;
		              }

		              const preflight = await fetch("/api/register/preflight", {
		                method: "POST",
		                headers: { "Content-Type": "application/json" },
		                body: JSON.stringify({ phone: form.phone }),
	              }).then((r) => r.json().catch(() => null));

		              if (preflight && preflight.ok === false && preflight.error === "PHONE_TAKEN") {
		                setError("เบอร์โทรนี้ถูกใช้งานแล้ว");
		                return;
		              }

		              if (!wehomeConfig) {
		                setError(
		                  "ยังไม่มีค่า WeHome token/companyId สำหรับฝั่ง client (เช็ค NEXT_PUBLIC_WEHOME_AUTH_TOKEN/NEXT_PUBLIC_WEHOME_COMPANY_ID หรือเช็ค server env: JWT_TOKEN_SECRET/COMPANY_ID)"
		                );
		                return;
		              }

		              setSubmitStatus("กำลังส่งข้อมูลไป WeHome...");
		              const parts = form.fullName.trim().split(/\s+/).filter(Boolean);
		              const firstName = parts[0] ?? "";
		              const lastName = parts.slice(1).join(" ");

	              const wehomeRequest = {
	                customer_id: "0",
	                customer_code: "Running",
	                tax_code: "XXXXXXXXXXXXX",
	                id_card: "XXXXXXXXXXXXX",
	                title_id: "7",
	                first_name: firstName,
	                last_name: lastName,
	                full_name: form.fullName,
	                first_name_eng: firstName,
	                last_name_eng: lastName,
	                full_name_eng: form.fullName,
	                full_address: "ทดสอบ API",
	                mobile: form.phone,
	                office_phone: "",
	                birthday: "2000-01-01",
	                gender_id: form.genderId,
	                register_type_id: form.registerTypeId,
	                customer_rank_id: "1",
	                customer_type_id: form.customerTypeId,
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
	                    customer_name: form.fullName,
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
	                customer_email_list: [{ email: form.email.toLowerCase() }],
	                approve_list: [],
	              };

		              let wehomeResponse: unknown;
		              try {
		                wehomeResponse = await wehomeBrowserFetchJsonWithConfig<unknown>(
		                  wehomeConfig,
		                  "/thirdParty/member/customer/InsertUpdateCustomer",
		                  { method: "POST", body: JSON.stringify(wehomeRequest) }
		                );
		              } catch (e) {
		                if (e instanceof WeHomeBrowserError && e.body.includes("CLOUDFLARE_CHALLENGE")) {
		                  setError(
		                    "WeHome API ตอบกลับเป็นหน้า Cloudflare (Just a moment). ถ้ายังไม่ผ่าน ให้ลองเปิด API ในแท็บใหม่ 1 ครั้ง แล้วกลับมากดสมัครใหม่"
		                  );
		                  return;
		                }
		                setError("เรียก WeHome API ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
		                return;
		              }

		              setSubmitStatus("กำลังบันทึกลงฐานข้อมูล...");
		              const finalizeRes = await fetch("/api/register/finalize", {
		                method: "POST",
		                headers: { "Content-Type": "application/json" },
		                body: JSON.stringify({
	                  form,
	                  wehomeRequest,
	                  wehomeResponse,
	                }),
	              });

	              const finalize = (await finalizeRes.json().catch(() => null)) as
	                | { ok: true; id: string }
	                | { ok: false; error: string }
	                | null;

		              if (finalizeRes.ok && finalize && finalize.ok && typeof finalize.id === "string") {
		                setSubmitStatus("สำเร็จ กำลังไปหน้าคูปอง...");
		                router.push(`/register/success?id=${encodeURIComponent(finalize.id)}`);
		                return;
		              }

	              if (finalize && finalize.ok === false && finalize.error === "PHONE_TAKEN") {
	                setError("เบอร์โทรนี้ถูกใช้งานแล้ว");
	                return;
	              }

		              setError("บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
		            } catch {
		              setError("เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาลองใหม่อีกครั้ง");
		            } finally {
		              setIsSubmitting(false);
		              setSubmitStatus(null);
		            }
		          }}
	        >
          <CardContent className="grid gap-4">
            {mastersError.registerType ||
            mastersError.gender ||
            mastersError.customerType ? (
              <Alert variant="destructive">
                <AlertTitle>โหลดข้อมูลสำหรับ Dropdown ไม่สำเร็จ</AlertTitle>
                <AlertDescription>
                  <div className="grid gap-1">
                    {mastersError.registerType ? (
                      <div>Register Type: {mastersError.registerType}</div>
                    ) : null}
                    {mastersError.gender ? (
                      <div>Gender: {mastersError.gender}</div>
                    ) : null}
                    {mastersError.customerType ? (
                      <div>Customer Type: {mastersError.customerType}</div>
                    ) : null}
                    <div className="mt-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => void loadMasters()}
                      >
                        ลองโหลดใหม่
                      </Button>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            ) : null}
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
	                disabled={isSubmitting || isPhoneVerified}
	                value={form.phone}
	                onChange={(e) =>
	                  setForm((prev) => ({ ...prev, phone: e.target.value }))
	                }
	              />
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isSubmitting || isRequestingOtp || isPhoneVerified}
                    onClick={() => void requestOtp()}
                  >
                    {isRequestingOtp ? (
                      <span className="inline-flex items-center">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        กำลังส่ง...
                      </span>
                    ) : (
                      "ส่ง OTP"
                    )}
                  </Button>
                  {isPhoneVerified ? (
                    <span className="text-xs font-medium text-emerald-700">
                      ยืนยันแล้ว
                    </span>
                  ) : null}
                </div>
                {!isPhoneVerified ? (
                  <div className="grid gap-2">
                    <div className="grid gap-1">
                      <Label htmlFor="otp" className="text-xs">
                        OTP (6 หลัก)
                      </Label>
                      <div className="flex items-center gap-2">
                        <Input
                          id="otp"
                          name="otp"
                          inputMode="numeric"
                          placeholder="123456"
                          value={otpCode}
                          disabled={isSubmitting || isVerifyingOtp}
                          onChange={(e) => setOtpCode(e.target.value)}
                        />
                        <Button
                          type="button"
                          size="sm"
                          disabled={isSubmitting || isVerifyingOtp}
                          onClick={() => void verifyOtp()}
                        >
                          {isVerifyingOtp ? (
                            <span className="inline-flex items-center">
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              กำลังยืนยัน...
                            </span>
                          ) : (
                            "ยืนยัน"
                          )}
                        </Button>
                      </div>
                    </div>
                    {otpStatus ? (
                      <p className="text-xs text-muted-foreground">{otpStatus}</p>
                    ) : null}
                    {otpError ? (
                      <p className="text-xs text-destructive">{otpError}</p>
                    ) : null}
                  </div>
                ) : null}
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
	              {mastersError.registerType ? (
	                <p className="text-xs text-destructive">
	                  {mastersError.registerType}
	                </p>
	              ) : null}
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
	              {mastersError.gender ? (
	                <p className="text-xs text-destructive">{mastersError.gender}</p>
	              ) : null}
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
	              {mastersError.customerType ? (
	                <p className="text-xs text-destructive">
	                  {mastersError.customerType}
	                </p>
	              ) : null}
	            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </CardContent>
	          <CardFooter className="flex flex-col items-end gap-2">
	            <Button
	              type="submit"
	              disabled={
	                isSubmitting ||
	                canCallWeHomeFromBrowser === null ||
	                !isPhoneVerified
	              }
	            >
	              {isSubmitting ? (
	                <span className="inline-flex items-center">
	                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
	                  กำลังสมัคร...
	                </span>
	              ) : (
	                "สมัครสมาชิก"
	              )}
	            </Button>
	            {isSubmitting && submitStatus ? (
	              <p className="text-right text-xs text-muted-foreground">
	                {submitStatus}
	              </p>
	            ) : null}
	            {canCallWeHomeFromBrowser === null ? (
	              <p className="text-right text-xs text-muted-foreground">
	                กำลังเตรียม WeHome config...
	              </p>
	            ) : null}
	            {canCallWeHomeFromBrowser === false ? (
	              <p className="text-right text-xs text-muted-foreground">
	                WeHome client config: missing token/companyId
	              </p>
	            ) : null}
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
