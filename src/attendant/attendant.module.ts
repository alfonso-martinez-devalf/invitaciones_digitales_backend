import { Module } from '@nestjs/common';
import { AttendantService } from './attendant.service';
import { AttendantController } from './attendant.controller';

@Module({
  controllers: [AttendantController],
  providers: [AttendantService],
})
export class AttendantModule {}
