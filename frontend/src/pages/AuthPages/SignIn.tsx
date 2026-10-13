import { api } from "@/api/client";
import PageMeta from "@/components/common/PageMeta";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import Alert from "@/components/ui/alert/Alert";
import Button from "@/components/ui/button/Button";
import { useAuth } from "@/context/AuthContext";
import { errorMessage } from "@/hooks/useAsync";
import { EyeCloseIcon, EyeIcon } from "@/icons";
import type { MessageKey } from "@/i18n/core";
import { useI18n } from "@/i18n/I18nProvider";
import { roleLabel } from "@/utils/constants";
import { useEffect, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import AuthLayout from "./AuthLayout";

type DemoAccount = { role: string; phone: string; password: string; note?: MessageKey };

/** Local development fallback; a demo server sends its own list (GET /auth/demo-accounts, DEMO_MODE=1). */
const DEV_DEMO_ACCOUNTS: DemoAccount[] = [
  { role: "farmer", phone: "0944000001", password: "demo1234", note: "signin.demo.pitchFarmer" },
  { role: "farmer", phone: "0944000003", password: "demo1234", note: "signin.demo.farmerCases" },
  { role: "farmer", phone: "0945000023", password: "demo1234", note: "signin.demo.oromiaFarmer" },
  { role: "agent", phone: "0944000002", password: "demo1234" },
  { role: "agronomist", phone: "0944000006", password: "demo1234" },
  { role: "government", phone: "0944000004", password: "demo1234" },
  { role: "trader", phone: "0933456789", password: "trader123" },
  { role: "supplier", phone: "0944000005", password: "demo1234" },
  { role: "agro_dealer", phone: "0944000007", password: "demo1234" },
  { role: "abc_manager", phone: "0944000008", password: "demo1234" },
  { role: "farm_manager", phone: "0944000009", password: "demo1234" },
  { role: "regulator", phone: "0944000010", password: "demo1234" },
  { role: "ngo_staff", phone: "0944000011", password: "demo1234" },
  { role: "lender", phone: "0944000012", password: "demo1234" },
  { role: "ati_officer", phone: "0944000013", password: "demo1234" },
  { role: "admin", phone: "0900000001", password: "admin123" },
];

// Local development shows the fallback list unless VITE_DEMO_LOGINS=0; a deployed site shows the server's list.
const DEV_LIST = import.meta.env.DEV && import.meta.env.VITE_DEMO_LOGINS !== "0";

export default function SignIn() {
  const { saveAuth } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? "/";

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [demo, setDemo] = useState<DemoAccount[]>(DEV_LIST ? DEV_DEMO_ACCOUNTS : []);

  useEffect(() => {
    let live = true;
    api
      .demoAccounts()
      .then((r) => {
        if (live && r.enabled && r.accounts.length) setDemo(r.accounts as DemoAccount[]);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);

  async function signIn(phoneValue: string, passwordValue: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await api.login({ phone: phoneValue.trim(), password: passwordValue });
      saveAuth(res.access_token, res.user);
      navigate(from, { replace: true });
    } catch (err) {
      setError(errorMessage(err, "service.platform"));
    } finally {
      setBusy(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!phone.trim() || !password) {
      setError(t("signin.missing"));
      return;
    }
    await signIn(phone, password);
  }

  return (
    <>
      <PageMeta title={`${t("signin.title")} | ${t("app.name")}`} description={t("signin.title")} />
      <AuthLayout>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
          <div className="mb-8">
            <h1 className="mb-2 text-title-sm font-semibold text-gray-800 sm:text-title-md dark:text-white/90">{t("signin.title")}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t("signin.subtitle")}</p>
          </div>

          <form onSubmit={onSubmit} noValidate className="space-y-5">
            {error && <Alert variant="error" message={error} />}
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
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="password">
                {t("form.password")} <span className="text-error-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder={t("form.passwordPlaceholder")}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? t("form.hidePassword") : t("form.showPassword")}
                  className="absolute inset-e-4 top-1/2 z-30 -translate-y-1/2 text-gray-500 dark:text-gray-400"
                >
                  {showPassword ? <EyeIcon className="size-5" /> : <EyeCloseIcon className="size-5" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full" loading={busy}>
              {t("signin.title")}
            </Button>
          </form>

          <p className="mt-5 text-center text-sm text-gray-700 sm:text-start dark:text-gray-400">
            {t("signin.noAccount")}{" "}
            <Link to="/signup" className="text-brand-500 hover:text-brand-600 dark:text-brand-400">
              {t("signin.createOne")}
            </Link>
          </p>

          {demo.length > 0 && (
            <div className="mt-8 rounded-xl border border-dashed border-gray-300 p-4 dark:border-gray-700">
              <p className="text-theme-xs font-medium tracking-wide text-gray-500 uppercase dark:text-gray-400">
                {t("signin.demoAccounts")}
              </p>
              <p className="mb-3 text-theme-xs text-gray-500 dark:text-gray-400">{t("signin.demoHint")}</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {demo.map((a) => (
                  <button
                    key={a.phone}
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setPhone(a.phone);
                      setPassword(a.password);
                      void signIn(a.phone, a.password);
                    }}
                    className="rounded-lg border border-gray-200 px-3 py-2 text-start text-theme-xs transition hover:border-brand-300 hover:bg-brand-50 disabled:opacity-50 dark:border-gray-800 dark:hover:border-brand-800 dark:hover:bg-brand-500/10"
                  >
                    <span className="block font-medium text-gray-800 dark:text-white/90">{roleLabel(a.role)}</span>
                    {a.note && <span className="block text-gray-600 dark:text-gray-300">{t(a.note)}</span>}
                    <span className="block font-mono text-gray-500 dark:text-gray-400">{a.phone}</span>
                    <span className="block font-mono text-gray-500 dark:text-gray-400">
                      {t("signin.demoPassword")}: {a.password}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </AuthLayout>
    </>
  );
}
