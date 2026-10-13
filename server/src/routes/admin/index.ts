import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth';
import { adminDashboardRouter } from './dashboard';
import { adminItemsRouter } from './items';
import { adminOrdersRouter } from './orders';
import { adminUsersRouter } from './users';

// Every /api/admin route requires a logged-in ADMIN, enforced here once for the whole router.
export const adminRouter = Router();

adminRouter.use(requireAuth, requireRole('ADMIN'));
adminRouter.use('/', adminDashboardRouter);
adminRouter.use('/items', adminItemsRouter);
adminRouter.use('/orders', adminOrdersRouter);
adminRouter.use('/users', adminUsersRouter);
