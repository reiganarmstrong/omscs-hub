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
  const [stage, setStage] =
    React.useState<"First" | "Mid" | "Late">("Mid");
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
      <div className="flex flex-wrap items-center justify-between gap-2 border-y border-ink/15 py-3">
        <div>
          <div className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
            Add yours
          </div>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            Reviews are anonymous. Posting writes to your browser only — when
            the back-end ships, the form will publish to the real archive.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 bg-ink px-4 py-2 font-mono text-[11px] tracking-[0.2em] text-paper uppercase transition hover:bg-claret"
        >
          <PlusIcon size={12} /> Write an anonymous review
        </button>
        {submitted && (
          <span className="inline-flex items-center gap-1 font-mono text-[10px] tracking-widest text-claret uppercase">
            <CheckIcon size={12} /> Posted to local archive.
          </span>
        )}
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="border border-ink p-5 shadow-[3px_3px_0_var(--ink)]"
    >
      <div className="flex items-baseline justify-between border-b border-ink/15 pb-2">
        <div className="font-mono text-[10px] tracking-[0.2em] uppercase">
          Write a review
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase hover:text-ink"
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
            className="w-full rounded-sm border border-ink/25 bg-paper px-3 py-2 font-mono text-sm focus:border-ink focus:outline-none"
          />
          <Label>Program stage</Label>
          <div className="flex gap-1">
            {(["First", "Mid", "Late"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStage(s)}
                className={cn(
                  "rounded-full border px-3 py-1 font-mono text-[10px] tracking-widest uppercase transition",
                  stage === s
                    ? "border-ink bg-ink text-paper"
                    : "border-ink/25 text-ink hover:border-ink/60",
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
          className="mt-1 w-full rounded-sm border border-ink/25 bg-paper px-3 py-2 text-[15px] leading-relaxed focus:border-ink focus:outline-none"
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <ListEditor label="Pros" items={pros} setItems={setPros} accent="gold" />
        <ListEditor label="Cons" items={cons} setItems={setCons} accent="claret" />
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-ink/15 pt-4">
        <label className="flex cursor-pointer items-center gap-2 font-mono text-[11px] tracking-widest uppercase">
          <input
            type="checkbox"
            checked={recommend}
            onChange={(e) => setRecommend(e.target.checked)}
          />
          I would recommend this course
        </label>
        <button
          type="submit"
          className="inline-flex items-center gap-2 bg-ink px-5 py-2 font-mono text-[11px] tracking-[0.2em] text-paper uppercase hover:bg-claret"
        >
          Submit anonymously
        </button>
      </div>
    </form>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="block font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
      {children}
    </label>
  );
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
          className="flex-1 cursor-pointer accent-[color:var(--ink)]"
        />
        <span className="w-12 text-right font-display tabular text-2xl">
          {value}
        </span>
      </div>
      <div className="mt-1 flex justify-between font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
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
  accent: "gold" | "claret";
}) {
  return (
    <div>
      <div
        className={cn(
          "mb-1 inline-flex items-center gap-1 font-mono text-[10px] tracking-widest uppercase",
          accent === "gold" ? "text-gold-fg" : "text-claret",
        )}
      >
        <span
          className="size-1.5 rounded-full"
          style={{
            background: accent === "gold" ? "var(--gold)" : "var(--claret)",
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
              className="flex-1 rounded-sm border border-ink/25 bg-paper px-2 py-1 text-[13px] focus:border-ink focus:outline-none"
            />
            {items.length > 1 && (
              <button
                type="button"
                onClick={() =>
                  setItems((p) => p.filter((_, idx) => idx !== i))
                }
                className="rounded-sm border border-ink/25 px-2 font-mono text-[10px] tracking-widest hover:bg-ink hover:text-paper"
              >
                ×
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={() => setItems((p) => [...p, ""])}
          className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase hover:text-ink"
        >
          + Add another
        </button>
      </div>
    </div>
  );
}
