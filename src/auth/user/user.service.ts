import { Injectable } from '@nestjs/common';
import { PassportLocalModel } from 'mongoose';
import { UserModel } from './user.model';

@Injectable()
export class UserService {
  constructor() {
    this.userModel = UserModel;
  }

  async create(user: Partial<UserModel>): Promise<UserModel> {
    return this.userModel.create(user);
  }

  async findOneByUsername(username: string): Promise<UserModel> {
    return this.userModel.findOne({ username }).exec();
  }
}
