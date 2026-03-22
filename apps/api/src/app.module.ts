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

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
