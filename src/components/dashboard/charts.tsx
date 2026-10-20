import * as React from "react";

import { cn } from "@/lib/utils";

export interface BarDatum {
  label: string;
  value: number;
  /** Optional secondary colour for a specific bar. */
  color?: string;
}

/** Accepts either `{ label, value }` or the stats shape `{ key, label, count }`. */
export type BarDatumInput =
  | BarDatum
  | { key: string; label: string; count: number; color?: string };

function toBarData(data: BarDatumInput[]): BarDatum[] {
  return data.map((item) => {
    if ("value" in item) {
      return { label: item.label, value: item.value, color: item.color };
    }
    return { label: item.label, value: item.count, color: item.color };
  });
}

interface BarChartProps {
  data: BarDatumInput[];
  className?: string;
  /** Accessible description of what the chart shows. */
  description: string;
}

/**
 * A simple, accessible horizontal bar chart. Values are exposed as text so
 * screen readers get the same information as sighted users.
 */
export function BarChart({ data, className, description }: BarChartProps) {
  const bars = toBarData(data);
  const max = Math.max(1, ...bars.map((item) => item.value));

  return (
    <div className={cn("space-y-3", className)} role="img" aria-label={description}>
      {bars.map((item) => (
        <div key={item.label} className="space-y-1">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-sm font-medium text-foreground">{item.label}</span>
            <span className="text-sm font-bold tabular-nums text-foreground">
              {item.value}
            </span>
          </div>
          <div
            className="h-3 w-full overflow-hidden rounded-full bg-muted"
            role="presentation"
          >
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{
                width: `${Math.round((item.value / max) * 100)}%`,
                backgroundColor: item.color,
              }}
            />
          </div>
        </div>
      ))}
      {bars.every((item) => item.value === 0) ? (
        <p className="text-sm text-muted-foreground">No data yet.</p>
      ) : null}
    </div>
  );
}

interface TrendChartProps {
  data: { month: string; count: number }[];
  className?: string;
}

/** A compact column chart for the registration trend. */
export function TrendChart({ data, className }: TrendChartProps) {
  const max = Math.max(1, ...data.map((item) => item.count));

  return (
    <div className={className}>
      <div
        className="flex items-end gap-2"
        role="img"
        aria-label={`Monthly registrations: ${data
          .map((item) => `${item.month}: ${item.count}`)
          .join(", ")}`}
      >
        {data.map((item) => (
          <div key={item.month} className="flex flex-1 flex-col items-center gap-1.5">
            <span className="text-xs font-bold tabular-nums text-foreground">
              {item.count}
            </span>
            <div
              className="w-full rounded-t bg-primary/85"
              style={{ height: `${Math.max(6, (item.count / max) * 110)}px` }}
              role="presentation"
            />
            <span className="text-[0.7rem] font-medium text-muted-foreground">
              {item.month}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** A donut-style proportion indicator built with conic gradients. */
export function ProportionRing({
  value,
  total,
  label,
  className,
}: {
  value: number;
  total: number;
  label: string;
  className?: string;
}) {
  const percentage = total > 0 ? Math.round((value / total) * 100) : 0;

  return (
    <div className={cn("flex items-center gap-4", className)}>
      <div
        className="relative flex size-24 shrink-0 items-center justify-center rounded-full"
        style={{
          background: `conic-gradient(var(--color-primary) 0% ${percentage}%, var(--color-muted) ${percentage}% 100%)`,
        }}
        role="img"
        aria-label={`${label}: ${value} of ${total} (${percentage} percent)`}
      >
        <div className="flex size-16 items-center justify-center rounded-full bg-card">
          <span className="text-lg font-bold tabular-nums">{percentage}%</span>
        </div>
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground">{label}</p>
        <p className="text-sm text-muted-foreground">
          {value} of {total} members
        </p>
      </div>
    </div>
  );
}
