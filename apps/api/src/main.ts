import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { env } from './config/env.js';
import { DatabaseProvider } from './config/database.provider.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { cors: { origin: env.WEB_ORIGIN.split(' ') } });
  const db = app.get(DatabaseProvider);

  // Ctrl+C / SIGTERM → close the pg pool before exit.
  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.on(signal, async () => {
      await db.close();
      await app.close();
      process.exit(0);
    });
  }

  await app.listen(env.PORT, '0.0.0.0');
  console.log(`[api] listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
}

void bootstrap();