"use client";

import { useState, useTransition } from "react";
import { Mail } from "lucide-react";
import { sendMeATest, setReminderAddress, setReminderFrequency } from "@/app/reminders/actions";

const FOCUS_RING = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-deep focus-visible:ring-offset-2 focus-visible:ring-offset-bg";

export default function ReminderSettings({ frequency, sendTo, ready }: { frequency: string; sendTo: string; ready: boolean }) {
  const [freq, setFreq] = useState(frequency);
  const [addr, setAddr] = useState(sendTo);
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<{ ok: boolean; message: string }>) => start(async () => setMsg((await fn()).message));

  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line pt-3 text-sm">
      <Mail className="h-4 w-4 text-ink-2" strokeWidth={1.5} aria-hidden />
      <label htmlFor="reminder-freq" className="text-ink-2">Email me these</label>
      <select id="reminder-freq" value={freq} disabled={pending} onChange={(e) => { setFreq(e.target.value); run(() => setReminderFrequency(e.target.value)); }} className="h-11 rounded-lg border border-line bg-bg px-2 text-sm">
        <option value="off">Never</option>
        <option value="weekly">Weekly, and when something is overdue</option>
        <option value="daily">Every day something needs me</option>
      </select>
      {ready ? (
        <button onClick={() => run(sendMeATest)} disabled={pending || freq === "off"} className={`min-h-11 rounded px-1 font-medium text-green underline underline-offset-2 disabled:opacity-50 ${FOCUS_RING}`}>Send me one now</button>
      ) : (
        <span className="text-ink-2">Sending isn&apos;t switched on yet.</span>
      )}
      <form className="flex flex-wrap items-center gap-2" onSubmit={(e) => { e.preventDefault(); run(() => setReminderAddress(addr)); }}>
        <label htmlFor="reminder-to" className="text-ink-2">Send to</label>
        <input id="reminder-to" type="email" value={addr} onChange={(e) => setAddr(e.target.value)} placeholder="your login address" className="h-11 w-56 rounded-lg border border-line bg-bg px-3 text-sm" />
        <button type="submit" disabled={pending} className={`min-h-11 rounded px-1 font-medium text-green underline underline-offset-2 disabled:opacity-50 ${FOCUS_RING}`}>Save</button>
      </form>
      <span role="status" className="text-ink-2">{pending ? "…" : msg}</span>
    </div>
  );
}
