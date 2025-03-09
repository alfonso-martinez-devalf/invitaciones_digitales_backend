import { Controller, Get, Post, Body, Patch, Param, Delete, Version, Put, UseGuards } from '@nestjs/common';
import { EventService } from './event.service';
import { EventIdInfoDto } from './dto/event-id-info.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { CreateEventDto } from './dto/create.event.dto';
const { getFirestore, Timestamp, FieldValue, Filter } = require('firebase-admin/firestore');

@Controller('events')
export class EventController {
  constructor(private readonly eventService: EventService) { }

  @Post()
  @Version('1')
  async createEvent(@Body() body: CreateEventDto) {
    try {
      console.log('Creating event');
      return await this.eventService.create(body);
    } catch (error) {
      throw error;
    }
  }
  
  @Get()
  @Version('1')
  async findAll() {
    try {
      console.log('Finding all events');
      return await this.eventService.findAll();
    } catch (error) {
      throw error;
    }
  }
  
  @Get(':id')
  @Version('1')
  async findOne(@Param('id') id: string) {
    try {
      console.log(`Finding event ${id}`);
      return await this.eventService.findOne(id);
    } catch (error) {
      throw error;
    }
  }
  
  @Put(':id')
  @Version('1')
  async update(@Param('id') id: string, @Body() updateEventDto: UpdateEventDto) {
    try {
      console.log(`Updating event ${id}`);
      return await this.eventService.update(id, updateEventDto);
    } catch (error) {
      console.error('Error updating event:', error);
      throw error; // The error handling utility will handle the error format
    }
  }

}