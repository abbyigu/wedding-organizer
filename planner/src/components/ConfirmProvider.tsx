"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { useDialog } from "@/lib/use-dialog";

type Ask = (message: string, confirmLabel?: string) => Promise<boolean>;

const ConfirmContext = createContext<Ask>(async () => false);

export function useConfirm(): Ask {
  return useContext(ConfirmContext);
}

export default function ConfirmProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const [label, setLabel] = useState("Yes, remove");
  const resolver = useRef<((ok: boolean) => void) | null>(null);

  const ask = useCallback<Ask>((msg, confirmLabel = "Yes, remove") => {
    setLabel(confirmLabel);
    setMessage(msg);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const answer = useCallback((ok: boolean) => {
    resolver.current?.(ok);
    resolver.current = null;
    setMessage(null);
  }, []);

  const dialogRef = useDialog(message !== null, () => answer(false));

  return (
    <ConfirmContext.Provider value={ask}>
      {children}
      {message !== null && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <button aria-label="Cancel" tabIndex={-1} onClick={() => answer(false)} className="absolute inset-0 cursor-default" />
          <div
            ref={dialogRef}
            role="alertdialog"
            aria-modal="true"
            aria-label="Please confirm"
            aria-describedby="confirm-message"
            tabIndex={-1}
            className="relative w-full max-w-sm rounded-2xl border border-line bg-paper p-5 shadow-lg"
          >
            <p id="confirm-message" className="text-ink">{message}</p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => answer(false)}
                className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-ink-2 hover:border-sage-deep hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-deep focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
              >
                Keep it
              </button>
              <button
                onClick={() => answer(true)}
                className="rounded-full bg-surface-wine px-4 py-2 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-deep focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
              >
                {label}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
