import { Router } from 'express';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { toItem } from '../lib/serialize';

const querySchema = z.object({
  search: z.string().trim().max(100).optional(),
  category: z.string().trim().max(50).optional(),
});

export const itemsRouter = Router();

itemsRouter.get('/', async (req, res) => {
  const { search, category } = querySchema.parse(req.query);

  const where: Prisma.ItemWhereInput = { isActive: true };
  if (search) where.name = { contains: search, mode: 'insensitive' };
  if (category) where.category = category;

  const items = await prisma.item.findMany({ where, orderBy: [{ category: 'asc' }, { name: 'asc' }] });
  res.json({ items: items.map(toItem) });
});
