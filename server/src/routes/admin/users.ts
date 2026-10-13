import { Router, type Request } from 'express';
import type { Prisma } from '@prisma/client';
import { adminUsersQuerySchema, updateUserBlockSchema, updateUserRoleSchema } from '@iitr/shared';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../lib/errors';
import { pageArgs, paginated } from '../../lib/pagination';
import { toAdminUser } from '../../lib/serialize';
import { currentUserId } from '../../middleware/auth';

export const adminUsersRouter = Router();

const withOrderCount = { _count: { select: { orders: true } } } satisfies Prisma.UserInclude;

adminUsersRouter.get('/', async (req, res) => {
  const { search, role, blocked, page } = adminUsersQuerySchema.parse(req.query);

  const where: Prisma.UserWhereInput = {};
  if (role) where.role = role;
  if (blocked) where.isBlocked = blocked === 'true';
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { enrollmentNo: { contains: search } },
    ];
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({ where, include: withOrderCount, orderBy: { createdAt: 'desc' }, ...pageArgs(page) }),
    prisma.user.count({ where }),
  ]);
  res.json(paginated(users.map(toAdminUser), total, page));
});

/** Loads the target user, refusing to let admins change their own account (so they can't lock themselves out). */
async function findOtherUser(req: Request<{ id: string }>) {
  const id = req.params.id;
  if (id === currentUserId(req)) {
    throw new AppError(400, "You can't change your own role or block yourself");
  }
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new AppError(404, 'User not found');
  return user;
}

adminUsersRouter.patch('/:id/role', async (req, res) => {
  const { role } = updateUserRoleSchema.parse(req.body);
  const user = await findOtherUser(req);
  const updated = await prisma.user.update({ where: { id: user.id }, data: { role }, include: withOrderCount });
  res.json({ user: toAdminUser(updated) });
});

adminUsersRouter.patch('/:id/block', async (req, res) => {
  const { isBlocked } = updateUserBlockSchema.parse(req.body);
  const user = await findOtherUser(req);
  const updated = await prisma.user.update({ where: { id: user.id }, data: { isBlocked }, include: withOrderCount });
  res.json({ user: toAdminUser(updated) });
});
