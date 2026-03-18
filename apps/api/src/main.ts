import { NestFactory } from '@nestjs/core';
import 'dotenv/config';
import { Logger, LoggerErrorInterceptor } from 'nestjs-pino';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  app.enableShutdownHooks();

  app.useLogger(app.get(Logger));

  app.useGlobalInterceptors(new LoggerErrorInterceptor());

  app.enableCors({
    origin: process.env.CLIENT_BASE_URL,
    credentials: true,
  });

  await app.listen(process.env.PORT ?? 3001);
}
void bootstrap();
