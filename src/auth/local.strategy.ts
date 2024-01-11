import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { Injectable } from '@nestjs/common';
import { UserService } from './user/user.service';
import { AuthService } from './auth.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly userService: UserService,
    private authService: AuthService,
  ) {
    super({
      usernameField: 'username',
      passwordField: 'password',
    });
  }
  async validate(username: string, password: string): Promise<any> {
    const user = await this.userService.findOneByUsername(username);
    if (!user) {
      await this.authService.incrementFailedLoginAttempts(username);
      return null;
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      await this.authService.incrementFailedLoginAttempts(username);
      return null;
    }
    await this.authService.resetFailedLoginAttempts(username);
    return user;
  }
}
