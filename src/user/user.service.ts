import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './schemas/user.schema';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
  ) { }

  async create(createUserDto: CreateUserDto): Promise<User> {
    try {
      // Check if user already exists
      const existingUser = await this.userModel.findOne({ id: createUserDto.id }).exec();
      if (existingUser) {
        throw new BadRequestException('User with this ID already exists');
      }
      const createdUser = new this.userModel(createUserDto);
      return await createdUser.save();
    } catch (error) {
      if (error.name === 'ValidationError') {
        throw new BadRequestException('Invalid user data: ' + error.message);
      }
      if (error.code === 11000) {
        throw new BadRequestException('User with this data already exists');
      }
      throw new InternalServerErrorException('Error creating user');
    }
  }

  async findAll(): Promise<User[]> {
    try {
      return await this.userModel.find().exec();
    } catch (error) {
      throw new InternalServerErrorException('Error fetching users');
    }
  }

  async findOne(id: string): Promise<User> {
    try {
      const user = await this.userModel.findOne({ id }).exec();
      if (!user) {
        throw new NotFoundException(`User with id ${id} not found`);
      }
      return user;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      if (error.name === 'CastError') {
        throw new BadRequestException(`Invalid id format: ${id}`);
      }
      throw new InternalServerErrorException('Error finding user');
    }
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    try {
      const updatedUser = await this.userModel.findOneAndUpdate({ id }, updateUserDto, { new: true }).exec();
      if (!updatedUser) {
        throw new NotFoundException(`User with id ${id} not found`);
      }
      return updatedUser;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      if (error.name === 'CastError') {
        throw new BadRequestException(`Invalid id format: ${id}`);
      }
      if (error.name === 'ValidationError') {
        throw new BadRequestException('Invalid user data: ' + error.message);
      }
      throw new InternalServerErrorException('Error updating user');
    }
  }

  async updateLastSeen(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    try {
      const updatedUser = await this.userModel.findOneAndUpdate({ id }, updateUserDto, { new: true }).exec();
      if (!updatedUser) {
        const createUserDto: CreateUserDto = {
          id,
          createdAt: updateUserDto.createdAt,
          lastSeenAt: updateUserDto.lastSeenAt,
          notificationTokens: updateUserDto.notificationTokens,
          email: updateUserDto.email,
          name: updateUserDto.name,
          phone: updateUserDto.phone,
          photoURL: updateUserDto.photoURL,
          lastSignInAt: updateUserDto.lastSignInAt,
          updatedAt: updateUserDto.updatedAt,
          emailConfirmedAt: updateUserDto.emailConfirmedAt,
          phoneConfirmedAt: updateUserDto.phoneConfirmedAt,
        }
        return await this.create(createUserDto);
      }
      return updatedUser;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      if (error.name === 'CastError') {
        throw new BadRequestException(`Invalid id format: ${id}`);
      }
      if (error.name === 'ValidationError') {
        throw new BadRequestException('Invalid user data: ' + error.message);
      }
      throw new InternalServerErrorException('Error updating user');
    }
  }

  async remove(id: string): Promise<User> {
    try {
      const deletedUser = await this.userModel.findOneAndDelete({ id }).exec();
      if (!deletedUser) {
        throw new NotFoundException(`User with id ${id} not found`);
      }
      return deletedUser;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      if (error.name === 'CastError') {
        throw new BadRequestException(`Invalid id format: ${id}`);
      }
      throw new InternalServerErrorException('Error deleting user');
    }
  }
}
