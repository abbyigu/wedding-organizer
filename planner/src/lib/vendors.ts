export type VendorStatus = "researching" | "contacted" | "booked" | "confirmed";
export type Vendor = {
  id: string;
  name: string;
  category: string;
  contact_name: string;
  phone: string;
  email: string;
  website: string;
  status: VendorStatus;
  cost: number | null;
  deposit_paid: boolean;
  notes: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export const VENDOR_CATEGORIES = [
  "Catering",
  "Photography",
  "Videography",
  "Music & DJ",
  "Florist",
  "Hair & makeup",
  "Officiant",
  "Transportation",
  "Stationery",
  "Cake & desserts",
  "Rentals",
  "Other",
] as const;

export const VENDOR_STATUS_ORDER: VendorStatus[] = ["researching", "contacted", "booked", "confirmed"];

export const VENDOR_STATUS_LABELS: Record<VendorStatus, string> = {
  researching: "Researching",
  contacted: "Contacted",
  booked: "Booked",
  confirmed: "Confirmed",
};

export function blankVendor(sortOrder: number): Partial<Vendor> {
  return {
    name: "New vendor",
    category: "Other",
    contact_name: "",
    phone: "",
    email: "",
    website: "",
    status: "researching",
    cost: null,
    deposit_paid: false,
    notes: "",
    sort_order: sortOrder,
  };
}
