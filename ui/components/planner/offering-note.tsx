import { offeringEvidence } from "@/lib/data/offering-evidence";

export function OfferingNote({ courseId, termKey, showLink = true }: { courseId: string; termKey: string; showLink?: boolean }) {
  const evidence = offeringEvidence(courseId, termKey);
  const term = termKey.replace("-", " ");

  if (evidence.state === "confirmed") {
    return (
      <span className="block text-[11px] text-leaf">
        Confirmed {term} online section {evidence.section} · Schedule dated {evidence.scheduleDate}; checked {evidence.lastChecked}.{" "}
        {showLink && <a href={evidence.sourceUrl} target="_blank" rel="noreferrer" className="underline underline-offset-2">Official schedule</a>}
      </span>
    );
  }
  if (evidence.state === "historical") {
    return (
      <span className="block text-[11px] text-amber-700 dark:text-amber-300">
        Typically offered in {term.split(" ")[0]}; history is no guarantee · Checked {evidence.lastChecked}.{" "}
        {showLink && <a href={evidence.sourceUrl} target="_blank" rel="noreferrer" className="underline underline-offset-2">Offering history</a>}
      </span>
    );
  }
  return (
    <span className="block text-[11px] text-rose">
      Unverified for {term}. Check the official schedule before registration.
    </span>
  );
}
