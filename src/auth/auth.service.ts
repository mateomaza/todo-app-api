import { Model } from 'mongoose';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { UserService } from './user/user.service';
import { UserModel } from './user/user.model';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel('User') private readonly userModel: Model<UserModel>,
  ) {}

  async register(user: Partial<UserModel>) {
    const existingUser = await this.userService.findOneByUsername(
      user.username,
    );
    if (existingUser) {
      throw new Error('User already exists');
    }
    const newUser = await this.userService.create(user);
    return newUser;
  }

  async login(user: UserModel) {
    const payload = { username: user.username, sub: user._id };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
