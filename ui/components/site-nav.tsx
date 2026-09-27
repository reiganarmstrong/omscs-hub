"use client"

import * as React from "react"
import { UserButton } from "@clerk/react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTheme } from "next-themes"
import { useGatechSession } from "@/components/auth/gatech-session"
import { usePlanner } from "@/lib/store/planner-store"
import { cn } from "@/lib/utils"
import { MoonIcon, SunIcon } from "@/components/icons"

const NAV = [
  { href: "/", label: "Catalog" },
  { href: "/specializations", label: "Specializations" },
  { href: "/planner", label: "Planner" },
  { href: "/about", label: "About" },
]

export function SiteNav() {
  const pathname = usePathname()
  const { resolvedTheme, setTheme } = useTheme()
  const { isSignedIn, deletionPending } = useGatechSession()
  const { syncStatus } = usePlanner()
  const mounted = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-md">
      <div className="mx-auto max-w-[1400px] px-4 py-3 md:flex md:items-center md:gap-8 md:px-6">
        <div className="flex items-center gap-3 md:flex-1">
          <Link
            href="/"
            className="flex flex-1 items-baseline gap-1.5 md:flex-none"
          >
            <span className="font-display text-xl tracking-tight">
              OMSCS<span className="text-rose md:text-2xl">·</span>Hub
            </span>
          </Link>
          <nav
            aria-label="Primary navigation"
            className="hidden flex-1 items-center gap-1 md:flex"
          >
            {NAV.map((item) => {
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-sm whitespace-nowrap transition",
                    active
                      ? "bg-black text-white dark:bg-white dark:text-black"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground dark:hover:bg-leaf dark:hover:text-leaf-fg"
                  )}
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>
          <button
            type="button"
            aria-label="Toggle theme"
            onClick={() =>
              setTheme(resolvedTheme === "dark" ? "light" : "dark")
            }
            className="grid size-8 shrink-0 place-items-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground dark:hover:bg-leaf dark:hover:text-leaf-fg"
          >
            {mounted && resolvedTheme === "dark" ? (
              <SunIcon size={15} />
            ) : (
              <MoonIcon size={15} />
            )}
          </button>
          {!isSignedIn && !deletionPending && (
            <Link
              href="/sign-in"
              className="shrink-0 rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-leaf/60 hover:text-leaf"
            >
              Sign in
            </Link>
          )}
          {isSignedIn && (
            <>
              <Link href="/account" className="shrink-0 rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground">Account</Link>
              <UserButton appearance={{ elements: { avatarBox: "size-8" } }} />
            </>
          )}
          {deletionPending && <Link href="/account" className="shrink-0 rounded-md border border-border px-3 py-1.5 text-sm text-rose">Finish account deletion</Link>}
        </div>
        <nav
          aria-label="Primary navigation tabs"
          className="-mx-4 mt-3 flex gap-1 overflow-x-auto px-4 md:hidden"
        >
          {NAV.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm whitespace-nowrap transition",
                  active
                    ? "bg-black text-white dark:bg-white dark:text-black"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground dark:hover:bg-leaf dark:hover:text-leaf-fg"
                )}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>
      </div>
      <div className="mx-auto max-w-[1400px] px-4 md:px-6">
        {isSignedIn && syncStatus === "reconcile" && (
          <p className="border-t border-border py-2 text-sm">
            Your local and account Study Plans need a choice.{" "}
            <Link
              href="/planner"
              className="font-medium underline underline-offset-2"
            >
              Review plans
            </Link>
          </p>
        )}
        {isSignedIn && syncStatus === "sync-error" && (
          <p className="border-t border-border py-2 text-sm">
            Study Plan sync needs attention.{" "}
            <Link
              href="/planner"
              className="font-medium underline underline-offset-2"
            >
              Open planner
            </Link>
          </p>
        )}
      </div>
    </header>
  )
}
