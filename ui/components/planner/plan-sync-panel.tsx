"use client"

import * as React from "react"
import { SPECIALIZATIONS } from "@/lib/data/specializations"
import { usePlanner, usePlanDifferences } from "@/lib/store/planner-store"
import { placements } from "@/lib/store/plan-merge"
import { Button } from "@/components/ui/button"

function specializationName(id: string | null) {
  return SPECIALIZATIONS.find((spec) => spec.id === id)?.name ?? "None"
}

export function PlanSyncPanel() {
  const {
    syncStatus,
    syncError,
    localDraft,
    accountDraft,
    recovering,
    resolve,
    retry,
  } = usePlanner()
  const differences = usePlanDifferences()
  const [choices, setChoices] = React.useState<
    Record<string, "local" | "account">
  >({})
  const [specChoice, setSpecChoice] = React.useState<
    "local" | "account" | null
  >(null)
  if (syncStatus === "guest") return null
  if (syncStatus === "loading")
    return (
      <p
        role="status"
        className="col-span-full rounded-lg border border-border bg-card p-4 text-sm"
      >
        Loading your account Study Plan…
      </p>
    )
  if (syncStatus === "saving")
    return (
      <p
        role="status"
        className="col-span-full rounded-lg border border-border bg-card p-4 text-sm"
      >
        Saving Study Plan to your account…
      </p>
    )
  if (syncStatus === "sync-error")
    return (
      <div
        role="alert"
        className="col-span-full rounded-lg border border-rose/50 bg-card p-4 text-sm"
      >
        <p>{syncError}</p>
        <Button
          type="button"
          onClick={() => void retry()}
          className="mt-2 bg-leaf text-leaf-fg"
        >
          Retry sync
        </Button>
      </div>
    )
  if (syncStatus === "ready")
    return (
      <p role="status" className="col-span-full text-xs text-muted-foreground">
        Study Plan saved to your private account.
      </p>
    )
  if (!accountDraft || !differences) return null

  const localPlaces = [...placements(localDraft.plan)]
  const accountPlaces = [...placements(accountDraft.plan)]
  const canMerge =
    differences.conflicts.every(({ id }) => choices[id]) &&
    (!differences.specConflict || specChoice)
  return (
    <section
      aria-label="Choose Study Plan sync"
      className="col-span-full rounded-xl border border-leaf/40 bg-card p-5 shadow-sm"
    >
      <p className="label">Before syncing</p>
      <h2 className="mt-1 font-display text-2xl">Choose which plan to use</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Your local and account plans stay separate until you choose. Review
        every placement and specialization below.
      </p>
      {recovering && (
        <p role="alert" className="mt-2 text-sm text-rose">
          {syncError}
        </p>
      )}
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <PlanPreview
          title={recovering ? "Unsaved draft on this device" : "This device"}
          places={localPlaces}
          spec={localDraft.selectedSpec}
        />
        <PlanPreview
          title="Your account"
          places={accountPlaces}
          spec={accountDraft.selectedSpec}
        />
      </div>
      <div className="mt-4 border-t border-border pt-4 text-sm">
        <p className="font-medium">Differences</p>
        <p className="mt-1 text-muted-foreground">
          Only on this device: {differences.localOnly.join(", ") || "none"}.
          Only in your account: {differences.accountOnly.join(", ") || "none"}.
        </p>
        {differences.shared.length > 0 && (
          <p className="mt-1 text-muted-foreground">
            Same term in both: {differences.shared.join(", ")}. Merge keeps one
            placement per Course.
          </p>
        )}
        {differences.conflicts.length > 0 && (
          <div className="mt-3 space-y-2">
            <p className="font-medium">
              Choose a term for each duplicate Course before merging:
            </p>
            {differences.conflicts.map(({ id, localTerm, accountTerm }) => (
              <label key={id} className="flex flex-wrap items-center gap-2">
                <span>{id}</span>
                <select
                  aria-label={`Term for ${id}`}
                  value={choices[id] ?? ""}
                  onChange={(event) =>
                    setChoices({
                      ...choices,
                      [id]: event.target.value as "local" | "account",
                    })
                  }
                  className="rounded-md border border-border bg-background px-2 py-1"
                >
                  <option value="">Choose term</option>
                  <option value="local">This device: {localTerm}</option>
                  <option value="account">Account: {accountTerm}</option>
                </select>
              </label>
            ))}
          </div>
        )}
        {differences.specConflict && (
          <label className="mt-3 flex flex-wrap items-center gap-2">
            Specialization
            <select
              aria-label="Specialization to merge"
              value={specChoice ?? ""}
              onChange={(event) =>
                setSpecChoice(event.target.value as "local" | "account")
              }
              className="rounded-md border border-border bg-background px-2 py-1"
            >
              <option value="">Choose specialization</option>
              <option value="local">
                This device: {specializationName(localDraft.selectedSpec)}
              </option>
              <option value="account">
                Account: {specializationName(accountDraft.selectedSpec)}
              </option>
            </select>
          </label>
        )}
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <Button
          type="button"
          disabled={!canMerge}
          onClick={() => void resolve("merge", choices, specChoice)}
          className="bg-leaf text-leaf-fg"
        >
          Merge plans
        </Button>
        <Button
          variant="outline"
          type="button"
          onClick={() => void resolve("replace-local")}
        >
          Replace account with local
        </Button>
        <Button
          variant="outline"
          type="button"
          onClick={() => void resolve("keep-account")}
        >
          Keep account plan
        </Button>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Your local draft stays on this device. “Keep account plan” makes no
        account changes. “Replace account with local” saves this device’s plan
        over the account plan.
      </p>
    </section>
  )
}

function PlanPreview({
  title,
  places,
  spec,
}: {
  title: string
  places: [string, string][]
  spec: string | null
}) {
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <h3 className="font-display text-lg">{title}</h3>
      <p className="mt-1 text-xs text-muted-foreground">
        Specialization: {specializationName(spec)}
      </p>
      <ul className="mt-3 max-h-40 space-y-1 overflow-y-auto text-xs">
        {places.length ? (
          places.map(([id, term]) => (
            <li key={id} className="flex justify-between gap-2">
              <span>{id}</span>
              <span className="text-muted-foreground">{term}</span>
            </li>
          ))
        ) : (
          <li className="text-muted-foreground">No Courses yet</li>
        )}
      </ul>
    </div>
  )
}
