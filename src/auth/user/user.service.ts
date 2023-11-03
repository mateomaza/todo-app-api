import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from './user.model';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
  ) {}

  async create(user: Partial<User>): Promise<User> {
    return this.userModel.create(user);
  }
  async findOneByUsername(username: string): Promise<User> {
    return this.userModel.findOne({ username }).exec();
  }
  async findOneByEmail(email: string): Promise<User> {
    return this.userModel.findOne({ email }).exec();
  }
}
