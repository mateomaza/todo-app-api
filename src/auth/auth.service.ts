import { Injectable } from '@nestjs/common';
import { User } from './user/user.model';
import { UserService } from './user/user.service';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
  ) {}
  async login({
    username,
  }: LoginDto): Promise<{ message: string; access_token: string }> {
    const user = await this.userService.findOneByUsername(username);
    const payload = { username: user.username, sub: user.id };
    const access_token = this.jwtService.sign(payload);
    return { message: 'Login successful', access_token };
  }
  async register(user: Partial<User>): Promise<User> {
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
