import type { StoreSettings } from '@iitr/shared';
import { prisma } from '../lib/prisma';

const SETTINGS_ID = 1;

/** The single store-settings row (created with defaults if it is somehow missing). */
export async function getSettings(): Promise<StoreSettings> {
  const row = await prisma.storeSettings.upsert({ where: { id: SETTINGS_ID }, create: { id: SETTINGS_ID }, update: {} });
  return { lowStockThreshold: row.lowStockThreshold };
}

export async function updateSettings(data: Partial<StoreSettings>): Promise<StoreSettings> {
  const row = await prisma.storeSettings.upsert({
    where: { id: SETTINGS_ID },
    create: { id: SETTINGS_ID, ...data },
    update: data,
  });
  return { lowStockThreshold: row.lowStockThreshold };
}
