import { HttpException, HttpStatus, Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { EventIdInfoDto } from './dto/event-id-info.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { NotificationsService } from 'src/notifications/notifications.service';
const { getFirestore, Timestamp, FieldValue } = require('firebase-admin/firestore');
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Event } from './schemas/event.schema';
import { Model } from 'mongoose';
import { CreateEventDto } from './dto/create.event.dto';
import { ErrorHandling } from '../utils/error-handling.util';
import { EventInterface } from './interfaces/event.interface';

@Injectable()
export class EventService {
  constructor(
    @InjectModel(Event.name) private eventModel: Model<Event>,
    private notificationsService: NotificationsService
  ) { }

  async create(createEventDto: CreateEventDto): Promise<Event> {
    try {
      const obj: Partial<EventInterface> = {
        ...createEventDto,
        createdAt: new Date(),
        type: 'nuestraboda',
      };

      const createdEvent = new this.eventModel(obj);
      return createdEvent.save();
    } catch (error) {
      ErrorHandling.handleMongoError
    }
  }

  async findAll(): Promise<Event[]> {
    try {
      return this.eventModel.find().exec();
    } catch (error) {
      ErrorHandling.handleMongoError(error);
    }
  }

  async findOne(id: string): Promise<Event> {
    try {
      const event = await this.eventModel.findOne({ id }).exec();

      if (!event) {
        ErrorHandling.throwCustomError('Event not found', HttpStatus.NOT_FOUND);
      }

      return event;
    } catch (error) {
      ErrorHandling.handleMongoError(error);
    }
  }

  async update(id: string, updateEventDto: UpdateEventDto): Promise<Event> {
    try {
      const event = await this.eventModel.findOne({ id });

      if (!event) {
        ErrorHandling.throwCustomError('Event not found', HttpStatus.NOT_FOUND);
      }

      const updatedEvent = await this.eventModel.findOneAndUpdate(
        { id },
        {
          ...updateEventDto,
          updatedAt: new Date()
        },
        { new: true, runValidators: true }
      );

      return updatedEvent;
    } catch (error) {
      ErrorHandling.handleMongoError(error);
    }
  }
}