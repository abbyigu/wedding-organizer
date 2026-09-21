import Link from "next/link";

export default function EventsViewTabs({ active }: { active: "weekend" | "all" }) {
  const item = (on: boolean) => `rounded-full px-4 py-2 font-semibold ${on ? "bg-surface-green text-white" : "text-ink-2 hover:text-ink"} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-deep`;
  return (
    <nav aria-label="Events view" className="flex rounded-full border border-line bg-paper p-1 text-sm">
      <Link href="/guests/events" aria-current={active === "weekend" ? "page" : undefined} className={item(active === "weekend")}>Wedding Weekend</Link>
      <Link href="/guests/events?view=all" aria-current={active === "all" ? "page" : undefined} className={item(active === "all")}>All Events</Link>
    </nav>
  );
}
