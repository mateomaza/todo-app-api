import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  HttpException,
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

@Controller('api/auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private readonly jwtService: JwtService,
  ) {}

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    const usernameInUse = await this.authService.isUsernameInUse(
      registerDto.username,
    );
    const emailInUse = await this.authService.isEmailInUse(registerDto.email);
    if (usernameInUse) {
      throw new HttpException(
        'Username is already registered',
        HttpStatus.CONFLICT,
      );
    }
    if (emailInUse) {
      throw new HttpException('Email is already in use', HttpStatus.CONFLICT);
    }
    return this.authService.register(registerDto);
  }

  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() loginDto: LoginDto,
  ) {
    const result = await this.authService.login(loginDto);
    if (req.user) {
      const user_id = req.user.id;
      const user_ip = req.ip;
      const user_agent = req.headers['user-agent'];
      const ttl = 3600;
      await this.authService.storeTokenDetails(
        user_id,
        user_ip,
        user_agent,
        ttl,
      );
      res.cookie('refresh_token', result.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });
      return {
        message: result.message,
        user: req.user,
        access_token: result.access_token,
      };
    }
  }

  @Post('refresh')
  async refresh(@Req() req: Request) {
    const refresh_token = req.cookies['refresh_token'];
    const user = await this.authService.verifyRefreshToken(refresh_token);
    if (!user) {
      throw new UnauthorizedException();
    }
    const new_access_token = this.jwtService.sign({
      username: user.username,
      sub: user.id,
    });
    return { access_token: new_access_token };
  }

  @UseGuards(JwtAuthGuard)
  @Get('verifyToken')
  @HttpCode(HttpStatus.OK)
  verifyToken(@Req() req: Request) {
    return { username: req.user.username, verified: true };
  }

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
