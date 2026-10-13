// Illustrated tiles for items without a photo: an icon picked from the item name, on a category colour.

const KEYWORD_ICONS: [RegExp, string][] = [
  [/maggi|noodle/i, '🍜'],
  [/biscuit|parle|cookie|hide & seek|fantasy/i, '🍪'],
  [/lay'?s|chips|potato/i, '🥔'],
  [/kurkure|masala munch/i, '🌶️'],
  [/bhujia|namkeen/i, '🥨'],
  [/cold coffee|coffee/i, '🧋'],
  [/chai|tea/i, '☕'],
  [/kool|milk/i, '🥛'],
  [/frooti|mango/i, '🥭'],
  [/water|bisleri/i, '💧'],
  [/red bull|energy/i, '⚡'],
  [/register|notebook/i, '📓'],
  [/pen/i, '🖊️'],
  [/drawing|drafter|compass/i, '📐'],
  [/calculator|casio/i, '🧮'],
  [/toothpaste|colgate/i, '🪥'],
  [/soap|dettol/i, '🧼'],
  [/detergent|surf/i, '🧺'],
  [/mosquito|good knight/i, '🦟'],
  [/paracetamol|tablet|medicine/i, '💊'],
  [/sandwich/i, '🥪'],
  [/paratha/i, '🫓'],
  [/roll|wrap/i, '🌯'],
  [/thali|rice|dal/i, '🍛'],
];

export const CATEGORY_ICONS: Record<string, string> = {
  Snacks: '🍿',
  Beverages: '🥤',
  Stationery: '✏️',
  Essentials: '🧴',
  Food: '🍱',
};

const CATEGORY_TILE: Record<string, string> = {
  Snacks: 'from-amber-50 to-orange-100',
  Beverages: 'from-sky-50 to-cyan-100',
  Stationery: 'from-violet-50 to-indigo-100',
  Essentials: 'from-emerald-50 to-teal-100',
  Food: 'from-rose-50 to-orange-100',
};

export function itemIcon(name: string, category: string): string {
  return KEYWORD_ICONS.find(([pattern]) => pattern.test(name))?.[1] ?? CATEGORY_ICONS[category] ?? '🛍️';
}

export function categoryTile(category: string): string {
  return CATEGORY_TILE[category] ?? 'from-slate-50 to-slate-100';
}
