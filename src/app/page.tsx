import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { ChurchLogo } from "@/components/brand/church-logo";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Living Faith Church International — Laderin-Hilltop",
  description:
    "Membership registration and bio-data management for Living Faith Church International, Laderin-Hilltop, Ogun State, Nigeria.",
};

export default function HomePage() {
  return (
    <div className="flex min-h-svh flex-col bg-gradient-to-b from-muted/60 to-background">
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center px-5 py-8 text-center sm:px-8">
        <ChurchLogo priority className="size-20 sm:size-24" />
        <h1 className="mt-5 text-balance text-2xl font-bold text-foreground sm:text-3xl">
          Living Faith Church International
        </h1>
        <p className="mt-2 text-lg font-semibold text-muted-foreground">
          Laderin-Hilltop, Ogun State
        </p>
        <h2 className="mt-6 text-xl font-semibold">Membership registration</h2>
        <p className="mt-3 text-muted-foreground">Please click the button to register</p>
        <Button asChild size="lg" className="mt-6 w-full sm:w-auto">
          <Link href="/register">
            Register <ArrowRight aria-hidden="true" />
          </Link>
        </Button>
        <p className="mt-5 max-w-sm text-sm text-muted-foreground">
          For internal office use within LFC Laderin church only. This form is not for general public use.
        </p>
      </main>
      <footer className="px-5 pb-5 text-center text-sm text-muted-foreground">
        <Link href="/privacy-policy" className="underline underline-offset-2 hover:text-foreground">
          Privacy policy
        </Link>
      </footer>
    </div>
  );
}
