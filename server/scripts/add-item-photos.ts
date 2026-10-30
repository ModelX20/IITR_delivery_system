// Adds the product photos from prisma/itemPhotos.ts to items that don't have a photo yet.
// Safe for a live database: it changes nothing else (prices, stock, users and orders are untouched),
// and it never replaces a photo an admin has already set.
import { PrismaClient } from '@prisma/client';
import { ITEM_PHOTOS } from '../prisma/itemPhotos';

const prisma = new PrismaClient();

async function main() {
  let updated = 0;
  for (const [id, imageUrl] of Object.entries(ITEM_PHOTOS)) {
    const { count } = await prisma.item.updateMany({ where: { id, imageUrl: '' }, data: { imageUrl } });
    updated += count;
  }
  console.log(`Added photos to ${updated} item(s). Items that already had a photo, or don't exist, were left alone.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
