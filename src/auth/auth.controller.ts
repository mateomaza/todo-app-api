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
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './local-auth.guard';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtService } from '@nestjs/jwt';
import { JwtAuthGuard } from './jwt.auth.guard';
import { User } from './user/user.model';
import { getUser } from './user/get-user.decorator';
import { AuditLogService } from 'src/audit/audit-log.service';
import { UserResponseDto } from './dto/user-response.dto';

@Controller('api/auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private readonly jwtService: JwtService,
    private readonly auditLogService: AuditLogService,
  ) {}

  @Post('register')
  async register(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() registerDto: RegisterDto,
  ) {
    const result = await this.authService.register(registerDto);
    if (result.newUser) {
      const userResponse = new UserResponseDto(result.newUser);
      const user_id = result.newUser.id;
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
      return {
        message: result.message,
        user: userResponse,
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
      const userResponse = new UserResponseDto(user);
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
      return {
        message: result.message,
        user: userResponse,
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
    const refreshToken = req.cookies['refresh_token'];
    try {
      const decoded = this.jwtService.verify(refreshToken);
      const new_access_token = this.jwtService.sign({
        username: decoded.username,
        sub: decoded.sub,
      });
      return { access_token: new_access_token };
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
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
      if (refresh_token) {
        await this.authService.invalidateToken(refresh_token);
        res.clearCookie('refresh_token');
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
    if (refresh_token) {
      await this.authService.invalidateToken(refresh_token);
      res.clearCookie('refresh_token');
    }
    return { message: 'Logged out successfully' };
  }
}
