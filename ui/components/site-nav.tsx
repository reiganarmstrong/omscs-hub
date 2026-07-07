"use client";

import * as React from "react";
import { useAuth, UserButton } from "@clerk/react";
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
  const { isSignedIn } = useAuth();
  const mounted = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-md">
      <div className="mx-auto max-w-[1400px] px-4 py-3 md:flex md:items-center md:gap-8 md:px-6">
        <div className="flex items-center gap-3 md:flex-1">
          <Link href="/" className="flex flex-1 items-baseline gap-1.5 md:flex-none">
            <span className="font-display text-xl tracking-tight">
              OMSCS<span className="text-rose md:text-2xl">·</span>Hub
            </span>
          </Link>
          <nav aria-label="Primary navigation" className="hidden flex-1 items-center gap-1 md:flex">
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
                    "whitespace-nowrap rounded-md px-3 py-1.5 text-sm transition",
                    active
                      ? "bg-black text-white dark:bg-white dark:text-black"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground dark:hover:bg-leaf dark:hover:text-leaf-fg",
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
            className="grid size-8 shrink-0 place-items-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground dark:hover:bg-leaf dark:hover:text-leaf-fg"
          >
            {mounted && resolvedTheme === "dark" ? <SunIcon size={15} /> : <MoonIcon size={15} />}
          </button>
          {!isSignedIn && (
            <Link
              href="/sign-in"
              className="shrink-0 rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-leaf/60 hover:text-leaf"
            >
              Sign in
            </Link>
          )}
          {isSignedIn && (
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "size-8",
                },
              }}
            />
          )}
        </div>
        <nav
          aria-label="Primary navigation tabs"
          className="-mx-4 mt-3 flex gap-1 overflow-x-auto px-4 md:hidden"
        >
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
                  "whitespace-nowrap rounded-md px-3 py-1.5 text-sm transition",
                  active
                    ? "bg-black text-white dark:bg-white dark:text-black"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground dark:hover:bg-leaf dark:hover:text-leaf-fg",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
