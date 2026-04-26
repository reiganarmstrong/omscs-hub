"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  unit?: string;
  bins: number[];
  binLabels: string[];
  mean?: number;
  meanIndex?: number;
  accent?: "leaf" | "rose" | "ink";
  className?: string;
};

export function DistributionChart({
  label,
  unit,
  bins,
  binLabels,
  mean,
  meanIndex,
  accent = "leaf",
  className,
}: Props) {
  const max = Math.max(1, ...bins);
  const total = bins.reduce((a, b) => a + b, 0);
  const accentVar =
    accent === "leaf"
      ? "var(--leaf)"
      : accent === "rose"
        ? "var(--rose)"
        : "var(--ink)";

  return (
    <div className={cn("relative", className)}>
      <div className="flex items-baseline justify-between">
        <div>
          <div className="label">{label}</div>
          {mean !== undefined && (
            <div className="mt-0.5 flex items-baseline gap-2">
              <span className="font-display tabular text-3xl text-foreground">
                {mean.toFixed(1)}
              </span>
              {unit && (
                <span className="text-xs text-muted-foreground">{unit}</span>
              )}
            </div>
          )}
        </div>
        <div className="text-xs text-muted-foreground">n = {total}</div>
      </div>

      <div
        className="relative mt-4 grid items-end gap-1.5"
        style={{
          gridTemplateColumns: `repeat(${bins.length}, minmax(0, 1fr))`,
        }}
      >
        {bins.map((v, i) => {
          const pct = (v / max) * 100;
          const isMean = meanIndex === i;
          return (
            <div key={i} className="flex h-32 flex-col items-stretch justify-end">
              <div
                className="bar-rise relative w-full origin-bottom rounded-t-md"
                style={{
                  height: `${Math.max(2, pct)}%`,
                  background: isMean
                    ? accentVar
                    : `color-mix(in oklch, ${accentVar} 22%, transparent)`,
                  animationDelay: `${i * 60}ms`,
                }}
                title={`${binLabels[i]}: ${v}`}
              >
                <span
                  className="pointer-events-none absolute -top-5 right-0 left-0 text-center text-[11px] tabular text-muted-foreground"
                  style={{ opacity: v ? 1 : 0.4 }}
                >
                  {v}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div
        className="mt-2 grid gap-1.5 border-t border-border pt-2"
        style={{
          gridTemplateColumns: `repeat(${bins.length}, minmax(0, 1fr))`,
        }}
      >
        {binLabels.map((l, i) => (
          <div
            key={i}
            className={cn(
              "text-center text-[11px] tabular",
              meanIndex === i ? "text-foreground font-medium" : "text-muted-foreground",
            )}
          >
            {l}
          </div>
        ))}
      </div>
    </div>
  );
}
