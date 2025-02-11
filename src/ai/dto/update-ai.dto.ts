import { PartialType } from '@nestjs/mapped-types';
import { AskAiDto } from './create-ai.dto';

export class UpdateAiDto extends PartialType(AskAiDto) { }
