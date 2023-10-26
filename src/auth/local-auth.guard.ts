import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';

@Injectable()
export class LocalAuthGuard extends AuthGuard('local') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }
  handleRequest(err: Error, user: any, context: ExecutionContext) {
    if (err || !user) {
      throw err || new UnauthorizedException('Invalid credentials');
    }
    const request = context.switchToHttp().getRequest<Request>();
    request.user = user;
    return user;
  }
}
