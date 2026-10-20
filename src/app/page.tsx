import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Camera, ClipboardList, ShieldCheck, Users } from "lucide-react";

import { ChurchLogo } from "@/components/brand/church-logo";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Living Faith Church International — Laderin-Hilltop",
  description:
    "Membership registration and bio-data management for Living Faith Church International, Laderin-Hilltop, Ogun State, Nigeria.",
};

export default function HomePage() {
  return (
    <div className="flex min-h-full flex-col">
      <header className="app-header border-b border-border bg-ink text-ink-foreground">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <ChurchLogo withWordmark inverted priority />
          <Button asChild variant="outline" size="sm" className="border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white">
            <Link href="/login">Staff sign in</Link>
          </Button>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="bg-gradient-to-b from-muted/60 to-background">
          <div className="mx-auto max-w-5xl px-4 py-14 text-center sm:px-6 sm:py-20">
            <p className="text-sm font-bold uppercase tracking-widest text-primary">
              Winners Chapel International
            </p>
            <h1 className="mx-auto mt-3 max-w-3xl text-balance text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              Living Faith Church International
            </h1>
            <p className="mt-2 text-2xl font-semibold text-muted-foreground">
              Laderin-Hilltop, Ogun State
            </p>
            <p className="mx-auto mt-6 max-w-2xl text-balance text-lg text-muted-foreground">
              Register your membership bio-data and passport photograph, or
              manage the church membership register.
            </p>

            <div className="mt-9 flex flex-col justify-center gap-4 sm:flex-row">
              <Button asChild size="lg" className="w-full sm:w-auto">
                <Link href="/register">
                  Register as a member
                  <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
                <Link href="/login">Administrative sign in</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
          <h2 className="text-center text-2xl font-bold tracking-tight sm:text-3xl">
            Simple, private and built for every member
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-muted-foreground">
            The registration form works on any phone, needs no account, and
            takes only a few minutes to complete.
          </p>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: ClipboardList,
                title: "A short form",
                body: "Only the details the church actually needs, grouped clearly so you always know what to do next.",
              },
              {
                icon: Camera,
                title: "Photo capture",
                body: "Take your passport photograph with your phone camera, or choose one you already have.",
              },
              {
                icon: ShieldCheck,
                title: "Your privacy",
                body: "Your details are stored securely and are only visible to authorised church administrators.",
              },
              {
                icon: Users,
                title: "Service units",
                body: "Tell us the departments you serve in, and how long you have been a member.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-xl border bg-card p-6 shadow-sm"
              >
                <div className="flex size-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <item.icon className="size-6" aria-hidden="true" />
                </div>
                <h3 className="mt-4 text-lg font-bold">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-ink py-8 text-ink-foreground">
        <div className="mx-auto max-w-5xl px-4 text-center sm:px-6">
          <ChurchLogo withWordmark inverted className="mx-auto" />
          <p className="mt-3 text-sm text-white/70">
            Living Faith Church International — Laderin-Hilltop · Ogun State,
            Nigeria
          </p>
          <p className="mt-2 text-sm">
            <Link
              href="/privacy-policy"
              className="text-white/80 underline underline-offset-2 hover:text-white"
            >
              Privacy policy
            </Link>
          </p>
        </div>
      </footer>
    </div>
  );
}
