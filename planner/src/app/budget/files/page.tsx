import { createClient } from "@/lib/supabase/server";
import WeddingFiles, { type FileEntry } from "@/components/WeddingFiles";
import type { VendorFile } from "@/lib/vendors";

export const dynamic = "force-dynamic";

// Every file already attached to a venue or vendor, gathered in one place. These are the same records, never copies.
export default async function BudgetFilesPage() {
  const supabase = await createClient();
  const [{ data: vf, error }, { data: vendors }, { data: venues }] = await Promise.all([
    supabase.from("vendor_files").select("*"),
    supabase.from("vendors").select("id, name, category"),
    supabase.from("venues").select("id, name, files"),
  ]);
  const vendorName = new Map((vendors ?? []).map((v) => [v.id, v]));
  const entries: FileEntry[] = [
    ...((vf ?? []) as VendorFile[]).map((f) => ({
      key: `vendor-${f.id}`,
      kind: f.kind,
      name: f.name,
      owner: vendorName.get(f.vendor_id)?.name ?? "Vendor",
      ownerType: "Vendor" as const,
      href: `/vendors/${f.vendor_id}?tab=files`,
      url: f.url,
      bucket: "vendor-files",
      path: f.storage_path,
      added: f.created_at,
    })),
    ...(venues ?? []).flatMap((v) =>
      ((v.files ?? []) as { path: string; name: string; addedAt: string; kind?: string }[]).map((f) => ({
        key: `venue-${v.id}-${f.path}`,
        kind: f.kind ?? "other",
        name: f.name,
        owner: v.name,
        ownerType: "Venue" as const,
        href: `/venues/${v.id}?tab=files`,
        url: "",
        bucket: "venue-photos",
        path: f.path,
        added: f.addedAt,
      })),
    ),
  ];
  return <WeddingFiles entries={entries} needsMigration={Boolean(error)} />;
}
