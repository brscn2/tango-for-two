const KEY = import.meta.env.VITE_TENOR_KEY ?? '';

export interface Gif { id: string; url: string; preview: string; }

export async function searchGifs(query: string): Promise<Gif[]> {
  if (!KEY) return [];
  const url = `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(query)}&key=${KEY}&limit=12&media_filter=tinygif,gif`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  return (data.results ?? []).map((r: any) => ({
    id: r.id,
    url: r.media_formats?.gif?.url ?? r.media_formats?.tinygif?.url,
    preview: r.media_formats?.tinygif?.url ?? r.media_formats?.gif?.url,
  }));
}
