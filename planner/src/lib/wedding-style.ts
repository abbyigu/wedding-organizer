import type { SupabaseClient } from "@supabase/supabase-js";

// Wedding Style is what's been decided (the Mood Board is where ideas live). One row, extended from the palette
// the Decide Together palette decision already writes.
export type WeddingStyleRow = {
  palette: string[];
  palette_name: string;
  feeling: string[];
  tables_style: string[];
  flowers_style: string[];
  lighting_style: string[];
  attire_palette: string[];
  signature_details: string[];
  notes: string;
};

export const BLANK_STYLE: WeddingStyleRow = { palette: [], palette_name: "", feeling: [], tables_style: [], flowers_style: [], lighting_style: [], attire_palette: [], signature_details: [], notes: "" };

const list = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);

// select("*") so this works before migration 049 adds the new columns; missing ones read as empty.
export async function loadStyle(supabase: SupabaseClient): Promise<WeddingStyleRow> {
  const { data } = await supabase.from("wedding_style").select("*").eq("id", true).maybeSingle();
  if (!data) return BLANK_STYLE;
  return {
    palette: list(data.palette),
    palette_name: data.palette_name ?? "",
    feeling: list(data.feeling),
    tables_style: list(data.tables_style),
    flowers_style: list(data.flowers_style),
    lighting_style: list(data.lighting_style),
    attire_palette: list(data.attire_palette),
    signature_details: list(data.signature_details),
    notes: data.notes ?? "",
  };
}

export const hasStyle = (s: WeddingStyleRow) => s.palette.length > 0 || s.feeling.length > 0 || s.flowers_style.length > 0 || s.tables_style.length > 0 || s.lighting_style.length > 0 || s.signature_details.length > 0;
