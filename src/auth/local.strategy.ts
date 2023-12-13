import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { Injectable } from '@nestjs/common';
import { UserService } from './user/user.service';
import { AuthService } from './auth.service';

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
    if (user.password !== password) {
      await this.authService.incrementFailedLoginAttempts(username);
      return null;
    }
    await this.authService.resetFailedLoginAttempts(username);
    return user;
  }
}
