import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { AttendantService } from './attendant.service';
import { CreateAttendantDto } from './dto/create-attendant.dto';
import { UpdateAttendantDto } from './dto/update-attendant.dto';

@Controller('attendant')
export class AttendantController {
  constructor(private readonly attendantService: AttendantService) {}

  @Post()
  create(@Body() createAttendantDto: CreateAttendantDto) {
    return this.attendantService.create(createAttendantDto);
  }

  @Get()
  findAll() {
    return this.attendantService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.attendantService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateAttendantDto: UpdateAttendantDto) {
    return this.attendantService.update(+id, updateAttendantDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.attendantService.remove(+id);
  }
}
