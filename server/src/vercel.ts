// Entry point for the Vercel Function that serves every /api/* request (see scripts/vercel-build.mjs).
// Vercel calls the exported (req, res) handler; an Express app is exactly that.
import { createApp } from './app';

export default createApp();
