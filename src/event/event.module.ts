import { Module } from '@nestjs/common';
import { EventService } from './event.service';
import { EventController } from './event.controller';
import { FirebaseModule } from '../firebase.module';

@Module({
  imports: [FirebaseModule],
  controllers: [EventController],
  providers: [EventService],
})
export class EventModule {}
