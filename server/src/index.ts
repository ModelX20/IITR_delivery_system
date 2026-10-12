import { env } from './config/env';
import { createApp } from './app';

createApp().listen(env.PORT, () => {
  console.log(`IITR Delivery API running on http://localhost:${env.PORT}`);
});
