import PageMeta from "@/components/common/PageMeta";
import { cn } from "@/utils";
import {
  ArrowRight,
  BellRing,
  Brain,
  Building2,
  Camera,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  CloudSunRain,
  Landmark,
  Languages,
  MapPin,
  MessageSquareText,
  Phone,
  ShieldCheck,
  Sprout,
  TrendingUp,
  Trophy,
  Truck,
  Users,
  type LucideIcon,
} from "lucide-react";
import { fetchPartners, partnerLogoSrc } from "@/api/client";
import type { WebsitePartner } from "@/types/feedback";
import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router";
import PublicLayout from "./PublicLayout";
import { BUTTON, PHONE, PHONE_HREF } from "./site";

// Layout modelled on plantix.net (centred hero over a photo collage with a phone, alternating feature rows,
// numbers row, split recognition card, organisations card). Every fact comes from
// docs/agristack-landing-feedback-spec.md section 2: don't add claims that aren't there (no "patented";
// OpenAgriNet is "designed for", never "built on"; no testimonials until real ones are provided).

/**
 * Field photos (pilot in Dawa Cheffa: DAs, farmers, training). Put WebP files under 200 kB in
 * public/images/landing/ and set the paths here; until then a drawn field illustration is shown.
 */
const PHOTOS: { src: string | null; alt: string }[] = [
  { src: null, alt: "A Development Agent checking wheat with a farmer" },
  { src: null, alt: "A farmer using Agri-Stack 360 on a phone in the field" },
  { src: null, alt: "Wheat field in Dawa Cheffa" },
];

/** Shown if the partner list can't be loaded; admins manage the real list (Admin → Website partners). */
const FALLBACK_PARTNERS: WebsitePartner[] = [
  "Agricultural Transformation Institute (ATI)",
  "World Bank",
  "UNDP",
  "Ethiopian Diaspora Trust Fund",
  "Ministry of Labor and Skills",
  "Innovative Finance Lab",
].map((name, i) => ({ id: -i - 1, name, logo_url: null }));

const PROBLEMS = [
  { value: "30–40%", text: "of crops lost to pests and diseases in the field", note: "research estimate" },
  { value: "11.8M tonnes", text: "lost after harvest each year, enough to feed 46 million people", note: "Ministry of Agriculture" },
  { value: "1 DA", text: "for every ~250–300 farming households", note: null },
];

const FEATURES: { icon: LucideIcon; title: string; text: string; soon?: boolean }[] = [
  { icon: Sprout, title: "AI disease detection", text: "Wheat leaf rust, yellow rust, powdery mildew and septoria." },
  {
    icon: MessageSquareText,
    title: "AI advisory assistant",
    text: "Answers only from Ministry of Agriculture guidelines, with the source cited. Read-aloud for farmers who don't read easily.",
  },
  { icon: BellRing, title: "Outbreak alerts", text: "Warns farmers when rust is reported within 10 km." },
  { icon: TrendingUp, title: "Market intelligence", text: "Crop price trends and forecasts." },
  { icon: ShieldCheck, title: "Input Trust", text: "Anti-counterfeit verification for agro-chemicals." },
  {
    icon: Users,
    title: "DA & Agribusiness tools",
    text: "Support for Development Agents and farmer-owned Agribusiness Companies.",
    soon: true,
  },
];

const RESULTS: { icon: LucideIcon; value: string; label: string; note?: string }[] = [
  { icon: Users, value: "1,000+", label: "farmers reached in field pilot" },
  { icon: ClipboardCheck, value: "30+", label: "Development Agents testing" },
  { icon: Brain, value: "97%", label: "disease detection accuracy", note: "research test data" },
  { icon: Languages, value: "4", label: "languages" },
];

const INCLUSION: { icon: LucideIcon; text: string }[] = [
  { icon: Users, text: "Free for farmers. Works through DAs for farmers without smartphones, with voice support." },
  { icon: CloudSunRain, text: "Early detection and weather-aware advice reduce crop loss and unnecessary chemical use." },
  { icon: ShieldCheck, text: "Genuine inputs protect farmers, soil and water." },
];

