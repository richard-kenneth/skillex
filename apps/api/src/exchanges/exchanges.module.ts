import { Module } from '@nestjs/common';
import { PointsModule } from '../points/points.module';
import { PrismaService } from '../prisma/prisma.service';
import { ExchangesController } from './exchanges.controller';
import { ExchangesService } from './exchanges.service';

@Module({
  imports: [PointsModule],
  controllers: [ExchangesController],
  providers: [ExchangesService, PrismaService],
})
export class ExchangesModule {}
