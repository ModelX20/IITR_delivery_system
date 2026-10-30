// Background and banner photos, all free to use under the Unsplash License (https://unsplash.com/license).
// Served from Unsplash's image CDN, sized and compressed on the fly.

export function unsplash(id: string, width = 800, height?: number): string {
  return `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}${height ? `&h=${height}` : ''}&q=70`;
}

export const PHOTOS = {
  /** Thali spread on a dark table: home hero */
  hero: 'photo-1727404679933-99daa2a7573a',
  /** Second dark food spread: login and sign-up background */
  auth: 'photo-1592457711340-2412dc07b733',
  maggiBowl: 'photo-1612927601601-6638404737ce',
  samosa: 'photo-1601050690597-df0568f70950',
  pavBhaji: 'photo-1753357303396-704b5abe8945',
  dosa: 'photo-1668236543090-82eba5ee5976',
  calculator: 'photo-1574607383077-47ddc2dc51c4',
  coldCoffee: 'photo-1461023058943-07fcbe16d735',
} as const;

/** One photo per category, for the "What's on your mind?" circles. */
export const CATEGORY_PHOTOS: Record<string, string> = {
  Snacks: 'photo-1528751014936-863e6e7a319c',
  Beverages: 'photo-1461023058943-07fcbe16d735',
  Stationery: 'photo-1612367980327-7454a7276aa7',
  Essentials: 'photo-1693692273603-3b9e13789298',
  Food: 'photo-1742281257687-092746ad6021',
};
