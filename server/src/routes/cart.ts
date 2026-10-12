import { Router } from 'express';
import { addToCartSchema, updateCartSchema } from '@iitr/shared';
import { currentUserId } from '../middleware/auth';
import { addToCart, getCartSummary, removeFromCart, updateCartQuantity } from '../services/cart';

// Every cart route responds with the full, server-priced cart.
export const cartRouter = Router();

cartRouter.get('/', async (req, res) => {
  res.json(await getCartSummary(currentUserId(req)));
});

cartRouter.post('/', async (req, res) => {
  const userId = currentUserId(req);
  const { itemId, quantity } = addToCartSchema.parse(req.body);
  await addToCart(userId, itemId, quantity);
  res.status(201).json(await getCartSummary(userId));
});

cartRouter.patch('/:itemId', async (req, res) => {
  const userId = currentUserId(req);
  const { quantity } = updateCartSchema.parse(req.body);
  await updateCartQuantity(userId, req.params.itemId, quantity);
  res.json(await getCartSummary(userId));
});

cartRouter.delete('/:itemId', async (req, res) => {
  const userId = currentUserId(req);
  await removeFromCart(userId, req.params.itemId);
  res.json(await getCartSummary(userId));
});
