import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { R2Service } from './r2.service';
import { UploadsController } from './uploads.controller';

@Module({
  imports: [UsersModule],
  controllers: [UploadsController],
  providers: [R2Service],
  exports: [R2Service],
})
export class UploadsModule {}
