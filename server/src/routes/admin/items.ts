import { Router } from 'express';
import type { Prisma } from '@prisma/client';
import { adminItemsQuerySchema, createItemSchema, updateItemSchema } from '@iitr/shared';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../lib/errors';
import { toAdminItem } from '../../lib/serialize';
import { getSettings } from '../../services/settings';

export const adminItemsRouter = Router();

adminItemsRouter.get('/', async (req, res) => {
  const { search, category, status, lowStock } = adminItemsQuerySchema.parse(req.query);

  const where: Prisma.ItemWhereInput = {};
  if (search) where.name = { contains: search, mode: 'insensitive' };
  if (category) where.category = category;
  if (status !== 'all') where.isActive = status === 'active';
  if (lowStock === 'true') {
    where.isActive = true;
    where.stock = { lte: (await getSettings()).lowStockThreshold };
  }

  const items = await prisma.item.findMany({ where, orderBy: [{ isActive: 'desc' }, { name: 'asc' }] });
  res.json({ items: items.map(toAdminItem) });
});

adminItemsRouter.post('/', async (req, res) => {
  const data = createItemSchema.parse(req.body);
  const item = await prisma.item.create({ data });
  res.status(201).json({ item: toAdminItem(item) });
});

adminItemsRouter.patch('/:id', async (req, res) => {
  const data = updateItemSchema.parse(req.body);
  const existing = await prisma.item.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new AppError(404, 'Item not found');

  const item = await prisma.item.update({ where: { id: existing.id }, data });
  res.json({ item: toAdminItem(item) });
});

// Soft delete: items stay in the database so past orders keep their references.
adminItemsRouter.delete('/:id', async (req, res) => {
  const existing = await prisma.item.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new AppError(404, 'Item not found');

  const item = await prisma.item.update({ where: { id: existing.id }, data: { isActive: false } });
  res.json({ item: toAdminItem(item) });
});
