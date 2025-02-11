import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { ConfigService } from '@nestjs/config';

@Module({
  controllers: [AiController],
  providers: [AiService, ConfigService],
})
export class AiModule {}
