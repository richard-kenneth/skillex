import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PointsController } from './points.controller';
import { PointsService } from './points.service';
import { RatesModule } from '../rates/rates.module';

@Module({
  imports: [RatesModule],
  controllers: [PointsController],
  providers: [PointsService, PrismaService],
  exports: [PointsService],
})
export class PointsModule {}
