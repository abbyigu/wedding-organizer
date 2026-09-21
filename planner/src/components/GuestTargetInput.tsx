"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// "target: [80] adults" — edit in place; saved to the shared budget settings so every page agrees.
export default function GuestTargetInput({ value, onChange, className = "" }: { value: number; onChange?: (n: number) => void; className?: string }) {
  const router = useRouter();
  const [text, setText] = useState(String(value));
  const [status, setStatus] = useState("");

  async function commit() {
    const n = Math.round(Number(text));
    if (!Number.isFinite(n) || n < 1) {
      setText(String(value));
      return;
    }
    if (n === value) return;
    setStatus("Saving…");
    const { error } = await createClient().from("budget_settings").upsert({ id: true, guest_target: n }, { onConflict: "id" });
    if (error) {
      setStatus(error.message);
      setText(String(value));
      return;
    }
    onChange?.(n);
    setStatus("Saved");
    setTimeout(() => setStatus(""), 1500);
    router.refresh();
  }

  return (
    <label className={`flex flex-wrap items-center gap-1.5 text-sm text-ink-2 ${className}`}>
      target:
      <input
        type="number"
        min={1}
        inputMode="numeric"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
        aria-label="Adult guest target"
        className="w-16 rounded-md border border-line bg-bg px-2 py-0.5 text-center text-ink outline-none focus:border-sage-deep"
      />
      adults
      {status && <span role="status" className="text-xs">{status}</span>}
    </label>
  );
}
