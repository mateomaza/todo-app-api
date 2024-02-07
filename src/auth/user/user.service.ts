import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from './user.model';
import * as bcrypt from 'bcrypt';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
    private eventEmitter: EventEmitter2,
  ) {}

  async create(user: Partial<User>): Promise<User> {
    const hashedPassword = await bcrypt.hash(user.password, 10);
    const newUser = { ...user, password: hashedPassword };
    return this.userModel.create(newUser);
  }
  async findOneByUsername(username: string): Promise<User> {
    return this.userModel.findOne({ username }).exec();
  }
  async findOneByEmail(email: string): Promise<User> {
    return this.userModel.findOne({ email }).exec();
  }
  async deleteUser(id: string): Promise<any> {
    const deletedUser = await this.userModel
      .findOneAndRemove({ id: id })
      .exec();
    if (!deletedUser) {
      throw new NotFoundException('User not found');
    }
    this.eventEmitter.emit('user.deleted', { userId: id });
    return deletedUser;
  }
}
