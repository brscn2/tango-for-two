// Minimal loader for the YouTube IFrame Player API.
let apiPromise: Promise<void> | null = null;

export function loadYouTubeApi(): Promise<void> {
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve) => {
    if ((window as any).YT?.Player) { resolve(); return; }
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    (window as any).onYouTubeIframeAPIReady = () => resolve();
    document.head.appendChild(tag);
  });
  return apiPromise;
}

export function parseVideoId(input: string): string | null {
  // Accept raw IDs, youtu.be links, and youtube.com/watch?v= links.
  if (/^[a-zA-Z0-9_-]{11}$/.test(input)) return input;
  try {
    const url = new URL(input);
    if (url.hostname.includes('youtu.be')) return url.pathname.slice(1) || null;
    return url.searchParams.get('v');
  } catch {
    return null;
  }
}

/** Default Bruno Mars playlist seed (a well-known Bruno Mars video id). */
export const DEFAULT_VIDEO_ID = 'PMivT7MJ41M'; // "Treasure"
