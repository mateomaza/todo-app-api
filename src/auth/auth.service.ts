import { Model } from 'mongoose';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User } from './user/user.model';
import { UserService } from './user/user.service';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel('User') private readonly userModel: Model<User>,
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
  ) {}
  async register(user: Partial<User>) {
    const existingUser = await this.userService.findOneByUsername(
      user.username,
    );
    if (existingUser) {
      throw new Error('User already exists');
    }
    const newUser = await this.userService.create(user);
    return newUser;
  }
  async isEmailInUse(email: string): Promise<boolean> {
    const existingUser = await this.userModel.findOne({ email }).exec();
    return !!existingUser;
  }
  async login(user: Partial<User>) {
    const payload = { username: user.username, sub: user.id };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
