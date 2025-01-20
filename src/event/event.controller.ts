import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { EventService } from './event.service';
import { EventIdInfoDto } from './dto/event-id-info.dto';
import { UpdateEventDto } from './dto/update-event.dto';
const { getFirestore, Timestamp, FieldValue, Filter } = require('firebase-admin/firestore');


@Controller('event')
export class EventController {
  constructor(private readonly eventService: EventService) { }

  @Get()
  create(@Body() eventIdInfoDto: EventIdInfoDto) {
    try {
      return this.eventService.getEventInvitations(eventIdInfoDto);
    } catch (error) {
      throw error;
    }
  }

  @Get()
  findAll() {
    return this.eventService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.eventService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateEventDto: UpdateEventDto) {
    return this.eventService.update(+id, updateEventDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.eventService.remove(+id);
  }
}
