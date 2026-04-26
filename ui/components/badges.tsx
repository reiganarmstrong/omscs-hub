import * as React from "react";
import { cn } from "@/lib/utils";

export function Tag({
  children,
  variant = "default",
  className,
}: {
  children: React.ReactNode;
  variant?: "default" | "leaf" | "rose" | "outline";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
        variant === "default" && "bg-muted text-muted-foreground",
        variant === "leaf" && "bg-leaf/12 text-leaf",
        variant === "rose" && "bg-rose/12 text-rose",
        variant === "outline" && "border border-border text-muted-foreground",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Stat({
  label,
  value,
  unit,
  size = "md",
}: {
  label: string;
  value: React.ReactNode;
  unit?: string;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <div className="flex flex-col">
      <span className="label">{label}</span>
      <span
        className={cn(
          "font-display tabular text-foreground",
          size === "sm" && "text-xl",
          size === "md" && "text-2xl",
          size === "lg" && "text-4xl",
        )}
      >
        {value}
        {unit && (
          <span className="ml-1 text-xs font-normal text-muted-foreground">
            {unit}
          </span>
        )}
      </span>
    </div>
  );
}

export function Stars({ value, max = 5 }: { value: number; max?: number }) {
  const filled = Math.round(value);
  return (
    <span className="inline-flex items-center gap-0.5 text-leaf">
      {Array.from({ length: max }).map((_, i) => (
        <svg
          key={i}
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill={i < filled ? "currentColor" : "transparent"}
          stroke="currentColor"
          strokeWidth={1.4}
          aria-hidden
        >
          <path d="m12 3 2.92 6.05 6.58.96-4.76 4.6 1.13 6.55L12 18.1l-5.87 3.06 1.13-6.55-4.76-4.6 6.58-.96Z" />
        </svg>
      ))}
    </span>
  );
}
