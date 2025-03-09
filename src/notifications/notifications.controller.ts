import { Controller, Get, Post, Body, Patch, Param, Delete, HttpException, Version } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { SubscribeToTopic } from './dto/subscribe-to-topic.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) { }


  @Post('/subscribe-to-topic')
  @Version('1')
  subscribeToTopic(@Body() subscribeToTopic: SubscribeToTopic) {
    try {
      return this.notificationsService.subscribeToTopic(subscribeToTopic);
    } catch (error) {
      throw new HttpException(error.message, 500);
    }
  }
  
  @Post('/unsubscribe-to-topic')
  @Version('1')
  unsubscribeToTopic(@Body() unsubscribeToTopic: SubscribeToTopic) {
    try {
      return this.notificationsService.unsubscribeToTopic(unsubscribeToTopic);
    } catch (error) {
      throw new HttpException(error.message, 500);
    }
  }

  // @Get()
  // findAll() {
  //   return this.notificationsService.findAll();
  // }

  // @Get(':id')
  // findOne(@Param('id') id: string) {
  //   return this.notificationsService.findOne(+id);
  // }

  // @Patch(':id')
  // update(@Param('id') id: string, @Body() updateNotificationDto: UpdateNotificationDto) {
  //   return this.notificationsService.update(+id, updateNotificationDto);
  // }

  // @Delete(':id')
  // remove(@Param('id') id: string) {
  //   return this.notificationsService.remove(+id);
  // }
}
