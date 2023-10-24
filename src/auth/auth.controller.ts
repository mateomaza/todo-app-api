import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
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
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }
}
