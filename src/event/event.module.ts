import { Module } from '@nestjs/common';
import { EventService } from './event.service';
import { EventController } from './event.controller';
import { FirebaseModule } from '../firebase.module';
import { NotificationsService } from '../notifications/notifications.service';

@Module({
  imports: [FirebaseModule],
  controllers: [EventController],
  providers: [EventService, NotificationsService],
})
export class EventModule {}
