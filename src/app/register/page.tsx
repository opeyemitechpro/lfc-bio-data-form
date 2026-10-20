import type { Metadata } from "next";
import Link from "next/link";

import { ChurchLogo } from "@/components/brand/church-logo";
import { RegistrationForm } from "@/components/register/registration-form";
import { getPublicCustomFields } from "@/lib/members/custom-fields";
import { listServiceUnits, listTitles } from "@/lib/lookups";
import { getFormSettings, getPrivacyNotice } from "@/lib/settings";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Membership Bio-Data Registration",
  description:
    "Register your membership bio-data and passport photograph with Living Faith Church International, Laderin-Hilltop, Ogun State.",
};


export default async function RegisterPage() {
  const [titles, serviceUnits, customFields, privacyNotice, formSettings] =
    await Promise.all([
      listTitles(),
      listServiceUnits(),
      getPublicCustomFields(),
      getPrivacyNotice(),
      getFormSettings(),
    ]);

  return (
    <div className="min-h-full bg-muted/40">
      {/* Header */}
      <header className="app-header border-b border-border bg-ink text-ink-foreground">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <ChurchLogo withWordmark inverted priority />
          <Link
            href="/login"
            className="rounded-lg border border-white/25 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/30"
          >
            Staff sign in
          </Link>
        </div>
      </header>

      {/* Title block */}
      <div className="mx-auto max-w-4xl px-4 pb-8 pt-8 sm:px-6 sm:pt-12">
        <div className="mb-8 text-center">
          <p className="text-sm font-bold uppercase tracking-widest text-primary">
            Membership Bio-Data Registration
          </p>
          <h1 className="mt-2 text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Welcome to Living Faith Church International
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-balance text-base text-muted-foreground sm:text-lg">
            Laderin-Hilltop, Ogun State · Winners Chapel International
          </p>
          <p className="mx-auto mt-4 max-w-2xl text-balance text-base text-muted-foreground">
            Please complete the form below to register your membership
            bio-data and passport photograph. Fields marked with an asterisk
            are required. Take your time — your information is saved only
            when you press the submit button.
          </p>
        </div>

        <RegistrationForm
          titles={titles}
          serviceUnits={serviceUnits}
          customFields={customFields}
          privacyNotice={{
            version: privacyNotice.version,
            organisation: privacyNotice.organisation,
            contactEmail: privacyNotice.contactEmail,
            contactPhone: privacyNotice.contactPhone,
            retentionYears: privacyNotice.retentionYears,
            thirdParties: privacyNotice.thirdParties,
          }}
          formSettings={{
            requireAddress: formSettings.requireAddress,
            maxUploadBytes: formSettings.maxUploadBytes,
            acceptsChildren: formSettings.acceptsChildren,
            requireGuardianConsent: formSettings.requireGuardianConsent,
            allowAdditionalPhones: formSettings.allowAdditionalPhones,
            allowSuggestions: formSettings.allowSuggestions,
          }}
        />

        <div className="mt-10 text-center text-sm text-muted-foreground">
          <p>
            Please read our{" "}
            <Link
              href="/privacy-policy"
              className="font-semibold text-primary underline underline-offset-2"
            >
              full privacy policy
            </Link>
            .
          </p>
          <p className="mt-2">
            Need help? Please contact the church office.
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-auto border-t border-border bg-ink py-6 text-ink-foreground">
        <div className="mx-auto max-w-4xl px-4 text-center text-sm sm:px-6">
          <p className="font-semibold">
            Living Faith Church International — Laderin-Hilltop
          </p>
          <p className="mt-1 text-white/70">
            Winners Chapel International · Ogun State, Nigeria
          </p>
        </div>
      </footer>
    </div>
  );
}
