import { submitFeedback } from "@/api/client";
import PageMeta from "@/components/common/PageMeta";
import {
  INTEREST_LABELS,
  INTERESTS,
  LIKED,
  LIKED_LABELS,
  VISITOR_TYPE_LABELS,
  VISITOR_TYPES,
  type FeedbackForm,
  type Interest,
  type Liked,
} from "@/types/feedback";
import { cn } from "@/utils";
import { CheckCircle2, Loader2, Star } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Link, useLocation } from "react-router";
import PublicLayout from "./PublicLayout";
import { BUTTON, visitSource } from "./site";

const DRAFT_KEY = "as360_feedback_draft";
const MAX_COMMENTS = 1000;

const EMPTY: FeedbackForm = {
  name: "",
  organisation: "",
  visitor_type: "",
  email: "",
  phone: "",
  rating: null,
  liked: [],
  comments: "",
  interests: [],
  may_contact: true,
  consent: false,
  source: null,
  website: "",
};

/** Same phone rule as the server (backend/feedback.py normalise_phone). */
function phoneOk(raw: string): boolean {
  const d = raw.replace(/[\s\-().]/g, "");
  return /^0[79]\d{8}$/.test(d) || /^\+?251[79]\d{8}$/.test(d) || /^\+[1-9]\d{7,14}$/.test(d);
}

function validate(f: FeedbackForm): Record<string, string> {
  const e: Record<string, string> = {};
  if (!f.name.trim()) e.name = "Please enter your name.";
  if (!f.visitor_type) e.visitor_type = "Please choose who you are.";
  const email = f.email.trim();
  const phone = f.phone.trim();
  if (email && !/^[^@\s]+@[^@\s]+\.[A-Za-z]{2,}$/.test(email)) e.email = "This email address doesn't look right.";
  if (phone && !phoneOk(phone)) e.phone = "Use a number like 0911 234 567 or +251 911 234 567 (other countries: start with +).";
  if (!email && !phone) e.contact = "Please give an email address or a phone number.";
  if (!f.rating) e.rating = "Please choose a rating from 1 to 5 stars.";
  if (f.comments.length > MAX_COMMENTS) e.comments = `Please keep comments under ${MAX_COMMENTS.toLocaleString()} characters.`;
  if (!f.consent) e.consent = "Please tick the consent box so we may store your answers.";
  return e;
}

/** Field order, for moving focus to the first problem. */
const FIELD_IDS: [string, string][] = [
  ["name", "fb-name"], ["visitor_type", "fb-type"], ["email", "fb-email"], ["contact", "fb-email"],
  ["phone", "fb-phone"], ["rating", "fb-rating-1"], ["comments", "fb-comments"], ["consent", "fb-consent"],
];

function readDraft(): Partial<FeedbackForm> {
  try {
    return JSON.parse(sessionStorage.getItem(DRAFT_KEY) ?? "{}") as Partial<FeedbackForm>;
  } catch {
    return {};
  }
}

const inputClass = (error?: string) =>
  cn(
    "block w-full rounded-xl border bg-white px-4 py-3 text-base text-gray-900 placeholder:text-gray-400 focus:ring-3 focus:outline-hidden",
    error ? "border-error-500 focus:ring-error-500/15" : "border-gray-300 focus:border-brand-500 focus:ring-brand-500/15",
  );

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? (
    <p id={id} className="mt-1.5 text-sm font-medium text-error-600">
      {message}
    </p>
  ) : null;
}

function Field({ label, htmlFor, optional, error, errorId, children }: {
  label: string; htmlFor: string; optional?: boolean; error?: string; errorId: string; children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block font-semibold text-gray-900">
        {label} {optional && <span className="font-normal text-gray-500">(optional)</span>}
      </label>
      {children}
      <FieldError id={errorId} message={error} />
    </div>
  );
}

