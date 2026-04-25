"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  unit?: string;
  bins: number[];
  binLabels: string[];
  mean?: number;
  meanIndex?: number; // 0-based index where mean should sit
  accent?: "gold" | "claret" | "ink";
  className?: string;
  totalLabel?: string;
};

export function DistributionChart({
  label,
  unit,
  bins,
  binLabels,
  mean,
  meanIndex,
  accent = "gold",
  className,
  totalLabel,
}: Props) {
  const max = Math.max(1, ...bins);
  const total = bins.reduce((a, b) => a + b, 0);
  const accentVar =
    accent === "gold" ? "var(--gold)" : accent === "claret" ? "var(--claret)" : "var(--ink)";

  return (
    <div className={cn("relative", className)}>
      <div className="flex items-baseline justify-between border-b border-ink/15 pb-2">
        <div>
          <div className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
            {label}
          </div>
          {mean !== undefined && (
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-display tabular text-3xl">{mean.toFixed(1)}</span>
              {unit && (
                <span className="font-mono text-[11px] text-muted-foreground">
                  {unit}
                </span>
              )}
            </div>
          )}
        </div>
        <div className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
          n = {total}
          {totalLabel ? ` ${totalLabel}` : ""}
        </div>
      </div>

      <div className="relative mt-4 grid grid-cols-[repeat(var(--cols),minmax(0,1fr))] items-end gap-1.5"
           style={{ ["--cols" as never]: bins.length }}>
        {bins.map((v, i) => {
          const pct = (v / max) * 100;
          const isMean = meanIndex === i;
          return (
            <div key={i} className="flex h-32 flex-col items-stretch justify-end">
              <div
                className="bar-rise relative w-full origin-bottom"
                style={{
                  height: `${Math.max(2, pct)}%`,
                  background: isMean ? accentVar : "color-mix(in oklch, var(--ink) 18%, transparent)",
                  animationDelay: `${i * 60}ms`,
                  borderTop: isMean ? `2px solid ${accentVar}` : undefined,
                }}
                title={`${binLabels[i]}: ${v}`}
              >
                <span
                  className="pointer-events-none absolute -top-4 right-0 left-0 text-center font-mono text-[10px] tabular text-muted-foreground"
                  style={{ opacity: v ? 1 : 0.3 }}
                >
                  {v}
                </span>
              </div>
            </div>
          );
        })}
        <div
          className="pointer-events-none absolute right-0 left-0 -bottom-px h-px"
          style={{ background: "var(--ink)" }}
        />
      </div>

      <div className="mt-2 grid grid-cols-[repeat(var(--cols),minmax(0,1fr))] gap-1.5"
           style={{ ["--cols" as never]: bins.length }}>
        {binLabels.map((l, i) => (
          <div
            key={i}
            className={cn(
              "text-center font-mono text-[10px] tabular",
              meanIndex === i ? "text-ink font-semibold" : "text-muted-foreground",
            )}
          >
            {l}
          </div>
        ))}
      </div>
    </div>
  );
}
