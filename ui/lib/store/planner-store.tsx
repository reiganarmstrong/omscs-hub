"use client"

import * as React from "react"
import { canonicalCourseId } from "@/lib/data"
import type { SpecializationId } from "@/lib/types"
import { useGatechSession } from "@/components/auth/gatech-session"
import {
  fetchStudyPlan,
  parseStudyPlanData,
  saveStudyPlan,
  StudyPlanConflictError,
  type StudyPlan,
  type StudyPlanData,
  type CourseAttempt,
} from "@/lib/api/study-plan"
import { mergePlans, planDifferences } from "./plan-merge"
import { readStorage, subscribeStorage, writeStorage } from "./storage"

export type PlannerTermKey = string
type SyncStatus =
  | "guest"
  | "loading"
  | "reconcile"
  | "ready"
  | "saving"
  | "sync-error"
type Ctx = {
  plan: StudyPlan
  attempts: CourseAttempt[]
  addAttempt: (courseId: string, term: string, outcome: CourseAttempt["outcome"]) => void
  updateAttempt: (id: string, term: string, outcome: CourseAttempt["outcome"]) => void
  removeAttempt: (id: string) => void
  selectedSpec: SpecializationId | null
  setSelectedSpec: (id: SpecializationId | null) => void
  add: (term: PlannerTermKey, courseId: string) => void
  remove: (term: PlannerTermKey, courseId: string) => void
  move: (from: PlannerTermKey, to: PlannerTermKey, courseId: string) => void
  clear: () => void
  has: (courseId: string) => PlannerTermKey | null
  syncStatus: SyncStatus
  syncError: string | null
  localDraft: StudyPlanData
  recovering: boolean
  accountDraft: StudyPlanData | null
  resolve: (
    choice: "merge" | "replace-local" | "keep-account",
    placements?: Record<string, "local" | "account">,
    specChoice?: "local" | "account" | null
  ) => Promise<boolean>
  retry: () => Promise<void>
}

const PLAN_KEY = "omscs-hub:planner:v1"
const PREFS_KEY = "omscs-hub:prefs:v1"
const ATTEMPTS_KEY = "omscs-hub:attempts:v1"
const EMPTY_PLAN: StudyPlan = {}
const EMPTY_ATTEMPTS: CourseAttempt[] = []
const EMPTY_PREFS: { selectedSpec: SpecializationId | null } = {
  selectedSpec: null,
}
const PlannerCtx = React.createContext<Ctx | null>(null)

function normalize(plan: StudyPlan): StudyPlan {
  const seen = new Set<string>()
  return Object.fromEntries(
    Object.entries(plan).map(([term, ids]) => [
      term,
      ids.map(canonicalCourseId).filter((id) => {
        if (seen.has(id)) return false
        seen.add(id)
        return true
      }),
    ])
  )
}

function samePlan(a: StudyPlanData, b: StudyPlanData) {
  return fingerprint(a) === fingerprint(b)
}

function fingerprint(data: StudyPlanData) {
  return JSON.stringify({ plan: data.plan, selectedSpec: data.selectedSpec, attempts: data.attempts })
}

const PENDING_PREFIX = "omscs-hub:pending-plan:"
let pagePendingId: string | null = null
type PendingEntry = { key: string; raw: string; draft: StudyPlanData; updatedAt: number }

function pendingKey(userId: string) {
  pagePendingId ??= crypto.randomUUID()
  return `${PENDING_PREFIX}${userId}:${pagePendingId}`
}

function readPending(userId: string): PendingEntry | null {
  try {
    const prefix = `${PENDING_PREFIX}${userId}:`
    const entries: PendingEntry[] = []
    for (let index = 0; index < localStorage.length; index++) {
      const key = localStorage.key(index)
      if (!key?.startsWith(prefix)) continue
      const raw = localStorage.getItem(key)
      if (!raw) continue
      const value = JSON.parse(raw)
      const draft = parseStudyPlanData(value.draft)
      if (draft)
        entries.push({ key, raw, draft, updatedAt: value.updatedAt ?? 0 })
    }
    return (
      entries.find(({ key }) => key === pendingKey(userId)) ??
      entries.sort((a, b) => b.updatedAt - a.updatedAt)[0] ??
      null
    )
  } catch {
    return null
  }
}

