import { Router } from 'express';
import { orders, getNextId, ORDER_STATUSES } from '../data/store.js';

const router = Router();

// GET /api/orders - list all orders
router.get('/', (req, res) => {
  res.json(orders);
});

// GET /api/orders/:id - get one order
router.get('/:id', (req, res) => {
  const order = orders.find((o) => o.id === Number(req.params.id));
  if (!order) return res.status(404).json({ error: 'Order not found' });
  res.json(order);
});

// POST /api/orders - create a new order
router.post('/', (req, res) => {
  const { studentName, item, pickupLocation, dropLocation } = req.body;
  if (!studentName || !item || !pickupLocation || !dropLocation) {
    return res
      .status(400)
      .json({ error: 'studentName, item, pickupLocation and dropLocation are required' });
  }
  const order = {
    id: getNextId(),
    studentName,
    item,
    pickupLocation,
    dropLocation,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  orders.push(order);
  res.status(201).json(order);
});

// PATCH /api/orders/:id/status - update order status
router.patch('/:id/status', (req, res) => {
  const order = orders.find((o) => o.id === Number(req.params.id));
  if (!order) return res.status(404).json({ error: 'Order not found' });
  const { status } = req.body;
  if (!ORDER_STATUSES.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${ORDER_STATUSES.join(', ')}` });
  }
  order.status = status;
  res.json(order);
});

export default router;
