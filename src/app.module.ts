import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { EventModule } from './event/event.module';
import { FirebaseModule } from './firebase.module';
import { NotificationsService } from './notifications/notifications.service';
import { NotificationsModule } from './notifications/notifications.module';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [ConfigModule.forRoot({ cache: true }), ScheduleModule.forRoot(), FirebaseModule, EventModule, NotificationsModule,],
  controllers: [AppController],
  providers: [AppService, NotificationsService],
})
export class AppModule { }
