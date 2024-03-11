import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  HttpStatus,
  Req,
  Res,
  HttpCode,
  UnauthorizedException,
  ConflictException,
  Delete,
  Param,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './local-auth.guard';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './jwt.auth.guard';
import { User } from './user/user.model';
import { getUser } from './user/get-user.decorator';
import { UserService } from './user/user.service';
import { AuditLogService } from 'src/audit/audit-log.service';

@Controller('api/auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private readonly userService: UserService,
    private readonly auditLogService: AuditLogService,
  ) {}

  @Post('register')
  async register(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() registerDto: RegisterDto,
  ) {
    const { username, email } = registerDto;
    if (await this.authService.isUsernameInUse(username)) {
      throw new ConflictException('Username is already registered.');
    }
    if (await this.authService.isEmailInUse(email)) {
      throw new ConflictException('Email is already in use.');
    }
    const result = await this.authService.register(registerDto);
    const newUser = result.newUser;
    if (newUser) {
      const user_id = newUser.id;
      const user_ip = req.ip || req.headers['x-forwarded-for'];
      const user_agent = req.headers['user-agent'];
      const ttl = 899;
      await this.authService.storeTokenDetails(
        user_id,
        user_ip,
        user_agent,
        ttl,
      );
      res.cookie('refresh_token', result.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });
      res.cookie('authenticated', 'true', {
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });
      return {
        message: result.message,
        user: newUser,
        access_token: result.access_token,
      };
    } else {
      return {
        message: result.message,
        statusCode: HttpStatus.CONFLICT,
      };
    }
  }

  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() loginDto: LoginDto,
    @getUser() user: User,
  ) {
    const result = await this.authService.login(loginDto);
    if (user) {
      const user_id = req.user.id;
      const user_ip = req.ip || req.headers['x-forwarded-for'];
      const user_agent = req.headers['user-agent'];
      const ttl = 899;
      await this.authService.storeTokenDetails(
        user_id,
        user_ip,
        user_agent,
        ttl,
      );
      res.cookie('refresh_token', result.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });
      res.cookie('authenticated', 'true', {
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });
      return {
        message: result.message,
        user: user,
        access_token: result.access_token,
      };
    }
  }

  @Post('check-refresh')
  @HttpCode(HttpStatus.OK)
  async checkRefreshToken(@Req() req: Request) {
    const refresh_token = req.cookies['refresh_token'];
    const result = await this.authService.checkRefreshToken(refresh_token, req);
    return { verified: result };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.CREATED)
  async refreshToken(@Req() req: Request) {
    const refresh_token = req.cookies['refresh_token'];
    try {
      const user = await this.authService.getUserFromToken(refresh_token);
      const new_access_token =
        await this.authService.generateNewAccessToken(user);
      return { access_token: new_access_token, user };
    } catch (err) {
      throw new UnauthorizedException('Failed to refresh token');
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('verify-session')
  @HttpCode(HttpStatus.OK)
  async verifySession(
    @Req() req: Request,
    @getUser() user: User,
    @Res({ passthrough: true }) res: Response,
  ) {
    const current_ip = req.ip || req.headers['x-forwarded-for'];
    const current_user_agent = req.headers['user-agent'];
    const details = await this.authService.getTokenDetails(user.sub);
    if (
      current_ip !== details.stored_ip ||
      current_user_agent !== details.stored_user_agent
    ) {
      this.auditLogService.logEntry({
        level: 'warn',
        action: 'Anomaly Detected',
        details: `IP or device change detected for User ${user.username}.`,
      });
      const refresh_token = req.cookies['refresh_token'];
      const auth_cookie = req.cookies['authenticated'];
      if (refresh_token && auth_cookie) {
        await this.authService.invalidateToken(refresh_token);
        res.clearCookie('refresh_token');
        res.clearCookie('authenticated');
      }
      return {
        message:
          'Session invalidated due to security concerns. Please log in again.',
      };
    }
    return {
      verified: true,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refresh_token = req.cookies['refresh_token'];
    const auth_cookie = req.cookies['authenticated'];
    if (refresh_token && auth_cookie) {
      await this.authService.invalidateToken(refresh_token);
      res.clearCookie('refresh_token');
      res.clearCookie('authenticated');
    }
    return { message: 'Logged out successfully' };
  }

  /**
   * Deletes a user based on MongoDB's _id.
   * The `id` parameter should be the string representation of MongoDB's ObjectId.
   * The name that represents this expression in the frontend is 'UserObjectId'
   *
   * @param id The user's _id as a string.
   */

  @Delete('users/:id/delete')
  @UseGuards(JwtAuthGuard)
  async deleteUser(
    @Param('id') id: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    const refresh_token = req.cookies['refresh_token'];
    const auth_cookie = req.cookies['authenticated'];
    if (refresh_token && auth_cookie) {
      await this.authService.invalidateToken(refresh_token);
      res.clearCookie('refresh_token');
      res.clearCookie('authenticated');
    }
    await this.userService.deleteUser(id);
    return;
  }
}
