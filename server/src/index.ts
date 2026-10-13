import { env } from './config/env';
import { createApp } from './app';
import { flushBackground } from './lib/background';

const server = createApp().listen(env.PORT, () => {
  console.log(`IITR Delivery API running on http://localhost:${env.PORT}`);
});

// Finish in-flight background work (e.g. emails) before exiting.
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    server.close();
    flushBackground().finally(() => process.exit(0));
  });
}
