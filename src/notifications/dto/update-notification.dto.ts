import { PartialType } from '@nestjs/mapped-types';
import { SubscribeToTopic } from './subscribe-to-topic.dto';

export class UpdateNotificationDto extends PartialType(SubscribeToTopic) {}
