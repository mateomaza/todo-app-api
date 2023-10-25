import { Model } from 'mongoose';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User } from './user/user.model';
import { UserService } from './user/user.service';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel('User') private readonly userModel: Model<User>,
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
  ) {}
  async login({ username, password }: LoginDto) {
    const user = await this.userService.findOneByUsername(username);
    if (!user) {
      return { success: false, message: 'User not found' };
    }
    if (!(await bcrypt.compare(password, user.password))) {
      return { success: false, message: 'Incorrect password' };
    }
    const payload = { username: user.username, sub: user.id };
    const access_token = this.jwtService.sign(payload);
    return { success: true, access_token };
  }
  async register(user: Partial<User>) {
    const newUser = await this.userService.create(user);
    return newUser;
  }
  async isUsernameInUse(username: string): Promise<boolean> {
    const existingUser = await this.userService.findOneByUsername(username);
    return !!existingUser;
  }
  async isEmailInUse(email: string): Promise<boolean> {
    const existingUser = await this.userService.findOneByEmail(email);
    return !!existingUser;
  }
}
