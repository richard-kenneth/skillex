import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ExchangesModule } from './exchanges/exchanges.module';
import { PointsModule } from './points/points.module';
import { SkillsModule } from './skills/skills.module';
import { UsersModule } from './users/users.module';

import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { LoggerModule } from 'nestjs-pino';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { UploadsModule } from './uploads/uploads.module';
import { ReviewsModule } from './reviews/reviews.module';
import { VideoModule } from './video/video.module';
import { ReferralsModule } from './referrals/referrals.module';
import { ScheduleModule } from '@nestjs/schedule';
import { RatesModule } from './rates/rates.module';
import { BullModule } from '@nestjs/bullmq';
import { RedisModule, REDIS_CONFIG } from './redis/redis.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    RedisModule,
    BullModule.forRootAsync({
      imports: [RedisModule],
      useFactory: (redisConfig) => ({
        connection: redisConfig,
      }),
      inject: [REDIS_CONFIG],
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.NODE_ENV !== 'production' ? 'debug' : 'info',
        customSuccessMessage: function (req, res, responseTime) {
          return `${req.method} ${req.url} | Status: ${res.statusCode} | Time: ${responseTime}ms`;
        },
        customErrorMessage: function (req, res, err) {
          return `${req.method} ${req.url} | Status: ${res.statusCode} | Error: ${err.message}`;
        },
        serializers: {
          req: () => undefined,
          res: () => undefined,
        },
        transport:
          process.env.NODE_ENV !== 'production'
            ? {
                target: 'pino-pretty',
                options: {
                  singleLine: true,
                  colorize: true,
                  // Tell pretty to only print the timestamp, level, and our custom message above
                  ignore: 'pid,hostname,context,req,res,responseTime',
                  messageFormat: '{msg}',
                },
              }
            : undefined,
      },
    }),
    AuthModule,
    PrismaModule,
    UsersModule,
    SkillsModule,
    ExchangesModule,
    PointsModule,
    UploadsModule,
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    ReviewsModule,
    VideoModule,
    ReferralsModule,
    RatesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
