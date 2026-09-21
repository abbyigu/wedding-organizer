"use client";

import { useState } from "react";
import { ArrowRight, Check, ListChecks, Mail, Phone, Plus, User, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useConfirm } from "@/components/ConfirmProvider";
import NavBar from "@/components/NavBar";
import DashboardTopBar from "@/components/DashboardTopBar";
import PartyMemberDialog, { type MemberForm } from "@/components/PartyMemberDialog";
import { partnerName } from "@/lib/ideas";
import { firstName, PHASES, splitList, type PartyPhase, type PartyTask, type Side, type WeddingPartyMember } from "@/lib/wedding-party";

const FOCUS_RING = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-deep focus-visible:ring-offset-2 focus-visible:ring-offset-bg";
const TABS = [
  { key: "people", label: "People" },
  { key: "attire", label: "Attire" },
  { key: "responsibilities", label: "Responsibilities" },
] as const;
type Tab = (typeof TABS)[number]["key"];

const SIDE_TINT: Record<Side, string> = {
  Ariel: "color-mix(in srgb, var(--surface-wine) 22%, var(--paper))",
  Fred: "color-mix(in srgb, var(--sage) 38%, var(--paper))",
  Both: "color-mix(in srgb, var(--gold) 30%, var(--paper))",
};

function Swatch({ hex, size = "h-4 w-4" }: { hex?: string; size?: string }) {
  return (
    <span
      aria-hidden
      className={`${size} inline-block shrink-0 rounded-full border border-line`}
      style={hex ? { backgroundColor: hex } : undefined}
    />
  );
}

function Portrait({ m, className }: { m: WeddingPartyMember; className: string }) {
  return m.photo_url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={m.photo_url} alt="" className={`${className} object-cover`} />
  ) : (
    <div className={`${className} flex items-center justify-center font-serif text-5xl font-light text-ink`} style={{ backgroundColor: SIDE_TINT[m.side] }} aria-hidden>
      {m.name.charAt(0).toUpperCase()}
    </div>
  );
}