function Chips<T extends string>({ legend, options, labels, value, onChange, name }: {
  legend: string; options: readonly T[]; labels: Record<T, string>; value: T[]; onChange: (v: T[]) => void; name: string;
}) {
  return (
    <fieldset>
      <legend className="mb-2 font-semibold text-gray-900">
        {legend} <span className="font-normal text-gray-500">(optional, choose any)</span>
      </legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const on = value.includes(o);
          return (
            <label
              key={o}
              className={cn(
                "inline-flex min-h-11 cursor-pointer items-center rounded-full border px-4 text-base font-medium select-none has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand-600",
                on ? "border-brand-700 bg-brand-700 text-white" : "border-gray-300 bg-white text-gray-800 hover:border-brand-500",
              )}
            >
              <input
                type="checkbox"
                name={name}
                className="sr-only"
                checked={on}
                onChange={() => onChange(on ? value.filter((x) => x !== o) : [...value, o])}
              />
              {on && <span aria-hidden="true" className="me-1.5">✓</span>}
              {labels[o]}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export default function Feedback() {
  const { search } = useLocation();
  const [form, setForm] = useState<FeedbackForm>(() => {
    const params = new URLSearchParams(search);
    const draft = readDraft();
    const interests = [...(draft.interests ?? [])];
    if (params.get("type") === "partner" && !interests.includes("partnership")) interests.push("partnership");
    return { ...EMPTY, ...draft, interests, consent: false, source: visitSource(search), website: "" };
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [problem, setProblem] = useState<{ message: string; retry: boolean } | null>(null);
  const [done, setDone] = useState(false);
  const sendingRef = useRef(false);
  const topRef = useRef<HTMLHeadingElement>(null);

  // Keep what was typed in this tab until it is sent (lost connection, reload). Session storage, not
  // local: booth tablets are shared, and a closed tab forgets the answers.
  useEffect(() => {
    if (done) return;
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ ...form, website: "" }));
    } catch {
      /* private window: the answers stay while the page is open */
    }
  }, [form, done]);

  const set = <K extends keyof FeedbackForm>(key: K, value: FeedbackForm[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    // An answer being changed is no longer wrong; its message goes until the next Send.
    setErrors((errs) => {
      const next = { ...errs };
      delete next[key];
      if (key === "email" || key === "phone") delete next.contact;
      return next;
    });
  };

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (sendingRef.current) return;   // double tap
    const found = validate(form);
    setErrors(found);
    setProblem(null);
    if (Object.keys(found).length) {
      const first = FIELD_IDS.find(([k]) => found[k]);
      if (first) document.getElementById(first[1])?.focus();
      return;
    }
    sendingRef.current = true;
    setSending(true);
    try {
      const res = await submitFeedback(form);
      if (res.ok) {
        try {
          sessionStorage.removeItem(DRAFT_KEY);
        } catch {
          /* nothing saved */
        }
        setDone(true);
        window.scrollTo({ top: 0 });
        return;
      }
      if (Object.keys(res.fields).length) {
        setErrors(res.fields);
        setProblem({ message: "Please check the highlighted answers.", retry: false });
      } else {
        setProblem({ message: res.message, retry: res.status >= 429 });
      }
    } catch {
      setProblem({
        message: "We couldn't reach our server. Your answers are kept on this phone. Check your connection and tap Retry.",
        retry: true,
      });
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  }

  useEffect(() => {
    if (done) topRef.current?.focus();
  }, [done]);

  const site = typeof window !== "undefined" ? window.location.origin + "/" : "https://agristack.debbal.com/";
  const shareText = "Agri-Stack 360: AI agricultural intelligence for Ethiopian farmers";

  return (
    <PublicLayout path="/feedback">
      <PageMeta
        title="Give feedback | Agri-Stack 360"
        description="Tell the Agri-Stack 360 team what you think. It takes under a minute."
      />
      <div className="mx-auto max-w-2xl px-4 py-8 md:py-12">
        {done ? (
          <div className="rounded-2xl bg-brand-25 p-8 text-center">
            <CheckCircle2 className="mx-auto size-14 text-brand-600" aria-hidden="true" />
            <h1 ref={topRef} tabIndex={-1} className="mt-4 text-3xl font-bold text-gray-900 focus:outline-hidden">
              Thank you! We'll be in touch.
            </h1>
            <div className="mt-8 flex flex-col gap-3">
              <Link to="/" className={BUTTON.primary}>Visit our website</Link>
              <a
                className={BUTTON.outline}
                href={`https://t.me/share/url?url=${encodeURIComponent(site)}&text=${encodeURIComponent(shareText)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Share on Telegram
              </a>
              <a
                className={BUTTON.outline}
                href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(site)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Share on LinkedIn
              </a>
            </div>
          </div>
        ) : (
          <>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 md:text-4xl">Give feedback</h1>
            <p className="mt-2 text-lg text-gray-600">Tell us what you think of Agri-Stack 360. It takes under a minute.</p>

            <form className="mt-8 space-y-6" onSubmit={onSubmit} noValidate>
              <Field label="Your name" htmlFor="fb-name" error={errors.name} errorId="fb-name-error">
                <input id="fb-name" className={inputClass(errors.name)} value={form.name} maxLength={120} autoComplete="name"
                  aria-invalid={!!errors.name} aria-describedby={errors.name ? "fb-name-error" : undefined}
                  onChange={(e) => set("name", e.target.value)} />
              </Field>

              <Field label="Organisation" htmlFor="fb-org" optional errorId="fb-org-error" error={errors.organisation}>
                <input id="fb-org" className={inputClass(errors.organisation)} value={form.organisation} maxLength={160}
                  autoComplete="organization" onChange={(e) => set("organisation", e.target.value)} />
              </Field>

              <Field label="I am a…" htmlFor="fb-type" error={errors.visitor_type} errorId="fb-type-error">
                <select id="fb-type" className={cn(inputClass(errors.visitor_type), "min-h-12")} value={form.visitor_type}
                  aria-invalid={!!errors.visitor_type} aria-describedby={errors.visitor_type ? "fb-type-error" : undefined}
                  onChange={(e) => set("visitor_type", e.target.value as FeedbackForm["visitor_type"])}>
                  <option value="">Choose one</option>
                  {VISITOR_TYPES.map((v) => (
                    <option key={v} value={v}>{VISITOR_TYPE_LABELS[v]}</option>
                  ))}
                </select>
              </Field>

              <fieldset className="space-y-4">
                <legend className="font-semibold text-gray-900">How can we reach you?</legend>
                <p className="-mt-2 text-sm text-gray-600">An email address or a phone number (one is enough).</p>
                <Field label="Email" htmlFor="fb-email" error={errors.email} errorId="fb-email-error">
                  <input id="fb-email" type="email" inputMode="email" autoComplete="email" className={inputClass(errors.email ?? errors.contact)}
                    value={form.email} maxLength={200} aria-invalid={!!(errors.email ?? errors.contact)}
                    aria-describedby={errors.email ? "fb-email-error" : errors.contact ? "fb-contact-error" : undefined}
                    onChange={(e) => set("email", e.target.value)} />
                </Field>
                <Field label="Phone" htmlFor="fb-phone" error={errors.phone} errorId="fb-phone-error">
                  <input id="fb-phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="09… or +251…"
                    className={inputClass(errors.phone ?? errors.contact)} value={form.phone} maxLength={24}
                    aria-invalid={!!(errors.phone ?? errors.contact)}
                    aria-describedby={errors.phone ? "fb-phone-error" : errors.contact ? "fb-contact-error" : undefined}
                    onChange={(e) => set("phone", e.target.value)} />
                </Field>
                <FieldError id="fb-contact-error" message={errors.contact} />
              </fieldset>

              <fieldset aria-describedby={errors.rating ? "fb-rating-error" : undefined}>
                <legend className="mb-2 font-semibold text-gray-900">Overall rating</legend>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((n) => {
                    const lit = (form.rating ?? 0) >= n;
                    return (
                      <label key={n} className="cursor-pointer rounded-lg p-1 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-brand-600">
                        <input id={`fb-rating-${n}`} type="radio" name="rating" value={n} className="sr-only"
                          checked={form.rating === n} onChange={() => set("rating", n)} />
                        <Star aria-hidden="true" className={cn("size-11", lit ? "fill-amber-400 text-amber-500" : "text-gray-300")} strokeWidth={1.5} />
                        <span className="sr-only">{n} {n === 1 ? "star" : "stars"}</span>
                      </label>
                    );
                  })}
                </div>
                <FieldError id="fb-rating-error" message={errors.rating} />
              </fieldset>

              <Chips<Liked> legend="What did you like most?" name="liked" options={LIKED} labels={LIKED_LABELS}
                value={form.liked} onChange={(v) => set("liked", v)} />

              <Field label="Comments or suggestions" htmlFor="fb-comments" optional error={errors.comments} errorId="fb-comments-error">
                <textarea id="fb-comments" rows={4} maxLength={MAX_COMMENTS} className={inputClass(errors.comments)}
                  value={form.comments} onChange={(e) => set("comments", e.target.value)}
                  aria-describedby="fb-comments-count" />
                <p id="fb-comments-count" className="mt-1 text-right text-sm text-gray-500">
                  {form.comments.length} / {MAX_COMMENTS.toLocaleString()}
                </p>
              </Field>

              <Chips<Interest> legend="I'm interested in" name="interests" options={INTERESTS} labels={INTEREST_LABELS}
                value={form.interests} onChange={(v) => set("interests", v)} />

              {/* Honeypot: hidden from people and screen readers; bots fill it in. */}
              <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
                <label htmlFor="fb-website">Website</label>
                <input id="fb-website" name="website" tabIndex={-1} autoComplete="off" value={form.website}
                  onChange={(e) => set("website", e.target.value)} />
              </div>

              <div className="space-y-3 rounded-2xl bg-gray-50 p-4">
                <label className="flex min-h-11 cursor-pointer items-start gap-3">
                  <input type="checkbox" className="mt-0.5 size-6 shrink-0 accent-brand-700" checked={form.may_contact}
                    onChange={(e) => set("may_contact", e.target.checked)} />
                  <span>May we contact you?</span>
                </label>
                <div>
                  <label className="flex min-h-11 cursor-pointer items-start gap-3">
                    <input id="fb-consent" type="checkbox" className="mt-0.5 size-6 shrink-0 accent-brand-700" checked={form.consent}
                      aria-invalid={!!errors.consent} aria-describedby={errors.consent ? "fb-consent-error" : undefined}
                      onChange={(e) => set("consent", e.target.checked)} />
                    <span>
                      I agree that Agri-Stack 360 may store this information to respond to me.{" "}
                      <Link to="/privacy" target="_blank" className="font-semibold text-brand-800 underline">
                        Privacy note
                      </Link>
                    </span>
                  </label>
                  <FieldError id="fb-consent-error" message={errors.consent} />
                </div>
              </div>

              {problem && (
                <div role="alert" className="rounded-xl border border-error-200 bg-error-50 p-4 text-error-800">
                  <p>{problem.message}</p>
                </div>
              )}

              <button type="submit" disabled={sending} className={cn(BUTTON.primary, "w-full text-lg disabled:opacity-70")}>
                {sending ? (
                  <>
                    <Loader2 className="size-5 animate-spin" aria-hidden="true" /> Sending…
                  </>
                ) : problem?.retry ? (
                  "Retry"
                ) : (
                  "Send feedback"
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </PublicLayout>
  );
}
