import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventModule } from './event/event.module';
import { FirebaseModule } from './firebase.module';
import { NotificationsService } from './notifications/notifications.service';
import { NotificationsModule } from './notifications/notifications.module';
import { ScheduleModule } from '@nestjs/schedule';
import { AiModule } from './ai/ai.module';
import { MongooseModule } from '@nestjs/mongoose';
import { AttendantModule } from './attendant/attendant.module';
import { UserModule } from './user/user.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: [
        '/Users/devalf/Documents/invitaciones_digitales_backend/.feest.dev.env',
        '/var/www/api.devalf.com/ENV_FILES/.feest.prod.env',
      ],
      isGlobal: true,
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGO_DB_CONNECTION_STRING'),
      }),
      inject: [ConfigService],
    }),
    ScheduleModule.forRoot(),
    FirebaseModule,
    EventModule,
    NotificationsModule,
    AiModule,
    AttendantModule,
    UserModule
  ],
  controllers: [AppController],
  providers: [AppService, NotificationsService],
})
export class AppModule { }
