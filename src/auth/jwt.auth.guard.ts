import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard, IAuthGuard } from '@nestjs/passport';
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') implements IAuthGuard {
  handleRequest(err: any, user: any, info: Error) {
    if (err || !user) {
      throw err || new UnauthorizedException(info?.message);
    }
    return user;
  }
}
