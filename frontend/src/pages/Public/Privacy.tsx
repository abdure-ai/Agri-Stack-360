import PageMeta from "@/components/common/PageMeta";
import type { ReactNode } from "react";
import PublicLayout from "./PublicLayout";
import { PHONE, PHONE_HREF } from "./site";

function Part({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-xl font-bold text-gray-900">{title}</h2>
      <div className="mt-2 space-y-2 text-gray-700">{children}</div>
    </section>
  );
}

/** Privacy note for the public website and the feedback form (the app has its own consent screens). */
export default function Privacy() {
  return (
    <PublicLayout path="/privacy">
      <PageMeta title="Privacy | Agri-Stack 360" description="What Agri-Stack 360 collects on this website, why, and how to have it deleted." />
      <article className="mx-auto max-w-2xl px-4 py-8 text-lg leading-relaxed md:py-12">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 md:text-4xl">Privacy note</h1>
        <p className="mt-3 text-gray-700">
          This note covers this website and its feedback form. We follow the principles of Ethiopia's Personal Data
          Protection Proclamation No. 1321/2024: we ask for your consent, collect as little as we can, and delete your
          data when you ask.
        </p>

        <Part title="What we collect">
          <p>
            When you send the feedback form: your name, organisation, the kind of visitor you are, your email address
            and/or phone number, your rating, your answers and comments, and whether we may contact you. We also keep
            the date, where you came from (for example the exhibition QR code) and your browser type.
          </p>
          <p>
            When you open a page: only a count of visits per page and per source. No cookies, no tracking across
            websites, and we do not store your IP address.
          </p>
        </Part>

        <Part title="Why">
          <p>To answer you, to follow up on partnerships, pilots and other interests you tell us about, and to improve Agri-Stack 360.</p>
        </Part>

        <Part title="Who sees it">
          <p>
            Only the Agri-Stack 360 team. We never sell your data, and we never send it to artificial intelligence
            (AI) services.
          </p>
        </Part>

        <Part title="How long we keep it">
          <p>Up to two years after our last contact with you. Then we delete it.</p>
        </Part>

        <Part title="Your rights">
          <p>
            You can ask to see, correct or delete your information at any time. Call or message us on{" "}
            <a href={PHONE_HREF} className="font-semibold text-brand-800 underline">{PHONE}</a> and we will do it.
          </p>
        </Part>

        <p className="mt-10 text-base text-gray-500">Agri-Stack 360, Addis Ababa, Ethiopia</p>
      </article>
    </PublicLayout>
  );
}
