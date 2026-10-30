import { useState } from 'react';
import { categoryTile, itemIcon } from '../lib/itemVisual';

const ICON_SIZE = { lg: 'text-6xl', md: 'text-4xl', sm: 'text-2xl' } as const;

/**
 * The item's photo if it has one (and it loads); otherwise an illustrated tile.
 * Fills its parent, so the parent sets the size and corner radius.
 */
export function ItemImage({
  name,
  category,
  imageUrl,
  size = 'lg',
  dimmed = false,
}: {
  name: string;
  category: string;
  imageUrl: string;
  size?: keyof typeof ICON_SIZE;
  dimmed?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const fade = dimmed ? 'opacity-50 grayscale' : '';

  if (imageUrl && !failed) {
    return (
      <div className={`size-full bg-slate-100 ${loaded ? '' : 'animate-pulse'}`}>
        <img
          src={imageUrl}
          alt={name}
          loading="lazy"
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className={`size-full object-cover transition-opacity duration-500 ${loaded ? (dimmed ? 'opacity-50 grayscale' : 'opacity-100') : 'opacity-0'}`}
        />
      </div>
    );
  }

  return (
    <div role="img" aria-label={name} className={`flex size-full items-center justify-center bg-gradient-to-br ${categoryTile(category)} ${fade}`}>
      <span className={`${ICON_SIZE[size]} drop-shadow-sm select-none`} aria-hidden="true">
        {itemIcon(name, category)}
      </span>
    </div>
  );
}
