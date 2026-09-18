import Link from "next/link";

const FOCUS_RING = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-deep focus-visible:ring-offset-2 focus-visible:ring-offset-bg";

export default function GuestsComingLater({
  title,
  description,
  items,
  cta,
}: {
  title: string;
  description: string;
  items: string[];
  cta?: { label: string; href: string };
}) {
  return (
    <div className="rounded-2xl border border-line bg-paper p-6 shadow-sm">
      <h2 className="font-serif text-xl font-medium">{title}</h2>
      <p className="mt-2 text-sm text-ink-2">{description}</p>
      <ul className="mt-4 grid grid-cols-1 gap-x-6 gap-y-2 text-sm text-ink-2 sm:grid-cols-2">
        {items.map((s) => (
          <li key={s} className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-sage-deep" />
            {s}
          </li>
        ))}
      </ul>
      {cta && (
        <Link href={cta.href} className={`mt-5 inline-block rounded-full bg-sage-deep px-4 py-2 text-sm font-semibold text-white ${FOCUS_RING}`}>
          {cta.label}
        </Link>
      )}
    </div>
  );
}
