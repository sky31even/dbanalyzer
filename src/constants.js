// Shared constants for colors and chart configuration

export const SERIES_CONFIG = [
  { key: 'movie', label: '电影', color: '#2AA3F4' },
  { key: 'tv', label: '电视剧', color: '#7c3aed' },
  { key: 'book', label: '图书', color: '#2FA44F' },
  { key: 'music', label: '音乐', color: '#F6C28B' },
];

export const SERIES_KEYS = ['movie', 'tv', 'book', 'music'];

export const CATEGORY_LABELS = {
  movie: '电影',
  tv: '电视剧',
  book: '图书',
  music: '音乐',
};

// Proxy image URL builder (no Date.now() to avoid re-fetching on re-render)
export function proxyImageUrl(cover) {
  if (!cover) return null;
  return `/api/proxy/image?url=${encodeURIComponent(cover)}`;
}
