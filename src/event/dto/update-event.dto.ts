import { PartialType } from '@nestjs/mapped-types';
import { EventIdInfoDto } from './event-id-info.dto';

export class UpdateEventDto extends PartialType(EventIdInfoDto) { }