function writePending(userId: string, draft: StudyPlanData) {
  try {
    localStorage.setItem(
      pendingKey(userId),
      JSON.stringify({ draft, updatedAt: Date.now() })
    )
  } catch {
    /* Account draft remains in memory until this tab closes. */
  }
}

function clearPending(userId: string, selected?: PendingEntry | null) {
  try {
    const ownKey = pendingKey(userId)
    localStorage.removeItem(ownKey)
    if (
      selected &&
      selected.key !== ownKey &&
      localStorage.getItem(selected.key) === selected.raw
    )
      localStorage.removeItem(selected.key)
  } catch {
    /* No pending draft was stored. */
  }
}

export function PlannerProvider({ children }: { children: React.ReactNode }) {
  const { isSignedIn, userId, getToken } = useGatechSession()
  const guestPlan = React.useSyncExternalStore(
    (cb) => subscribeStorage(PLAN_KEY, cb),
    () => readStorage<StudyPlan>(PLAN_KEY, EMPTY_PLAN),
    () => EMPTY_PLAN
  )
  const guestPrefs = React.useSyncExternalStore(
    (cb) => subscribeStorage(PREFS_KEY, cb),
    () => readStorage(PREFS_KEY, EMPTY_PREFS),
    () => EMPTY_PREFS
  )
  const guestAttempts = React.useSyncExternalStore(
    (cb) => subscribeStorage(ATTEMPTS_KEY, cb),
    () => readStorage<CourseAttempt[]>(ATTEMPTS_KEY, EMPTY_ATTEMPTS),
    () => EMPTY_ATTEMPTS
  )
  const localDraft = React.useMemo<StudyPlanData>(
    () => ({
      plan: normalize(guestPlan),
      selectedSpec:
        (guestPrefs.selectedSpec as string | null) ===
        "interactive-intelligence"
          ? "artificial-intelligence"
          : guestPrefs.selectedSpec,
      revision: 0,
      attempts: guestAttempts,
    }),
    [guestPlan, guestPrefs, guestAttempts]
  )
  const [account, setAccount] = React.useState<StudyPlanData | null>(null)
  const [recoveryDraft, setRecoveryDraft] =
    React.useState<StudyPlanData | null>(null)
  const [status, setStatus] = React.useState<SyncStatus>("guest")
  const [error, setError] = React.useState<string | null>(null)
  const [retryCount, setRetryCount] = React.useState(0)
  const accountRef = React.useRef<StudyPlanData | null>(null)
  const persistedRef = React.useRef<StudyPlanData | null>(null)
  const savingRef = React.useRef<Promise<boolean> | null>(null)
  const selectedPendingRef = React.useRef<PendingEntry | null>(null)
  const userRef = React.useRef<string | null>(null)
  const localRef = React.useRef(localDraft)
  React.useEffect(() => {
    localRef.current = localDraft
  }, [localDraft])

  React.useEffect(() => {
    userRef.current = userId
    if (!isSignedIn || !userId) {
      accountRef.current = null
      persistedRef.current = null
      savingRef.current = null
      selectedPendingRef.current = null
      queueMicrotask(() => {
        setAccount(null)
        setRecoveryDraft(null)
        setStatus("guest")
        setError(null)
      })
      return
    }
    let cancelled = false
    accountRef.current = null
    persistedRef.current = null
    savingRef.current = null
    selectedPendingRef.current = null
    queueMicrotask(() => {
      if (!cancelled) {
        setAccount(null)
        setRecoveryDraft(null)
        setStatus("loading")
        setError(null)
      }
    })
    void (async () => {
      try {
        const token = await getToken()
        if (!token) throw new Error("Study Plan session unavailable.")
        const loaded = await fetchStudyPlan(token)
        if (cancelled) return
        persistedRef.current = loaded
        const pending = readPending(userId)
        selectedPendingRef.current = pending
        if (pending && !samePlan(pending.draft, loaded)) {
          writePending(userId, pending.draft)
          if (pending.draft.revision !== loaded.revision) {
            accountRef.current = loaded
            setAccount(loaded)
            setRecoveryDraft(pending.draft)
            setError(
              "Account changed while sync failed. Review your unsaved draft before choosing."
            )
            setStatus("reconcile")
            return
          }
          accountRef.current = pending.draft
          setAccount(pending.draft)
          setError(
            "Unsaved Study Plan changes remain on this device. Retry sync."
          )
          setStatus("sync-error")
          return
        }
        clearPending(userId, selectedPendingRef.current)
        accountRef.current = loaded
        setAccount(loaded)
        const local = localRef.current
        const hasLocal =
          Object.values(local.plan).some((ids) => ids.length) ||
          local.attempts.length > 0 ||
          Boolean(local.selectedSpec)
        const marker = readStorage<string>(
          `omscs-hub:plan-choice:${userId}`,
          ""
        )
        setStatus(hasLocal && marker !== fingerprint(local) ? "reconcile" : "ready")
      } catch (cause) {
        if (cancelled) return
        setError(
          cause instanceof Error ? cause.message : "Study Plan sync failed."
        )
        setStatus("sync-error")
      }
    })()
    return () => {
      cancelled = true
    }
  }, [isSignedIn, userId, getToken, retryCount])

  const persist = React.useCallback(async () => {
    const userId = userRef.current
    if (!userId) return false
    if (savingRef.current) return savingRef.current
    const task = (async () => {
      setStatus("saving")
      setError(null)
      try {
        const token = await getToken()
        if (!token) throw new Error("Study Plan session unavailable.")
        while (
          userRef.current === userId &&
          accountRef.current &&
          persistedRef.current
        ) {
          const draft = accountRef.current
          if (draft.revision !== persistedRef.current.revision)
            throw new Error(
              "Account changed in another session. Review both plans before saving."
            )
          const saved = await saveStudyPlan(token, {
            ...draft,
            revision: persistedRef.current.revision,
          })
          if (userRef.current !== userId) return false
          persistedRef.current = saved
          if (samePlan(accountRef.current, draft)) {
            accountRef.current = saved
            setAccount(saved)
            clearPending(userId, selectedPendingRef.current)
            setStatus("ready")
            return true
          }
          const latest = { ...accountRef.current, revision: saved.revision }
          accountRef.current = latest
          setAccount(latest)
          writePending(userId, latest)
        }
        return false
      } catch (cause) {
        if (userRef.current !== userId) return false
        if (accountRef.current) writePending(userId, accountRef.current)
        if (cause instanceof StudyPlanConflictError && accountRef.current) {
          try {
            const token = await getToken()
            if (!token) throw new Error("Study Plan session unavailable.")
            const loaded = await fetchStudyPlan(token)
            if (userRef.current !== userId) return false
            const draft = accountRef.current
            if (!draft) return false
            persistedRef.current = loaded
            accountRef.current = loaded
            setAccount(loaded)
            if (samePlan(draft, loaded)) {
              clearPending(userId, selectedPendingRef.current)
              setStatus("ready")
            } else {
              setRecoveryDraft(draft)
              setError(
                "Account changed in another session. Review your unsaved draft before choosing."
              )
              setStatus("reconcile")
            }
            return false
          } catch {
            /* Keep the local draft and offer another sync attempt. */
          }
        }
        setError(
          cause instanceof Error ? cause.message : "Study Plan sync failed."
        )
        setStatus("sync-error")
        return false
      }
    })()
    savingRef.current = task
    try {
      return await task
    } finally {
      if (savingRef.current === task) savingRef.current = null
    }
  }, [getToken])

  const resolve = React.useCallback(
    async (
      choice: "merge" | "replace-local" | "keep-account",
      choices: Record<string, "local" | "account"> = {},
      specChoice: "local" | "account" | null = null
    ) => {
      const current = accountRef.current
      const userId = userRef.current
      if (!current || !userId || status !== "reconcile") return false
      const local = recoveryDraft ?? localRef.current
      const next =
        choice === "merge"
          ? mergePlans(local, current, choices, specChoice)
          : choice === "replace-local"
            ? { ...current, plan: local.plan, selectedSpec: local.selectedSpec, attempts: local.attempts }
            : current
      if (!next) return false
      if (choice !== "keep-account") {
        accountRef.current = next
        setAccount(next)
        writePending(userId, next)
      }
      const saved =
        choice === "keep-account" || samePlan(next, current)
          ? (clearPending(userId, selectedPendingRef.current), setStatus("ready"), true)
          : await persist()
      if (saved) setRecoveryDraft(null)
      if (saved)
        writeStorage(
          `omscs-hub:plan-choice:${userId}`,
          fingerprint(localRef.current)
        )
      return saved
    },
    [persist, status, recoveryDraft]
  )

  const update = React.useCallback(
    (change: (current: StudyPlanData) => StudyPlanData) => {
      if (!isSignedIn) {
        const next = change(localRef.current)
        writeStorage(PLAN_KEY, next.plan)
        writeStorage(PREFS_KEY, { selectedSpec: next.selectedSpec })
        writeStorage(ATTEMPTS_KEY, next.attempts)
      } else if (
        (status === "ready" || status === "saving") &&
        accountRef.current &&
        userId &&
        userRef.current === userId
      ) {
        const next = change(accountRef.current)
        accountRef.current = next
        setAccount(next)
        writePending(userId, next)
        void persist()
      }
    },
    [isSignedIn, status, persist, userId]
  )

  const data = isSignedIn ? account : localDraft
  const plan = React.useMemo(
    () => normalize(data?.plan ?? EMPTY_PLAN),
    [data?.plan]
  )
  const selectedSpec = data?.selectedSpec ?? null
  const attempts = data?.attempts ?? EMPTY_ATTEMPTS
  const value = React.useMemo<Ctx>(
    () => ({
      plan,
      attempts,
      addAttempt(courseId, term, outcome) {
        update((current) => ({ ...current, attempts: [...current.attempts, { id: crypto.randomUUID(), courseId: canonicalCourseId(courseId), term, outcome }] }))
      },
      updateAttempt(id, term, outcome) {
        update((current) => ({ ...current, attempts: current.attempts.map((attempt) => attempt.id === id ? { ...attempt, term, outcome } : attempt) }))
      },
      removeAttempt(id) {
        update((current) => ({ ...current, attempts: current.attempts.filter((attempt) => attempt.id !== id) }))
      },
      selectedSpec,
      syncStatus: isSignedIn ? status : "guest",
      syncError: error,
      localDraft: recoveryDraft ?? localDraft,
      recovering: Boolean(recoveryDraft),
      accountDraft: account,
      resolve,
      retry: async () => {
        if (status !== "sync-error") return
        if (accountRef.current) {
          const saved = await persist()
          if (saved && userRef.current) {
            const local = localRef.current
            writeStorage(
              `omscs-hub:plan-choice:${userRef.current}`,
              fingerprint(local)
            )
          }
        } else setRetryCount((count) => count + 1)
      },
      setSelectedSpec(id) {
        update((current) => ({ ...current, selectedSpec: id }))
      },
      add(term, rawId) {
        const id = canonicalCourseId(rawId)
        update((current) => {
          const next = Object.fromEntries(
            Object.entries(current.plan).map(([key, ids]) => [
              key,
              ids.filter((course) => canonicalCourseId(course) !== id),
            ])
          )
          next[term] = [...(next[term] ?? []), id]
          return { ...current, plan: next }
        })
      },
      remove(term, rawId) {
        const id = canonicalCourseId(rawId)
        update((current) => ({
          ...current,
          plan: {
            ...current.plan,
            [term]: (current.plan[term] ?? []).filter(
              (course) => canonicalCourseId(course) !== id
            ),
          },
        }))
      },
      move(from, to, rawId) {
        const id = canonicalCourseId(rawId)
        update((current) => ({
          ...current,
          plan: {
            ...current.plan,
            [from]: (current.plan[from] ?? []).filter(
              (course) => canonicalCourseId(course) !== id
            ),
            [to]: [
              ...(current.plan[to] ?? []).filter(
                (course) => canonicalCourseId(course) !== id
              ),
              id,
            ],
          },
        }))
      },
      clear() {
        update((current) => ({ ...current, plan: {} }))
      },
      has(rawId) {
        const id = canonicalCourseId(rawId)
        for (const [term, ids] of Object.entries(plan))
          if (ids.includes(id)) return term
        return null
      },
    }),
    [
      plan,
      attempts,
      selectedSpec,
      isSignedIn,
      status,
      error,
      localDraft,
      recoveryDraft,
      account,
      resolve,
      update,
      persist,
    ]
  )
  return <PlannerCtx.Provider value={value}>{children}</PlannerCtx.Provider>
}

export function usePlanner() {
  const ctx = React.useContext(PlannerCtx)
  if (!ctx) throw new Error("usePlanner must be used within PlannerProvider")
  return ctx
}

export function usePlanDifferences() {
  const { localDraft, accountDraft } = usePlanner()
  return accountDraft ? planDifferences(localDraft, accountDraft) : null
}
