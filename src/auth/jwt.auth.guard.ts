import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard, IAuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') implements IAuthGuard {
  handleRequest(err: Error, user: any) {
    if (err || !user) {
      throw new UnauthorizedException('No session logged in.');
    }
    return user;
  }
}
