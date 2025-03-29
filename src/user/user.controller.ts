import { Controller, Get, Post, Body, Patch, Param, Delete, Version } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) { }

  @Post()
  @Version('1')
  async create(@Body() createUserDto: CreateUserDto) {
    return await this.userService.create(createUserDto);
  }

  @Get()
  @Version('1')
  async findAll() {
    return await this.userService.findAll();
  }

  @Get(':id')
  @Version('1')
  async findOne(@Param('id') id: string) {
    return await this.userService.findOne(id);
  }

  @Patch(':id')
  @Version('1')
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return await this.userService.update(id, updateUserDto);
  }
  
  @Patch('/last_seen/:id')
  @Version('1')
  async updateLastSeen(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return await this.userService.updateLastSeen(id, updateUserDto);
  }

  @Delete(':id')
  @Version('1')
  async remove(@Param('id') id: string) {
    return  await this.userService.remove(id);
  }
}
