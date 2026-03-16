import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ExchangesController } from './exchanges.controller';
import { ExchangesService } from './exchanges.service';

@Module({
  controllers: [ExchangesController],
  providers: [ExchangesService, PrismaService],
})
export class ExchangesModule {}
