"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LayoutGrid, Table2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Switches between the table and card views of the member directory. */
export function ViewToggle() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get("view") ?? "table";

  const setView = (view: "table" | "cards") => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", view);
    params.delete("page");
    router.push(`?${params.toString()}`);
  };

  return (
    <div
      className="inline-flex rounded-lg border bg-card p-1"
      role="group"
      aria-label="Directory view"
    >
      <Button
        type="button"
        variant={current === "table" ? "secondary" : "ghost"}
        size="sm"
        aria-pressed={current === "table"}
        onClick={() => setView("table")}
        className={cn(current === "table" && "bg-secondary text-secondary-foreground")}
      >
        <Table2 aria-hidden="true" />
        Table
      </Button>
      <Button
        type="button"
        variant={current === "cards" ? "secondary" : "ghost"}
        size="sm"
        aria-pressed={current === "cards"}
        onClick={() => setView("cards")}
        className={cn(current === "cards" && "bg-secondary text-secondary-foreground")}
      >
        <LayoutGrid aria-hidden="true" />
        Cards
      </Button>
    </div>
  );
}
