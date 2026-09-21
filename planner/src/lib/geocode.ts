// Address → pin, using OpenStreetMap's free Nominatim search (one request per lookup;
// its usage policy allows at most one per second, so callers looping must pace themselves).
export type Geocoded = { lat: number; lng: number; label: string };

export async function geocodeVenue(name: string, location: string): Promise<Geocoded | null> {
  const loc = location.trim();
  const queries = loc ? [...new Set([loc, `${name.trim()}, ${loc}`])] : name.trim() ? [name.trim()] : [];
  for (const q of queries) {
    const resp = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1&accept-language=en`);
    const [hit] = (await resp.json()) as { lat: string; lon: string; display_name: string }[];
    if (hit) return { lat: Number(hit.lat), lng: Number(hit.lon), label: hit.display_name };
  }
  return null;
}
