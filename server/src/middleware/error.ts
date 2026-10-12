import type { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { AppError } from '../lib/errors';

export function notFound(_req: Request, res: Response) {
  res.status(404).json({ error: 'Not found' });
}

// Every error leaves the API as { error: string } with a matching status code.
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.status).json({ error: err.message });
  }
  if (err instanceof ZodError) {
    return res.status(400).json({ error: err.issues[0]?.message ?? 'Invalid request' });
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
    return res.status(409).json({ error: 'This record already exists' });
  }
  if (isBodyParseError(err)) {
    return res.status(400).json({ error: 'Request body must be valid JSON' });
  }

  console.error(err);
  res.status(500).json({ error: 'Something went wrong. Please try again.' });
}

function isBodyParseError(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { type?: string }).type === 'entity.parse.failed';
}
