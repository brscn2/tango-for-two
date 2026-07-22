const KEY = import.meta.env.VITE_GIPHY_KEY ?? '';

export interface Gif { id: string; url: string; preview: string; }

export async function searchGifs(query: string): Promise<Gif[]> {
  if (!KEY) return [];
  const url =
    `https://api.giphy.com/v1/gifs/search?api_key=${KEY}` +
    `&q=${encodeURIComponent(query)}&limit=12&rating=pg-13&bundle=messaging_non_clips`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  return (data.data ?? []).map((r: any) => ({
    id: r.id,
    url: r.images?.downsized?.url ?? r.images?.original?.url,
    preview: r.images?.fixed_height_small?.url ?? r.images?.preview_gif?.url ?? r.images?.downsized?.url,
  }));
}
