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
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1400px] items-center gap-8 px-6 py-3">
        <Link href="/" className="flex items-baseline gap-1.5">
          <span className="font-display text-xl tracking-tight">
            OMSCS<span className="text-rose md:text-2xl">·</span>Hub
          </span>
        </Link>
        <nav className="flex flex-1 items-center gap-1">
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
                  "rounded-md px-3 py-1.5 text-sm transition",
                  active
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:bg-foreground hover:text-background",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <button
          type="button"
          aria-label="Toggle theme"
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          className="grid size-8 place-items-center rounded-md text-muted-foreground transition hover:bg-foreground hover:text-background"
        >
          {mounted && resolvedTheme === "dark" ? <SunIcon size={15} /> : <MoonIcon size={15} />}
        </button>
      </div>
    </header>
  );
}