export default function WeddingParty({
  initialMembers,
  initialTasks,
  tasksMissing,
  palette,
  userName,
}: {
  initialMembers: WeddingPartyMember[];
  initialTasks: PartyTask[];
  tasksMissing: boolean;
  palette: { colours: string[]; name: string };
  userName: string;
}) {
  const confirm = useConfirm();
  const supabase = createClient();
  const [members, setMembers] = useState(initialMembers);
  const [tasks, setTasks] = useState(initialTasks);
  const [tab, setTab] = useState<Tab>("people");
  const [dialog, setDialog] = useState<{ member?: WeddingPartyMember; side?: Side } | null>(null);
  const [error, setError] = useState("");

  const bySide = (s: Side) => members.filter((m) => m.side === s);
  const toAssign = members.filter((m) => !m.role.trim()).length;
  const partner = partnerName(userName || "Ariel");
  const memberName = (id: string | null) => members.find((m) => m.id === id)?.name;

  async function saveMember(id: string | null, f: MemberForm): Promise<string | null> {
    if (id) {
      const { error } = await supabase.from("wedding_party").update(f).eq("id", id);
      if (error) return error.message;
      setMembers((ms) => ms.map((m) => (m.id === id ? { ...m, ...f } : m)));
    } else {
      const { data, error } = await supabase.from("wedding_party").insert({ ...f, sort_order: members.length }).select().single();
      if (error) return error.message;
      setMembers((ms) => [...ms, data as WeddingPartyMember]);
    }
    return null;
  }

  async function removeMember(m: WeddingPartyMember) {
    if (!(await confirm(`Remove ${m.name} from the wedding party?`))) return;
    setDialog(null);
    setMembers((ms) => ms.filter((x) => x.id !== m.id));
    setTasks((ts) => ts.map((t) => (t.member_id === m.id ? { ...t, member_id: null } : t)));
    await supabase.from("wedding_party").delete().eq("id", m.id);
  }

  async function addTask(phase: PartyPhase, title: string, memberId: string | null) {
    setError("");
    const { data, error } = await supabase.from("wedding_party_tasks").insert({ phase, title, member_id: memberId, sort_order: tasks.length }).select().single();
    if (error) setError(error.message);
    else setTasks((ts) => [...ts, data as PartyTask]);
  }

  async function patchTask(id: string, patch: Partial<PartyTask>) {
    setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, ...patch } : t)));
    const { error } = await supabase.from("wedding_party_tasks").update(patch).eq("id", id);
    if (error) setError(error.message);
  }

  async function removeTask(id: string) {
    setTasks((ts) => ts.filter((t) => t.id !== id));
    await supabase.from("wedding_party_tasks").delete().eq("id", id);
  }

  const keyRole = (m: WeddingPartyMember) => {
    const mine = tasks.filter((t) => t.member_id === m.id);
    return (mine.find((t) => !t.done) ?? mine[0])?.title;
  };

  function Group({ side, title, blurb }: { side: Side; title: string; blurb: string }) {
    const list = bySide(side);
    return (
      <section aria-label={title} className="min-w-0">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-serif text-2xl font-medium">{title}</h2>
            <p className="text-sm text-ink-2">{blurb}</p>
          </div>
          <button onClick={() => setDialog({ side })} className={`flex shrink-0 items-center gap-1.5 rounded-full border border-line px-4 py-2.5 text-sm font-semibold hover:bg-bg ${FOCUS_RING}`}>
            <Plus className="h-4 w-4" strokeWidth={1.75} aria-hidden /> Add
          </button>
        </div>
        {list.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-dashed border-line p-6 text-center text-sm text-ink-2">No one on this side yet.</p>
        ) : (
          <ul className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] gap-4">
            {list.map((m) => (
              <li key={m.id} className="flex flex-col overflow-hidden rounded-2xl border border-line bg-paper shadow-sm">
                <Portrait m={m} className="aspect-[4/3] w-full" />
                <div className="flex flex-1 flex-col p-4">
                  <h3 className="font-serif text-lg font-medium leading-tight">{m.name}</h3>
                  <p className="text-sm text-ink-2">{m.role || "Role to assign"}</p>
                  <div className="mt-3 flex gap-1">
                    {m.email ? (
                      <a href={`mailto:${m.email}`} aria-label={`Email ${m.name}`} className={`flex h-10 w-10 items-center justify-center rounded-full text-ink hover:bg-bg ${FOCUS_RING}`}>
                        <Mail className="h-4 w-4" strokeWidth={1.5} aria-hidden />
                      </a>
                    ) : null}
                    {m.phone ? (
                      <a href={`tel:${m.phone}`} aria-label={`Call ${m.name}`} className={`flex h-10 w-10 items-center justify-center rounded-full text-ink hover:bg-bg ${FOCUS_RING}`}>
                        <Phone className="h-4 w-4" strokeWidth={1.5} aria-hidden />
                      </a>
                    ) : null}
                  </div>
                  <dl className="mt-2 flex flex-col gap-1.5 text-sm text-ink-2">
                    <div className="flex items-center gap-2">
                      <Swatch hex={m.attire_hex} />
                      <dt className="sr-only">Attire</dt>
                      <dd className="min-w-0 truncate">Attire: {m.attire_colour || "not chosen yet"}</dd>
                    </div>
                    <div className="truncate"><dt className="inline">Flowers: </dt><dd className="inline">{m.flowers || "not chosen yet"}</dd></div>
                    <div className="truncate"><dt className="inline">Key role: </dt><dd className="inline">{keyRole(m) || "none yet"}</dd></div>
                  </dl>
                  <button onClick={() => setDialog({ member: m })} className={`mt-4 flex items-center justify-center gap-1.5 rounded-full border border-line px-4 py-2.5 text-sm font-semibold hover:bg-bg ${FOCUS_RING}`}>
                    View details <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    );
  }

  const withColour = members.filter((m) => m.attire_hex || m.attire_colour);
  const extras = new Map<string, number>();
  for (const m of members) for (const x of [...splitList(m.flowers), ...splitList(m.accessories)]) extras.set(x, (extras.get(x) ?? 0) + 1);

  const attirePanel = (
    <section aria-label="Attire at a glance" className="rounded-2xl border border-line bg-paper p-5 shadow-sm sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-serif text-2xl font-medium">Attire at a glance</h2>
          <p className="text-sm text-ink-2">A coordinated look for our favourite people.</p>
        </div>
        {tab === "people" && (
          <button onClick={() => setTab("attire")} className={`flex shrink-0 items-center gap-1.5 rounded-full border border-line px-4 py-2.5 text-sm font-semibold hover:bg-bg ${FOCUS_RING}`}>
            Edit attire details <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
          </button>
        )}
      </div>
      {palette.colours.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl bg-bg px-4 py-3">
          <span className="text-sm font-semibold">Our wedding palette{palette.name ? `: ${palette.name}` : ""}</span>
          <ul className="flex gap-1.5" aria-label="Wedding palette">
            {palette.colours.map((hex, i) => <li key={`${i}-${hex}`} className="h-6 w-6 rounded-full border border-line" style={{ backgroundColor: hex }} title={hex} />)}
          </ul>
          <span className="text-xs text-ink-2">From Decide Together. Just a reference, so nothing here changes on its own.</span>
        </div>
      )}
      {withColour.length === 0 ? (
        <p className="mt-4 text-sm text-ink-2">No colours picked yet. Open someone&apos;s profile and choose their attire colour to see the palette here.</p>
      ) : (
        <ul className="mt-5 flex flex-wrap gap-x-6 gap-y-4">
          {withColour.map((m) => (
            <li key={m.id} className="flex w-24 flex-col items-center text-center">
              <Swatch hex={m.attire_hex} size="h-14 w-14" />
              <span className="mt-2 text-sm font-semibold">{firstName(m.name)}</span>
              <span className="text-xs text-ink-2">{m.role}</span>
              <span className="mt-0.5 text-xs text-ink-2">{m.attire_colour}</span>
            </li>
          ))}
        </ul>
      )}
      {extras.size > 0 && (
        <div className="mt-5 border-t border-line pt-4">
          <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-2">Flowers &amp; accessories</h3>
          <ul className="mt-2 flex flex-wrap gap-2">
            {[...extras].map(([name, n]) => (
              <li key={name} className="rounded-full bg-bg px-3 py-1 text-sm">{name}{n > 1 && <span className="text-ink-2"> ×{n}</span>}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );

  const contacts = members.filter((m) => m.phone || m.email);

  return (
    <div className="min-h-screen pb-20 lg:pl-56">
      <NavBar userName={userName} />
      <div className="mx-auto max-w-[1320px] px-4 py-5 sm:px-6 lg:px-8">
        <DashboardTopBar
          userName={userName}
          partner={partner}
          items={members.map((m) => ({ label: m.name, hint: m.role || "Wedding party", href: m.id }))}
          notices={[]}
          placeholder="Search people or roles…"
          onSelect={(item) => setDialog({ member: members.find((m) => m.id === item.href) })}
        />

        <section className="mt-8 grid items-stretch gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <div className="flex flex-col justify-center">
            <h1 className="font-serif text-5xl font-light tracking-[-0.02em] sm:text-6xl xl:text-[4.5rem]">Our Wedding Party</h1>
            <p className="mt-3 font-serif text-3xl font-light leading-snug text-ink-2">The people standing beside us.</p>
          </div>
          <div className="relative min-h-[13rem] overflow-hidden rounded-2xl bg-[color-mix(in_srgb,var(--sage)_30%,var(--paper))]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/photo-flower-table.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-l from-black/55 via-black/10 to-transparent" />
            <p aria-hidden className="absolute right-6 top-1/2 hidden -translate-y-1/2 -rotate-6 text-right font-script text-4xl leading-[1.05] text-white [text-shadow:0_1px_8px_rgba(0,0,0,0.5)] sm:block">
              Our favourite people,
              <br />
              by our side ♡
            </p>
          </div>
        </section>

        <section aria-label="Party summary" className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-4 rounded-2xl border border-line bg-paper px-5 py-4 shadow-sm sm:px-6">
          {[
            { Icon: Users, n: members.length, label: "total people" },
            { Icon: User, n: bySide("Ariel").length, label: "Ariel's side" },
            { Icon: User, n: bySide("Fred").length, label: "Fred's side" },
            { Icon: ListChecks, n: toAssign, label: toAssign === 1 ? "role to assign" : "roles to assign" },
          ].map(({ Icon, n, label }) => (
            <div key={label} className="flex items-center gap-3">
              <Icon className="h-6 w-6 text-ink-2" strokeWidth={1.25} aria-hidden />
              <p><span className="font-serif text-2xl font-medium">{n}</span> <span className="text-sm text-ink-2">{label}</span></p>
            </div>
          ))}
          <button onClick={() => setDialog({})} className={`ml-auto flex items-center gap-1.5 rounded-full bg-surface-green px-5 py-3 text-sm font-semibold text-white ${FOCUS_RING}`}>
            <Plus className="h-4 w-4" strokeWidth={2} aria-hidden /> Add member
          </button>
        </section>

        <div role="tablist" aria-label="Wedding party views" className="mt-8 flex gap-8 border-b border-line">
          {TABS.map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              className={`border-b-2 pb-3 text-lg ${tab === t.key ? "border-ink font-medium text-ink" : "border-transparent text-ink-2 hover:text-ink"}`}
            >
              {t.label}
            </button>
          ))}
        </div>
        {error && <p role="alert" className="mt-3 text-sm text-wine">{error}</p>}

        <div className="mt-6 flex flex-col gap-8">
          {tab === "people" && (
            <>
              <div className="grid items-start gap-8 xl:grid-cols-2 xl:gap-10">
                {Group({ side: "Ariel", title: "Ariel’s People", blurb: `${bySide("Ariel").length} standing with Ariel` })}
                {Group({ side: "Fred", title: "Fred’s People", blurb: `${bySide("Fred").length} standing with Fred` })}
              </div>
              {bySide("Both").length > 0 && Group({ side: "Both", title: "Both of Us", blurb: "Standing with the two of us" })}
              {attirePanel}
              <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                <section className="rounded-2xl border border-line bg-paper p-5 shadow-sm sm:p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="font-serif text-2xl font-medium">Key responsibilities</h2>
                      <p className="text-sm text-ink-2">Who&apos;s doing what to make the day unforgettable.</p>
                    </div>
                    <button onClick={() => setTab("responsibilities")} className={`flex shrink-0 items-center gap-1.5 rounded-full border border-line px-4 py-2.5 text-sm font-semibold hover:bg-bg ${FOCUS_RING}`}>
                      View all <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
                    </button>
                  </div>
                  <Responsibilities tasks={tasks} memberName={memberName} members={members} preview tasksMissing={tasksMissing} onAdd={addTask} onPatch={patchTask} onRemove={removeTask} />
                </section>
                <section className="rounded-2xl border border-line bg-paper p-5 shadow-sm sm:p-6">
                  <h2 className="font-serif text-2xl font-medium">Important contacts</h2>
                  <p className="text-sm text-ink-2">Quick access on the big day.</p>
                  {contacts.length === 0 ? (
                    <p className="mt-4 text-sm text-ink-2">Add a phone number or email to someone&apos;s profile and it shows up here.</p>
                  ) : (
                    <ul className="mt-4 flex flex-col gap-2">
                      {contacts.map((m) => (
                        <li key={m.id} className="flex items-baseline justify-between gap-3 text-sm">
                          <span className="font-semibold">{firstName(m.name)}</span>
                          {m.phone ? <a href={`tel:${m.phone}`} className="text-ink-2 underline-offset-2 hover:underline">{m.phone}</a> : <a href={`mailto:${m.email}`} className="truncate text-ink-2 underline-offset-2 hover:underline">{m.email}</a>}
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </div>
            </>
          )}

          {tab === "attire" && (
            <>
              {attirePanel}
              <ul className="flex flex-col gap-2">
                {members.length === 0 && <li className="rounded-2xl border border-dashed border-line p-6 text-center text-sm text-ink-2">Add people first, then choose what everyone is wearing.</li>}
                {members.map((m) => (
                  <li key={m.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-line bg-paper px-4 py-3">
                    <Swatch hex={m.attire_hex} size="h-8 w-8" />
                    <div className="min-w-[9rem] flex-1">
                      <p className="font-serif text-lg font-medium leading-tight">{m.name}</p>
                      <p className="text-sm text-ink-2">{m.role || "Role to assign"}</p>
                    </div>
                    <p className="min-w-[10rem] flex-1 text-sm text-ink-2">
                      {[m.attire_colour, m.attire, m.flowers, m.accessories].filter(Boolean).join(" · ") || "Nothing chosen yet"}
                    </p>
                    <button onClick={() => setDialog({ member: m })} className={`rounded-full border border-line px-4 py-2.5 text-sm font-semibold hover:bg-bg ${FOCUS_RING}`}>Edit</button>
                  </li>
                ))}
              </ul>
            </>
          )}

          {tab === "responsibilities" && (
            <Responsibilities tasks={tasks} memberName={memberName} members={members} tasksMissing={tasksMissing} onAdd={addTask} onPatch={patchTask} onRemove={removeTask} />
          )}
        </div>
      </div>

      {dialog && (
        <PartyMemberDialog
          member={dialog.member}
          defaultSide={dialog.side}
          onClose={() => setDialog(null)}
          onSave={(f) => saveMember(dialog.member?.id ?? null, f)}
          onRemove={dialog.member ? () => removeMember(dialog.member!) : undefined}
        />
      )}
    </div>
  );
}

function Responsibilities({
  tasks,
  members,
  memberName,
  preview,
  tasksMissing,
  onAdd,
  onPatch,
  onRemove,
}: {
  tasks: PartyTask[];
  members: WeddingPartyMember[];
  memberName: (id: string | null) => string | undefined;
  preview?: boolean;
  tasksMissing: boolean;
  onAdd: (phase: PartyPhase, title: string, memberId: string | null) => Promise<void>;
  onPatch: (id: string, patch: Partial<PartyTask>) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
}) {
  if (tasksMissing) {
    return <p className="mt-4 text-sm text-ink-2">Responsibilities need one small database update (migration 036) before they can be saved.</p>;
  }
  return (
    <div className={`grid gap-4 sm:grid-cols-2 xl:grid-cols-4 ${preview ? "mt-5" : ""}`}>
      {PHASES.map((p) => {
        const list = tasks.filter((t) => t.phase === p.key);
        const shown = preview ? list.slice(0, 4) : list;
        return (
          <section key={p.key} aria-label={p.label} className="rounded-xl border border-line bg-bg/60 p-4">
            <h3 className="font-serif text-lg font-medium">{p.label}</h3>
            <ul className="mt-3 flex flex-col gap-1">
              {shown.length === 0 && <li className="text-sm text-ink-2">Nothing here yet.</li>}
              {shown.map((t) => (
                <li key={t.id} className="flex items-start gap-2 text-sm">
                  <button
                    role="checkbox"
                    aria-checked={t.done}
                    aria-label={`${t.title}, ${t.done ? "done" : "not done"}`}
                    onClick={() => onPatch(t.id, { done: !t.done })}
                    className="-m-1 flex h-9 w-9 shrink-0 items-center justify-center"
                  >
                    <span className={`flex h-5 w-5 items-center justify-center rounded border ${t.done ? "border-sage-deep bg-surface-sage-deep text-white" : "border-ink-2"}`}>
                      {t.done && <Check className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />}
                    </span>
                  </button>
                  <span className={`min-w-0 flex-1 pt-1.5 ${t.done ? "text-ink-2 line-through" : ""}`}>
                    {t.title}
                    {memberName(t.member_id) && <span className="block text-xs text-ink-2">{memberName(t.member_id)}</span>}
                  </span>
                  {!preview && (
                    <button onClick={() => onRemove(t.id)} aria-label={`Remove ${t.title}`} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-2 hover:text-wine">×</button>
                  )}
                </li>
              ))}
            </ul>
            {preview ? (
              list.length > 4 && <p className="mt-2 text-xs text-ink-2">+{list.length - 4} more</p>
            ) : (
              <AddTask phase={p.key} placeholder={p.placeholder} members={members} onAdd={onAdd} />
            )}
          </section>
        );
      })}
    </div>
  );
}

function AddTask({ phase, placeholder, members, onAdd }: { phase: PartyPhase; placeholder: string; members: WeddingPartyMember[]; onAdd: (phase: PartyPhase, title: string, memberId: string | null) => Promise<void> }) {
  const [title, setTitle] = useState("");
  const [who, setWho] = useState("");
  return (
    <form
      className="mt-3 flex flex-col gap-2 border-t border-line pt-3"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!title.trim()) return;
        await onAdd(phase, title.trim(), who || null);
        setTitle("");
      }}
    >
      <input id={`pt-${phase}-title`} aria-label={`New ${phase} responsibility`} value={title} onChange={(e) => setTitle(e.target.value)} placeholder={placeholder} className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-sage-deep" />
      <div className="flex gap-2">
        <select id={`pt-${phase}-who`} aria-label="Who is responsible" value={who} onChange={(e) => setWho(e.target.value)} className="min-w-0 flex-1 rounded-lg border border-line bg-paper px-2 py-2 text-sm">
          <option value="">Anyone</option>
          {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        <button className="rounded-full bg-surface-green px-4 py-2 text-sm font-semibold text-white">Add</button>
      </div>
    </form>
  );
}
