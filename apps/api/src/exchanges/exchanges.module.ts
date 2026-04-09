import { Module } from '@nestjs/common';
import { PointsModule } from '../points/points.module';
import { PrismaService } from '../prisma/prisma.service';
import { UploadsModule } from '../uploads/uploads.module';
import { ReferralsModule } from '../referrals/referrals.module';
import { ExchangesController } from './exchanges.controller';
import { ExchangesService } from './exchanges.service';

@Module({
  imports: [PointsModule, UploadsModule, ReferralsModule],
  controllers: [ExchangesController],
  providers: [ExchangesService, PrismaService],
})
export class ExchangesModule {}
