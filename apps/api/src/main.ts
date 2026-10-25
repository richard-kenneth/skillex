import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import 'dotenv/config';
import { Logger, LoggerErrorInterceptor } from 'nestjs-pino';
import { AppModule } from './app.module';
import { getDevExtraOrigins } from './common/config/origins';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
    rawBody: true,
  });

  app.enableShutdownHooks();

  app.useLogger(app.get(Logger));

  app.useGlobalInterceptors(new LoggerErrorInterceptor());

  // Render (and most hosting platforms) terminate TLS in front of the app.
  // Trust exactly one proxy hop so rate limiting sees the real client IP
  // instead of the proxy address.
  app.set('trust proxy', 1);

  app.disable('x-powered-by');

  app.enableCors({
    origin: [
      ...(process.env.CLIENT_BASE_URL ? [process.env.CLIENT_BASE_URL] : []),
      ...(process.env.NODE_ENV === 'development'
        ? [
            /^http:\/\/localhost:\d+$/,
            /^http:\/\/127\.0\.0\.1:\d+$/,
            ...getDevExtraOrigins(),
          ]
        : []),
    ],
    credentials: true,
  });

  // LiveKit sends webhooks with Content-Type: application/webhook+json
  // We need to support both application/json and application/webhook+json
  app.useBodyParser('json', {
    type: ['application/json', 'application/webhook+json'],
  });

  app.setGlobalPrefix('api', { exclude: ['health'] });

  await app.listen(process.env.PORT ?? 3001, '0.0.0.0');
}
void bootstrap();
