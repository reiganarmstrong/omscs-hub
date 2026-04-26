"use client";

import * as React from "react";
import { useReviews } from "@/lib/store/reviews-store";
import { cn } from "@/lib/utils";
import { CheckIcon, PlusIcon } from "@/components/icons";

export function ReviewForm({ courseId }: { courseId: string }) {
  const { addReview } = useReviews();
  const [open, setOpen] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);

  const [rating, setRating] = React.useState(4);
  const [difficulty, setDifficulty] = React.useState(3);
  const [workload, setWorkload] = React.useState(15);
  const [recommend, setRecommend] = React.useState(true);
  const [stage, setStage] = React.useState<"First" | "Mid" | "Late">("Mid");
  const [semester, setSemester] = React.useState("Fall 2025");
  const [body, setBody] = React.useState("");
  const [pros, setPros] = React.useState<string[]>([""]);
  const [cons, setCons] = React.useState<string[]>([""]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    addReview({
      courseId,
      rating,
      difficulty,
      workload,
      recommend,
      programStage: stage,
      semester: semester.trim() || "Unspecified",
      body: body.trim(),
      pros: pros.filter((p) => p.trim()),
      cons: cons.filter((p) => p.trim()),
    });
    setSubmitted(true);
    setBody("");
    setPros([""]);
    setCons([""]);
    setTimeout(() => setSubmitted(false), 2400);
    setOpen(false);
  };

  if (!open) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3">
        <div>
          <div className="text-sm font-medium">Add your review</div>
          <p className="mt-0.5 max-w-md text-xs text-muted-foreground">
            Anonymous. Stored locally for now — when the back-end ships, it
            will publish to the real archive.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {submitted && (
            <span className="inline-flex items-center gap-1 text-xs text-leaf">
              <CheckIcon size={13} /> Posted to local archive.
            </span>
          )}
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-2 rounded-md bg-leaf px-4 py-2 text-sm text-leaf-fg hover:opacity-90"
          >
            <PlusIcon size={14} /> Write a review
          </button>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-lg border border-border bg-card p-5"
    >
      <div className="flex items-baseline justify-between border-b border-border pb-2">
        <div className="text-sm font-medium">Write a review</div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Cancel
        </button>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-5 md:grid-cols-2">
        <Numeric
          label="Overall rating"
          value={rating}
          onChange={setRating}
          min={1}
          max={5}
          step={1}
          hints={["1 — bad", "5 — excellent"]}
        />
        <Numeric
          label="Difficulty"
          value={difficulty}
          onChange={setDifficulty}
          min={1}
          max={5}
          step={1}
          hints={["1 — easy", "5 — brutal"]}
        />
        <Numeric
          label="Workload (hrs/wk)"
          value={workload}
          onChange={setWorkload}
          min={1}
          max={50}
          step={1}
          hints={["1", "50"]}
        />
        <div className="space-y-2">
          <Label>Semester taken</Label>
          <input
            value={semester}
            onChange={(e) => setSemester(e.target.value)}
            placeholder="e.g. Fall 2025"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-foreground/40 focus:outline-none"
          />
          <Label>Program stage</Label>
          <div className="flex gap-1">
            {(["First", "Mid", "Late"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStage(s)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs transition",
                  stage === s
                    ? "border-leaf bg-leaf text-leaf-fg"
                    : "border-border text-muted-foreground hover:border-leaf/60 hover:text-leaf",
                )}
              >
                {s} of program
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5">
        <Label>Your take</Label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          required
          rows={5}
          placeholder="What was the experience like? What surprised you? Who should take it?"
          className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-[15px] leading-relaxed focus:border-foreground/40 focus:outline-none"
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <ListEditor label="Pros" items={pros} setItems={setPros} accent="leaf" />
        <ListEditor label="Cons" items={cons} setItems={setCons} accent="rose" />
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={recommend}
            onChange={(e) => setRecommend(e.target.checked)}
          />
          I would recommend this course
        </label>
        <button
          type="submit"
          className="inline-flex items-center gap-2 rounded-md bg-leaf px-5 py-2 text-sm text-leaf-fg hover:opacity-90"
        >
          Submit anonymously
        </button>
      </div>
    </form>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="block label">{children}</label>;
}

function Numeric({
  label,
  value,
  onChange,
  min,
  max,
  step,
  hints,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min: number;
  max: number;
  step: number;
  hints: [string, string];
}) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="mt-1 flex items-center gap-3">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="flex-1 cursor-pointer accent-[color:var(--leaf)]"
        />
        <span className="w-12 text-right font-display tabular text-2xl">
          {value}
        </span>
      </div>
      <div className="mt-1 flex justify-between text-xs text-muted-foreground">
        <span>{hints[0]}</span>
        <span>{hints[1]}</span>
      </div>
    </div>
  );
}

function ListEditor({
  label,
  items,
  setItems,
  accent,
}: {
  label: string;
  items: string[];
  setItems: React.Dispatch<React.SetStateAction<string[]>>;
  accent: "leaf" | "rose";
}) {
  return (
    <div>
      <div
        className={cn(
          "mb-1 inline-flex items-center gap-1.5 text-xs font-medium",
          accent === "leaf" ? "text-leaf" : "text-rose",
        )}
      >
        <span
          className="size-1.5 rounded-full"
          style={{
            background:
              accent === "leaf" ? "var(--leaf)" : "var(--rose)",
          }}
        />
        {label}
      </div>
      <div className="space-y-1.5">
        {items.map((v, i) => (
          <div key={i} className="flex gap-1.5">
            <input
              value={v}
              onChange={(e) =>
                setItems((p) => p.map((x, idx) => (idx === i ? e.target.value : x)))
              }
              placeholder={`Add a ${label.toLowerCase().slice(0, -1)}…`}
              className="flex-1 rounded-md border border-border bg-background px-2 py-1.5 text-sm focus:border-foreground/40 focus:outline-none"
            />
            {items.length > 1 && (
              <button
                type="button"
                onClick={() =>
                  setItems((p) => p.filter((_, idx) => idx !== i))
                }
                className="rounded-md border border-border px-2 text-sm text-muted-foreground hover:bg-rose hover:text-white"
              >
                ×
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={() => setItems((p) => [...p, ""])}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          + Add another
        </button>
      </div>
    </div>
  );
}