const AUDIENCES: { icon: LucideIcon; title: string; text: string; to: string }[] = [
  { icon: Sprout, title: "Farmers & Development Agents", text: "Free advice.", to: "/signin" },
  { icon: Truck, title: "Input suppliers", text: "Protect your products from counterfeits, reach farmers.", to: "/feedback?type=partner" },
  {
    icon: Building2,
    title: "Agribusiness Companies & commercial farms",
    text: "Manage members, inputs and disease monitoring.",
    to: "/feedback?type=partner",
  },
  { icon: Landmark, title: "Government & development partners", text: "Early-warning dashboards and DA tools.", to: "/feedback?type=partner" },
];

// ── Drawn pieces (no image downloads) ─────────────────────────────────────────

/** A wheat field under a wide sky, in three moods, standing in for a photo. */
function FieldArt({ variant }: { variant: number }) {
  const sky = ["from-sky-200 to-amber-50", "from-amber-100 to-brand-50", "from-sky-100 to-brand-25"][variant % 3];
  return (
    <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" className={cn("size-full bg-gradient-to-b", sky)} aria-hidden="true">
      <circle cx={variant === 1 ? 80 : 320} cy="70" r="30" fill="#fcd34d" opacity="0.9" />
      <path d="M0 170 C80 130 160 150 240 135 C300 125 350 140 400 130 V300 H0Z" fill="#6cc095" />
      <path d="M0 200 C90 175 190 190 270 175 C330 165 370 178 400 172 V300 H0Z" fill="#3ba571" />
      <path d="M0 235 C110 215 230 228 400 210 V300 H0Z" fill="#e3b341" />
      {Array.from({ length: 22 }, (_, i) => {
        const x = 8 + i * 18.5;
        const h = 46 + ((i * 37) % 22);
        return (
          <g key={i} stroke="#b7791f" strokeWidth="2" strokeLinecap="round">
            <path d={`M${x} 300 Q${x + 4} ${300 - h / 2} ${x + 2} ${300 - h}`} fill="none" />
            <ellipse cx={x + 2} cy={300 - h - 7} rx="3.5" ry="9" fill="#f6c453" stroke="none" />
          </g>
        );
      })}
    </svg>
  );
}

function PhotoPanel({ index, className }: { index: number; className?: string }) {
  const photo = PHOTOS[index];
  return (
    <div className={cn("overflow-hidden rounded-3xl bg-brand-50", className)}>
      {photo.src ? (
        <img src={photo.src} alt={photo.alt} loading={index === 0 ? "eager" : "lazy"} decoding="async" className="size-full object-cover" />
      ) : (
        <FieldArt variant={index} />
      )}
    </div>
  );
}

