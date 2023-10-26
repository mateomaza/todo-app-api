import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpException,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './local-auth.guard';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

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
        'Username is already in use',
        HttpStatus.CONFLICT,
      );
    }
    if (emailInUse) {
      throw new HttpException(
        'Email is already registered',
        HttpStatus.CONFLICT,
      );
    }
    return this.authService.register(registerDto);
  }

  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@Req() req: Request, @Body() loginDto: LoginDto) {
    const result = await this.authService.login(loginDto);
    if (req.user) {
      return {
        message: 'Login successful',
        user: req.user,
        jwtKey: result,
        statusCode: HttpStatus.OK,
      };
    } else {
      return {
        message: 'Login failed',
        statusCode: HttpStatus.UNAUTHORIZED,
      };
    }
  }
}
