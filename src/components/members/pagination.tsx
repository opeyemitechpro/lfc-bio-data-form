"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";

interface PaginationProps {
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
}

/** Server-driven pagination controls. */
export function Pagination({ page, pageCount, total, pageSize }: PaginationProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const goTo = (nextPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (nextPage <= 1) params.delete("page");
    else params.set("page", String(nextPage));
    router.push(`?${params.toString()}`);
  };

  if (total === 0) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-col items-center justify-between gap-3 rounded-xl border bg-card p-4 shadow-sm sm:flex-row">
      <p className="text-sm text-muted-foreground">
        Showing <span className="font-semibold text-foreground">{from}</span> to{" "}
        <span className="font-semibold text-foreground">{to}</span> of{" "}
        <span className="font-semibold text-foreground">{total}</span>{" "}
        {total === 1 ? "member" : "members"}
      </p>

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => goTo(page - 1)}
        >
          <ChevronLeft aria-hidden="true" />
          Previous
        </Button>
        <span className="px-2 text-sm font-semibold tabular-nums">
          Page {page} of {pageCount}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page >= pageCount}
          onClick={() => goTo(page + 1)}
        >
          Next
          <ChevronRight aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
