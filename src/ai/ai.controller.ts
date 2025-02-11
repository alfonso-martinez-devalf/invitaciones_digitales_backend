import { Controller, Get, Post, Body, Patch, Param, Delete, Version } from '@nestjs/common';
import { AiService } from './ai.service';
import { AskAiDto } from './dto/create-ai.dto';
import { UpdateAiDto } from './dto/update-ai.dto';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) { }

  @Post()
  @Version('1')
  async create(@Body() askAiDto: AskAiDto) {
    return await this.aiService.askAI(askAiDto.msg);
  }

  @Get()
  findAll() {
    return this.aiService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.aiService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateAiDto: UpdateAiDto) {
    return this.aiService.update(+id, updateAiDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.aiService.remove(+id);
  }
}
