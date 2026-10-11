import { api } from "@/api/client";
import PageMeta from "@/components/common/PageMeta";
import Label from "@/components/form/Label";
import Select from "@/components/form/Select";
import Input from "@/components/form/input/InputField";
import Alert from "@/components/ui/alert/Alert";
import Button from "@/components/ui/button/Button";
import { useAuth } from "@/context/AuthContext";
import { errorMessage } from "@/hooks/useAsync";
import { tr } from "@/i18n/core";
import { useI18n } from "@/i18n/I18nProvider";
import { roleLabel } from "@/utils/constants";
import type { Role } from "@/types/api";
import AreaPicker, { areaPcode, EMPTY_AREA } from "@/components/form/AreaPicker";
import Checkbox from "@/components/form/input/Checkbox";
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import AuthLayout from "./AuthLayout";

// Matches SELF_REGISTER_ROLES in backend/permissions.py. Extension agents can
// see other farmers' fields, so an administrator grants that role.
const SELF_REGISTER_ROLES: Role[] = ["farmer", "trader"];

export default function SignUp() {
  const { saveAuth } = useAuth();
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    phone: "",
    password: "",
    confirm: "",
    role: "farmer" as Role,
    area: EMPTY_AREA,
    consentData: false,
    consentAlerts: false,
    consentTraining: false,
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: value }));

  function validate(): string | null {
    if (!form.name.trim()) return tr("signup.errName");
    if (!/^0\d{9}$/.test(form.phone.trim())) return tr("signup.errPhone");
    if (form.password.length < 6) return tr("signup.errPassword");
    if (form.password !== form.confirm) return tr("signup.errMismatch");
    if (!form.area.region_pcode) return tr("signup.errRegion");
    return null;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await api.register({
        name: form.name.trim(),
        phone: form.phone.trim(),
        password: form.password,
        role: form.role,
        area_pcode: areaPcode(form.area),
        language: lang,
        consent_data: form.role === "farmer" && form.consentData,
        consent_alerts: form.role === "farmer" && form.consentAlerts,
        consent_training: form.role === "farmer" && form.consentTraining,
      });
      saveAuth(res.access_token, res.user);
      navigate("/", { replace: true });
    } catch (err) {
      setError(errorMessage(err, "service.platform"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageMeta title={`${t("signup.metaTitle")} | ${t("app.name")}`} description={t("signup.metaTitle")} />
      <AuthLayout>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
          <div className="mb-8">
            <h1 className="mb-2 text-title-sm font-semibold text-gray-800 sm:text-title-md dark:text-white/90">
              {t("signup.title")}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t("signup.subtitle")}</p>
          </div>

          <form onSubmit={onSubmit} noValidate className="space-y-5">
            {error && <Alert variant="error" message={error} />}
            <div>
              <Label htmlFor="name">
                {t("form.fullName")} <span className="text-error-500">*</span>
              </Label>
              <Input id="name" autoComplete="name" value={form.name} onChange={(e) => set("name", e.target.value)} />
            </div>
            <div>
              <Label htmlFor="phone">
                {t("form.phone")} <span className="text-error-500">*</span>
              </Label>
              <Input
                id="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="09XXXXXXXX"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <Label htmlFor="password">
                  {t("form.password")} <span className="text-error-500">*</span>
                </Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  placeholder={t("signup.passwordHint")}
                  value={form.password}
                  onChange={(e) => set("password", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="confirm">
                  {t("signup.repeatPassword")} <span className="text-error-500">*</span>
                </Label>
                <Input
                  id="confirm"
                  type="password"
                  autoComplete="new-password"
                  value={form.confirm}
                  onChange={(e) => set("confirm", e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="role">{t("signup.iAmA")}</Label>
              <Select id="role" options={SELF_REGISTER_ROLES.map((r) => ({ value: r, label: roleLabel(r) }))} value={form.role} onChange={(v) => set("role", v as Role)} />
              <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                {t("signup.agentNote")}
              </p>
            </div>
            <div>
              <AreaPicker idPrefix="signup" required value={form.area} onChange={(v) => set("area", v)} />
              <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                {t("signup.woredaNote")}
              </p>
            </div>
            {form.role === "farmer" && (
              <div className="space-y-3">
                <Checkbox id="signup-consent-data" checked={form.consentData} onChange={(v) => set("consentData", v)} label={t("signup.consentData")} />
                <Checkbox id="signup-consent-alerts" checked={form.consentAlerts} onChange={(v) => set("consentAlerts", v)} label={t("signup.consentAlerts")} />
                <Checkbox id="signup-consent-training" checked={form.consentTraining} onChange={(v) => set("consentTraining", v)} label={t("signup.consentTraining")} />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t("signup.consentNote")} {t("consent.legalDraft")}
                </p>
              </div>
            )}
            <Button type="submit" className="w-full" loading={busy}>
              {t("signup.submit")}
            </Button>
          </form>

          <p className="mt-5 text-center text-sm text-gray-700 sm:text-start dark:text-gray-400">
            {t("signup.haveAccount")}{" "}
            <Link to="/signin" className="text-brand-500 hover:text-brand-600 dark:text-brand-400">
              {t("signin.title")}
            </Link>
          </p>
        </div>
      </AuthLayout>
    </>
  );
}
