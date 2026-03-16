import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ExchangesModule } from './exchanges/exchanges.module';
import { SkillsModule } from './skills/skills.module';
import { UsersModule } from './users/users.module';

import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    UsersModule,
    SkillsModule,
    ExchangesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
