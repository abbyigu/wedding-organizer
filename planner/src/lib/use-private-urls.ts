"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Short-lived links to private images. The bucket is private, so nothing here is ever a public URL.
export function usePrivateUrls(paths: (string | null | undefined)[]) {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const key = [...new Set(paths.filter((p): p is string => Boolean(p)))].sort().join("|");
  useEffect(() => {
    const list = key ? key.split("|") : [];
    if (list.length === 0) return;
    let live = true;
    createClient()
      .storage.from("private-files")
      .createSignedUrls(list, 3600)
      .then(({ data }) => {
        if (live) setUrls((cur) => ({ ...cur, ...Object.fromEntries((data ?? []).filter((d): d is typeof d & { signedUrl: string } => Boolean(d.signedUrl)).map((d) => [d.path ?? "", d.signedUrl])) }));
      });
    return () => {
      live = false;
    };
  }, [key]);
  return urls;
}
