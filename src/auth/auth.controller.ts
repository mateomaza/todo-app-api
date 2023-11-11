import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  HttpException,
  HttpStatus,
  Req,
  HttpCode,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './local-auth.guard';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './jwt.auth.guard';

@Controller('api/auth')
export class AuthController {
  constructor(private authService: AuthService) {}

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
  async login(@Req() req: Request, @Body() loginDto: LoginDto) {
    const result = await this.authService.login(loginDto);
    if (req.user) {
      return {
        message: result.message,
        user: req.user,
        access_token: result.access_token,
      };
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('verifyToken')
  @HttpCode(HttpStatus.OK)
  verifyToken(@Req() req: Request) {
    return { username: req.user.username, verified: true };
  }
}
