"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { MoonIcon, SunIcon } from "@/components/icons";

const NAV = [
  { href: "/", label: "Catalog" },
  { href: "/specializations", label: "Specializations" },
  { href: "/planner", label: "Planner" },
  { href: "/about", label: "About" },
];

export function SiteNav() {
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  return (
    <header className="sticky top-0 z-40 border-b border-ink/15 bg-paper/85 backdrop-blur-sm">
      <div className="mx-auto flex max-w-[1400px] items-stretch gap-8 px-6 py-3">
        <Link href="/" className="group flex items-baseline gap-2 leading-none">
          <span className="font-display text-2xl tracking-tight">
            OMSCS<span className="text-claret">·</span>Hub
          </span>
        </Link>
        <nav className="flex flex-1 items-end gap-6">
          {NAV.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group relative -mb-3 pb-3 text-sm transition",
                  active ? "text-ink" : "text-muted-foreground hover:text-ink",
                )}
              >
                <span className="font-medium">{item.label}</span>
                <span
                  className={cn(
                    "absolute right-0 -bottom-px left-0 h-[2px] origin-left scale-x-0 bg-ink transition-transform",
                    active && "scale-x-100",
                  )}
                />
              </Link>
            );
          })}
        </nav>
        <button
          type="button"
          aria-label="Toggle theme"
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          className="grid size-9 place-items-center rounded-full border border-ink/20 hover:bg-ink hover:text-paper transition"
        >
          {mounted && resolvedTheme === "dark" ? <SunIcon /> : <MoonIcon />}
        </button>
      </div>
    </header>
  );
}
