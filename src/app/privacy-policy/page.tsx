import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { ChurchLogo } from "@/components/brand/church-logo";
import { getPrivacyNotice } from "@/lib/settings";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Living Faith Church International — Laderin-Hilltop collects, uses, stores and protects member personal information and photographs.",
};


export default async function PrivacyPolicyPage() {
  const notice = await getPrivacyNotice();

  return (
    <div className="min-h-full bg-muted/40">
      <header className="app-header border-b border-border bg-ink text-ink-foreground">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <ChurchLogo withWordmark inverted priority />
          <Link
            href="/register"
            className="rounded-lg border border-white/25 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/30"
          >
            Register
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <Link
          href="/register"
          className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to the registration form
        </Link>

        <article className="rounded-xl border bg-card p-6 shadow-sm sm:p-8">
          <h1 className="text-3xl font-bold tracking-tight">Privacy policy</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Notice version {notice.version} · Last updated {notice.updatedAt}
          </p>

          <div className="mt-6 space-y-6 text-base leading-relaxed text-muted-foreground [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-foreground [&_li]:ml-5 [&_li]:list-disc [&_li]:pl-1 [&_p]:mt-2 [&_ul]:mt-2 [&_ul]:space-y-1">
            <section>
              <h2>1. Who collects your information</h2>
              <p>
                {notice.organisation} (&ldquo;the church&rdquo;, &ldquo;we&rdquo;)
                is the organisation that collects and controls your membership
                information. Winners Chapel International is the parent
                fellowship of the church.
              </p>
            </section>

            <section>
              <h2>2. Why we collect it</h2>
              <p>
                We collect member bio-data so that the church can keep an
                accurate membership register, issue membership cards, organise
                service units and communicate with members about church
                activities, meetings and announcements.
              </p>
            </section>

            <section>
              <h2>3. What we collect</h2>
              <ul>
                <li>Your title, full name, gender and age category</li>
                <li>Your day and month of birth (we deliberately do not record your year of birth)</li>
                <li>Your primary phone number, WhatsApp number and any additional phone numbers</li>
                <li>Your email address, if you provide one</li>
                <li>Your residential address</li>
                <li>How long you have been a member and the service units you belong to</li>
                <li>Your passport photograph</li>
                <li>Any suggestions or observations you choose to share</li>
                <li>The date and time at which you gave consent, and the version of this notice you accepted</li>
                <li>For child registrations, the name, relationship and phone number of the parent or guardian</li>
              </ul>
            </section>

            <section>
              <h2>4. How we use and share it</h2>
              <p>
                Your information is used only for the church membership purposes
                described above. It is visible to authorised church
                administrators who need it to serve members. We do not sell
                your information, and we do not share it for marketing by third
                parties. Where we are legally required to disclose information,
                we will do so only as permitted by law.
              </p>
            </section>

            <section>
              <h2>5. Photographs</h2>
              <p>
                Your passport photograph is stored as a personal record. It is
                used for the membership register and the printing of membership
                cards. Photographs are not published publicly by this
                application. Only administrators with the appropriate
                permission can view them.
              </p>
            </section>

            <section>
              <h2>6. Service providers</h2>
              <p>
                We use the following service providers to operate this
                application, and they process information only on our
                instructions:
              </p>
              <ul>
                {notice.thirdParties.map((party) => (
                  <li key={party}>{party}</li>
                ))}
              </ul>
            </section>

            <section>
              <h2>7. How long we keep it</h2>
              <p>
                Membership records are retained for approximately{" "}
                {notice.retentionYears} years while the person remains a
                member, and for a limited period afterwards to meet the
                church&apos;s record-keeping and legal obligations. When a
                record is deleted, it is retained in a recoverable state for a
                short administrative period before permanent removal.
              </p>
            </section>

            <section>
              <h2>8. Your rights</h2>
              <p>
                You may ask the church to confirm what information we hold
                about you, to correct anything that is inaccurate, or to
                request deletion of your information where the law allows it.
                Please contact us using the details below. We may need to
                verify your identity before acting on a request.
              </p>
            </section>

            <section>
              <h2>9. Children</h2>
              <p>
                Where a registration is made for a child, we ask for the
                consent of a parent or legal guardian and record that consent
                with the date and time it was given. We collect only what is
                needed for the child&apos;s membership record.
              </p>
            </section>

            <section>
              <h2>10. Contacting us</h2>
              <p>
                If you have any question or concern about this policy or the
                way we handle your information, please contact the church
                office at{" "}
                <a
                  href={`mailto:${notice.contactEmail}`}
                  className="font-semibold text-primary underline underline-offset-2"
                >
                  {notice.contactEmail}
                </a>
                {notice.contactPhone ? ` or ${notice.contactPhone}` : ""}.
              </p>
            </section>

            <section>
              <h2>11. Legal note</h2>
              <p>
                This notice is written to support the church&apos;s
                obligations under the Nigeria Data Protection Act 2023 and any
                other applicable law. It is not a substitute for independent
                legal advice, and the church may update this notice from time
                to time. The version number and date at the top of this page
                identify the notice that applied when you registered.
              </p>
            </section>
          </div>
        </article>
      </main>
    </div>
  );
}