/** Phone frame around a drawn app screen. */
function PhoneFrame({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
  return (
    <div role="img" aria-label={label} className={cn("w-56 shrink-0 rounded-[2.2rem] border-[9px] border-gray-900 bg-gray-900 shadow-theme-lg", className)}>
      <div aria-hidden="true" className="relative flex h-[26rem] flex-col overflow-hidden rounded-[1.6rem] bg-white">
        <span className="absolute top-2 left-1/2 z-10 h-1.5 w-12 -translate-x-1/2 rounded-full bg-gray-900/80" />
        {children}
      </div>
    </div>
  );
}

function ScreenBar({ title }: { title: string }) {
  return <div className="bg-brand-700 px-4 pt-6 pb-2.5 text-sm font-semibold text-white">{title}</div>;
}

function RustLeaf({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 120" className={className} aria-hidden="true">
      <path d="M20 112 C70 70 150 40 226 14 C190 52 120 92 36 116 Z" fill="#3ba571" />
      <path d="M28 113 C90 84 160 50 222 18" stroke="#1f8a57" strokeWidth="2" fill="none" />
      {[[70, 88], [96, 76], [120, 66], [146, 56], [108, 84], [84, 96], [160, 46], [134, 72]].map(([cx, cy]) => (
        <ellipse key={`${cx}-${cy}`} cx={cx} cy={cy} rx="4" ry="2.4" fill="#d97706" transform={`rotate(-25 ${cx} ${cy})`} />
      ))}
    </svg>
  );
}

function HomeScreen() {
  return (
    <>
      <ScreenBar title="Agri-Stack 360" />
      <div className="space-y-2.5 p-3">
        <div className="grid grid-cols-3 gap-2">
          {[{ i: Camera, t: "Photo check" }, { i: MessageSquareText, t: "Ask" }, { i: ShieldCheck, t: "Verify" }].map(({ i: Icon, t }) => (
            <div key={t} className="flex flex-col items-center gap-1 rounded-xl bg-brand-25 py-2.5 text-[10px] font-semibold text-gray-700">
              <Icon className="size-5 text-brand-700" />
              {t}
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-2.5">
          <p className="flex items-center gap-1.5 text-[11px] font-bold text-amber-900">
            <BellRing className="size-3.5" /> Rust reported near your farm
          </p>
          <p className="mt-1 text-[10px] leading-snug text-gray-700">Check your wheat leaves this week.</p>
        </div>
        <div className="rounded-xl bg-gray-50 p-2.5">
          <p className="text-[11px] font-bold text-gray-800">Your crop calendar</p>
          <div className="mt-2 flex gap-1">
            {["bg-brand-500", "bg-brand-500", "bg-amber-400", "bg-gray-200", "bg-gray-200"].map((c, i) => (
              <span key={i} className={cn("h-1.5 flex-1 rounded-full", c)} />
            ))}
          </div>
          <p className="mt-1.5 text-[10px] text-gray-600">Next tasks for this stage</p>
        </div>
        <div className="rounded-xl bg-gray-50 p-2.5">
          <p className="text-[11px] font-bold text-gray-800">Market prices</p>
          <svg viewBox="0 0 160 40" className="mt-1 w-full">
            <path d="M0 32 L20 28 L40 30 L60 22 L80 24 L100 16 L120 18 L140 10 L160 12" fill="none" stroke="#1f8a57" strokeWidth="2.5" />
          </svg>
        </div>
      </div>
    </>
  );
}

function CaptureScreen() {
  return (
    <div className="flex h-full flex-col bg-gray-900">
      <p className="px-4 pt-7 pb-2 text-center text-xs font-medium text-white/90">Photograph the sick leaf</p>
      <div className="relative mx-3 flex-1 overflow-hidden rounded-2xl bg-gradient-to-b from-brand-900 to-brand-700">
        <RustLeaf className="absolute top-1/2 left-1/2 w-[130%] -translate-x-1/2 -translate-y-1/2 -rotate-12" />
        <span className="absolute inset-6 rounded-xl border-2 border-dashed border-white/60" />
      </div>
      <div className="flex items-center justify-center gap-8 py-5">
        <MessageSquareText className="size-6 text-white/70" />
        <span className="size-14 rounded-full border-4 border-white/40 bg-white" />
        <span className="text-[10px] font-semibold text-white/70">Voice</span>
      </div>
    </div>
  );
}

function ResultScreen() {
  return (
    <>
      <ScreenBar title="Crop health check" />
      <RustLeaf className="block w-full bg-gradient-to-b from-sky-100 to-brand-50" />
      <div className="space-y-2 p-3.5">
        <p className="text-[10px] font-semibold tracking-wide text-gray-500 uppercase">Likely problem</p>
        <p className="text-base font-bold text-gray-900">Wheat leaf rust</p>
        <div className="rounded-lg bg-brand-25 p-2 text-[11px] leading-snug text-gray-700">
          <strong className="text-brand-800">What to do:</strong> treatment plan from the national wheat guidelines, with the source cited.
        </div>
        <p className="flex items-center gap-1.5 text-[11px] text-gray-700">
          <BellRing className="size-3.5 text-amber-600" /> Follow-up in 7 days
        </p>
      </div>
    </>
  );
}

function AdviceScreen() {
  return (
    <>
      <ScreenBar title="AI advisor" />
      <div className="flex-1 space-y-2.5 bg-gray-50 p-3">
        <p className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-brand-700 p-2.5 text-[11px] text-white">
          My wheat leaves have orange spots. What should I do?
        </p>
        <div className="max-w-[90%] rounded-2xl rounded-bl-sm bg-white p-2.5 text-[11px] leading-snug text-gray-700 shadow-theme-xs">
          This looks like leaf rust. Follow the treatment plan from the national guidelines <strong className="text-brand-700">[S1]</strong>.
          <span className="mt-2 block rounded-md bg-brand-25 px-2 py-1 text-[10px] font-semibold text-brand-800">
            S1 · Ministry of Agriculture wheat guideline
          </span>
        </div>
        <div className="max-w-[90%] rounded-2xl rounded-bl-sm bg-white p-2.5 text-[11px] text-gray-700 shadow-theme-xs">
          <p className="flex items-center gap-1.5 font-semibold text-gray-800">
            <MapPin className="size-3.5 text-brand-600" /> Genuine input nearby
          </p>
          <p className="mt-1 flex items-center gap-1.5 font-semibold text-gray-800">
            <TrendingUp className="size-3.5 text-brand-600" /> Best time to sell
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 border-t border-gray-100 p-2.5">
        <span className="h-7 flex-1 rounded-full bg-gray-100" />
        <span className="size-7 rounded-full bg-brand-700" />
      </div>
    </>
  );
}

function VerifyScreen() {
  return (
    <>
      <ScreenBar title="Check a product" />
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-4 text-center">
        <span className="flex size-20 items-center justify-center rounded-full bg-brand-50">
          <CheckCircle2 className="size-12 text-brand-600" />
        </span>
        <p className="text-lg font-bold text-gray-900">Genuine product</p>
        <p className="text-[11px] text-gray-600">Code checked against the supplier's batch</p>
        <div className="mt-2 w-full rounded-xl bg-gray-50 p-2.5 text-left text-[11px] text-gray-700">
          <p className="flex items-center gap-1.5">
            <ShieldCheck className="size-3.5 text-brand-600" /> Registered product
          </p>
          <p className="mt-1 flex items-center gap-1.5">
            <BellRing className="size-3.5 text-amber-600" /> Follow-up after 7 days
          </p>
        </div>
      </div>
    </>
  );
}

const STEPS: { icon: LucideIcon; title: string; text: string; screen: ReactNode; label: string; cta: ReactNode }[] = [
  {
    icon: Camera,
    title: "Capture",
    text: "Photograph a sick leaf, or ask by text or voice.",
    screen: <CaptureScreen />,
    label: "Illustration: taking a photo of a sick wheat leaf",
    cta: <Link to="/signin" className={BUTTON.primary}>Try it in the app</Link>,
  },
  {
    icon: Brain,
    title: "Analyze",
    text: "AI trained on Ethiopian field data diagnoses the disease.",
    screen: <ResultScreen />,
    label: "Illustration: the diagnosis result, wheat leaf rust",
    cta: null,
  },
  {
    icon: ClipboardCheck,
    title: "Recommend",
    text: "Treatment from national guidelines, a genuine input nearby, the best time to sell.",
    screen: <AdviceScreen />,
    label: "Illustration: the AI advisor answering with a cited Ministry of Agriculture guideline",
    cta: null,
  },
  {
    icon: ShieldCheck,
    title: "Verify",
    text: "Scan the product to confirm it's genuine; follow-up after 7 days.",
    screen: <VerifyScreen />,
    label: "Illustration: a product code checked as genuine",
    cta: <Link to="/feedback" className={BUTTON.accent}>Give feedback</Link>,
  },
];

/** "We have worked with": logos where uploaded, names otherwise. */
function PartnerStrip() {
  const [partners, setPartners] = useState<WebsitePartner[] | null>(null);
  useEffect(() => {
    let live = true;
    fetchPartners().then(
      (list) => live && setPartners(list),
      () => live && setPartners(FALLBACK_PARTNERS),
    );
    return () => {
      live = false;
    };
  }, []);
  return (
    <ul className="mx-auto mt-6 flex min-h-16 max-w-5xl flex-wrap items-center justify-center gap-x-10 gap-y-5 px-4">
      {(partners ?? []).map((p) => (
        <li key={p.id} className="flex items-center">
          {p.logo_url ? (
            <img
              src={partnerLogoSrc(p.logo_url)}
              alt={p.name}
              title={p.name}
              loading="lazy"
              decoding="async"
              className="h-10 w-auto max-w-40 object-contain md:h-12"
            />
          ) : (
            <span className="text-base font-bold text-gray-500 md:text-lg">{p.name}</span>
          )}
        </li>
      ))}
    </ul>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

function Heading({ id, title }: { id: string; title: string }) {
  return (
    <h2 id={id} className="text-center text-3xl font-bold tracking-tight text-gray-900 md:text-4xl">
      {title}
    </h2>
  );
}

export default function Landing() {
  return (
    <PublicLayout path="/">
      <PageMeta
        title="Agri-Stack 360 | AI agricultural intelligence for Ethiopian farmers"
        description="Know what's wrong with your crop, what to do, where to buy a genuine input, and when to sell. In Amharic, Afaan Oromoo, Tigrinya and English."
      />

      {/* Hero: centred text over a photo collage with the app in front */}
      <section className="overflow-hidden pt-10 md:pt-16">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <p className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-4 py-1.5 text-sm font-semibold text-amber-900">
            <span aria-hidden="true">🏆</span> 2nd of 20 finalists, ATI AgTech Innovation Challenge 2026
          </p>
          <h1 className="mt-6 text-4xl leading-[1.1] font-bold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
            AI agricultural intelligence for <span className="text-brand-700">Ethiopian farmers</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-gray-600 md:text-xl">
            Know what's wrong with your crop, what to do, where to buy a genuine input, and when to sell. In Amharic,
            Afaan Oromoo, Tigrinya and English.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <a href="#how-it-works" className={BUTTON.primary}>See how it works</a>
            <Link to="/feedback" className={BUTTON.accent}>Give feedback</Link>
          </div>
          <a href="#contact" className="mt-5 inline-flex min-h-11 items-center gap-1.5 font-semibold text-brand-700 hover:underline">
            Are you an organisation? Partner with us <ArrowRight className="size-4" aria-hidden="true" />
          </a>
        </div>

        <div className="relative mx-auto mt-14 max-w-6xl px-4 md:mt-20">
          <div className="grid h-64 grid-cols-1 gap-4 sm:h-72 md:h-[22rem] md:grid-cols-[1.6fr_1fr]">
            <PhotoPanel index={0} />
            <PhotoPanel index={1} className="hidden md:block" />
          </div>
          <PhoneFrame
            label="Illustration of the Agri-Stack 360 app home screen"
            className="absolute -top-8 right-6 origin-top scale-[0.72] sm:right-12 sm:scale-[0.8] md:-top-14 md:right-auto md:left-[56%] md:-translate-x-1/2 md:scale-100"
          >
            <HomeScreen />
          </PhoneFrame>
          {/* room for the phone hanging below the collage */}
          <div className="h-10 md:h-28" aria-hidden="true" />
        </div>
      </section>

      {/* Intro + partners strip */}
      <section id="partners" aria-labelledby="partners-title" className="scroll-mt-16 pb-14 md:pb-20">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <p className="text-lg leading-relaxed text-gray-700 md:text-xl">
            Agri-Stack 360 helps farmers and Development Agents find what's wrong with a crop, what to do about it,
            where to buy a genuine input and when to sell, with advice that cites the Ministry of Agriculture
            guidelines.
          </p>
          <h2 id="partners-title" className="mt-12 text-sm font-semibold tracking-wide text-gray-500 uppercase">
            We have worked with
          </h2>
        </div>
        <PartnerStrip />
      </section>

      {/* The problem */}
      <section aria-labelledby="problem-title" className="bg-brand-25 py-14 md:py-20">
        <div className="mx-auto max-w-6xl px-4">
          <Heading id="problem-title" title="The problem" />
          <ul className="mt-10 grid gap-6 md:grid-cols-3">
            {PROBLEMS.map((p) => (
              <li key={p.value} className="rounded-3xl bg-white p-7 text-center shadow-theme-xs">
                <p className="text-4xl font-bold text-brand-700 md:text-5xl">{p.value}</p>
                <p className="mt-3 text-lg text-gray-800">{p.text}</p>
                {p.note && <p className="mt-2 text-sm text-gray-500">({p.note})</p>}
              </li>
            ))}
          </ul>
          <p className="mt-6 text-center text-sm text-gray-500">
            Sources: Ministry of Agriculture Postharvest Management Strategy; SOAS Working Paper 234.
          </p>
        </div>
      </section>

      {/* How it works: alternating text and app screens */}
      <section id="how-it-works" aria-labelledby="how-title" className="scroll-mt-16 py-14 md:py-24">
        <div className="mx-auto max-w-6xl px-4">
          <Heading id="how-title" title="How it works" />
          <ol className="mt-12 space-y-16 md:mt-16 md:space-y-24">
            {STEPS.map((s, i) => (
              <li key={s.title} className="grid items-center gap-8 md:grid-cols-2 md:gap-16">
                <div className={cn("flex justify-center", i % 2 === 1 && "md:order-2")}>
                  <PhoneFrame label={s.label}>{s.screen}</PhoneFrame>
                </div>
                <div className={cn("text-center md:text-left", i % 2 === 1 && "md:order-1")}>
                  <span className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-sm font-semibold text-brand-800">
                    <s.icon className="size-4" aria-hidden="true" /> Step {i + 1}
                  </span>
                  <h3 className="mt-4 text-3xl font-bold text-gray-900">{s.title}</h3>
                  <p className="mt-3 text-lg leading-relaxed text-gray-700">{s.text}</p>
                  {s.cta && <div className="mt-6">{s.cta}</div>}
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Features */}
      <section aria-labelledby="features-title" className="bg-gray-50 py-14 md:py-20">
        <div className="mx-auto max-w-6xl px-4">
          <Heading id="features-title" title="What it does" />
          <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <li key={f.title} className="rounded-3xl bg-white p-7 shadow-theme-xs">
                <div className="flex items-start justify-between gap-3">
                  <span className="flex size-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                    <f.icon className="size-6" aria-hidden="true" />
                  </span>
                  {f.soon && <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">Coming soon</span>}
                </div>
                <h3 className="mt-5 text-lg font-bold text-gray-900">{f.title}</h3>
                <p className="mt-1.5 text-gray-700">{f.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Results: numbers row */}
      <section id="results" aria-labelledby="results-title" className="scroll-mt-16 py-14 md:py-24">
        <div className="mx-auto max-w-6xl px-4">
          <Heading id="results-title" title="Agri-Stack 360 in numbers" />
          <dl className="mt-12 grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-4">
            {RESULTS.map((r) => (
              <div key={r.label} className="flex flex-col items-center text-center">
                <span className="flex size-20 items-center justify-center rounded-full bg-brand-50 text-brand-700" aria-hidden="true">
                  <r.icon className="size-9" />
                </span>
                <dt className="order-3 mt-1 text-base text-gray-600">
                  {r.label}
                  {r.note && <span className="block text-sm text-gray-500">({r.note})</span>}
                </dt>
                <dd className="order-2 mt-4 text-4xl font-bold text-gray-900 md:text-5xl">{r.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Recognition: split card */}
      <section aria-labelledby="recognition-title" className="pb-14 md:px-4 md:pb-24">
        <div className="mx-auto grid max-w-6xl overflow-hidden md:grid-cols-2 md:rounded-3xl">
          <div className="relative min-h-56 md:min-h-80">
            <PhotoPanel index={2} className="absolute inset-0 rounded-none" />
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="flex size-28 items-center justify-center rounded-full bg-white/90 shadow-theme-lg">
                <Trophy className="size-14 text-amber-500" aria-hidden="true" />
              </span>
            </span>
          </div>
          <div className="flex flex-col justify-center bg-brand-800 p-8 text-center md:p-12">
            <h2 id="recognition-title" className="text-sm font-semibold tracking-wide text-brand-200 uppercase">Recognition</h2>
            <p className="mt-4 text-3xl leading-snug font-bold text-white md:text-4xl">2nd of 20 finalists</p>
            <p className="mt-2 text-lg text-amber-300">from 372 applicants</p>
            <p className="mt-4 text-brand-100">Agricultural Transformation Institute (ATI) AgTech Innovation Challenge 2026</p>
          </div>
        </div>
      </section>

      {/* Inclusion & climate resilience */}
      <section aria-labelledby="inclusion-title" className="bg-brand-25 py-14 md:py-20">
        <div className="mx-auto max-w-6xl px-4">
          <Heading id="inclusion-title" title="Inclusion & climate resilience" />
          <ul className="mt-10 grid gap-8 md:grid-cols-3">
            {INCLUSION.map((x) => (
              <li key={x.text} className="flex flex-col items-center text-center">
                <span className="flex size-16 items-center justify-center rounded-full bg-white text-brand-700 shadow-theme-xs">
                  <x.icon className="size-8" aria-hidden="true" />
                </span>
                <p className="mt-4 max-w-xs text-lg text-gray-800">{x.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Who it's for: organisations card with list rows */}
      <section aria-labelledby="audience-title" className="py-14 md:py-24">
        <div className="mx-auto max-w-3xl px-4">
          <div className="rounded-3xl border border-gray-200 p-5 shadow-theme-md sm:p-8">
            <p className="text-sm font-semibold tracking-wide text-brand-700 uppercase">Who it's for</p>
            <h2 id="audience-title" className="mt-2 text-2xl font-bold text-gray-900 md:text-3xl">
              Built for farmers, and for everyone who works with them.
            </h2>
            <ul className="mt-6 divide-y divide-gray-100 rounded-2xl border border-gray-100">
              {AUDIENCES.map((a) => (
                <li key={a.title}>
                  <Link to={a.to} className="flex min-h-16 items-center gap-4 p-4 hover:bg-brand-25">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                      <a.icon className="size-6" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-bold text-gray-900">{a.title}</span>
                      <span className="block text-gray-600">{a.text}</span>
                    </span>
                    <ChevronRight className="size-5 shrink-0 text-gray-400" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-6 flex justify-center">
              <Link to="/feedback?type=partner" className={cn(BUTTON.primary, "w-full sm:w-auto sm:px-10")}>
                Partner with us
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" aria-labelledby="contact-title" className="scroll-mt-16 bg-brand-25 py-14 md:py-20">
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 md:grid-cols-2">
          <div className="text-center md:text-left">
            <h2 id="contact-title" className="text-3xl font-bold tracking-tight text-gray-900 md:text-4xl">Partner with us</h2>
            <p className="mt-3 text-lg text-gray-600">
              Tell us about your organisation and what you'd like to do together: a pilot, a partnership or an
              investment. It takes under a minute.
            </p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row md:justify-start">
              <Link to="/feedback?type=partner" className={BUTTON.primary}>Partner with us</Link>
              <Link to="/feedback" className={BUTTON.outline}>Give feedback</Link>
            </div>
          </div>
          <ul className="space-y-3 rounded-3xl bg-white p-6 text-lg shadow-theme-xs md:p-8">
            <li className="flex items-center gap-3">
              <Phone className="size-6 shrink-0 text-brand-700" aria-hidden="true" />
              <a href={PHONE_HREF} className="inline-flex min-h-11 items-center font-semibold text-brand-800 underline-offset-4 hover:underline">
                {PHONE}
              </a>
            </li>
            <li className="flex min-h-11 items-center gap-3">
              <MapPin className="size-6 shrink-0 text-brand-700" aria-hidden="true" />
              <span>Addis Ababa, Ethiopia</span>
            </li>
          </ul>
        </div>
      </section>
    </PublicLayout>
  );
}
