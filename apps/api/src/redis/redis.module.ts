import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export const REDIS_CLIENT = 'REDIS_CLIENT';
export const REDIS_CONFIG = 'REDIS_CONFIG';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: REDIS_CONFIG,
      useFactory: (configService: ConfigService) => {
        const redisUrl = configService.get<string>('REDIS_URL') || 'redis://localhost:6379';
        try {
          const parsed = new URL(redisUrl);
          return {
            host: parsed.hostname,
            port: parsed.port ? parseInt(parsed.port, 10) : 6379,
            username: parsed.username || undefined,
            password: parsed.password || undefined,
            ...(parsed.protocol === 'rediss:' && { tls: {} }),
            maxRetriesPerRequest: null,
          };
        } catch {
          return {
            host: 'localhost',
            port: 6379,
            maxRetriesPerRequest: null,
          };
        }
      },
      inject: [ConfigService],
    },
    {
      provide: REDIS_CLIENT,
      useFactory: (configService: ConfigService) => {
        const redisUrl = configService.get<string>('REDIS_URL') || 'redis://localhost:6379';
        return new Redis(redisUrl, {
          maxRetriesPerRequest: null,
        });
      },
      inject: [ConfigService],
    },
  ],
  exports: [REDIS_CLIENT, REDIS_CONFIG],
})
export class RedisModule {}
