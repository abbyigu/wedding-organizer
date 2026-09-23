"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

// Debounced field saves for a list of rows: patch local state right away, write to Supabase after a pause.
export function useRowSave<T>(table: string, patchLocal: (id: string, patch: Partial<T>) => void, onError: (message: string) => void) {
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const supabase = useRef(createClient()).current;
  useEffect(() => {
    const pending = timers.current;
    return () => Object.values(pending).forEach(clearTimeout);
  }, []);

  async function saveNow(id: string, patch: Partial<T>) {
    patchLocal(id, patch);
    const { error } = await supabase.from(table).update(patch as Record<string, unknown>).eq("id", id);
    if (error) onError(error.message);
  }
  function scheduleSave(id: string, patch: Partial<T>) {
    patchLocal(id, patch);
    const key = id + Object.keys(patch)[0];
    clearTimeout(timers.current[key]);
    timers.current[key] = setTimeout(async () => {
      const { error } = await supabase.from(table).update(patch as Record<string, unknown>).eq("id", id);
      if (error) onError(error.message);
    }, 700);
  }
  return { saveNow, scheduleSave };
}
