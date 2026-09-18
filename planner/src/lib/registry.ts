export type RegistryEntry = {
  id: string;
  store_name: string;
  url: string;
  notes: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export function blankRegistryEntry(sortOrder: number): Partial<RegistryEntry> {
  return { store_name: "New registry", url: "", notes: "", sort_order: sortOrder };
}
