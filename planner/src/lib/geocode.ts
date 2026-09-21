// Address → pin, using OpenStreetMap's free Nominatim search (one request per lookup;
// its usage policy allows at most one per second, so callers looping must pace themselves).
export type Geocoded = { lat: number; lng: number; label: string };

// Most of the shortlist is in and around Québec City, and names like "Blvd Champlain" or
// "Dock" exist all over the province — so look inside the city first, then anywhere in Canada.
const QUEBEC_CITY_BOX = "-71.6,46.95,-70.9,46.65"; // left,top,right,bottom

export async function geocodeVenue(name: string, location: string): Promise<Geocoded | null> {
  const loc = location.trim();
  const queries = loc ? [...new Set([loc, `${name.trim()}, ${loc}`, name.trim()])] : name.trim() ? [name.trim()] : [];
  for (const bounded of [true, false]) {
    for (const q of queries) {
      const box = bounded ? `&viewbox=${QUEBEC_CITY_BOX}&bounded=1` : "";
      const resp = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1&accept-language=en&countrycodes=ca${box}`);
      const [hit] = (await resp.json()) as { lat: string; lon: string; display_name: string }[];
      if (hit) return { lat: Number(hit.lat), lng: Number(hit.lon), label: hit.display_name };
    }
  }
  return null;
}
