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

@Controller('api/auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private readonly jwtService: JwtService,
  ) {}

  @Post('register')
  async register(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() registerDto: RegisterDto,
  ) {
    const result = await this.authService.register(registerDto);
    if (result.newUser) {
      const user_id = result.newUser.id;
      const user_ip = req.ip;
      const user_agent = req.headers['user-agent'];
      const ttl = 803;
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
        user: result.newUser,
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
      const user_ip = req.ip;
      const user_agent = req.headers['user-agent'];
      const ttl = 803;
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
        user: user,
        access_token: result.access_token,
      };
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post('refresh')
  async refresh(@Req() req: Request) {
    console.log(req.headers);
    console.log(req.cookies);
    const refresh_token = req.cookies['refresh_token'];
    const user = await this.authService.verifyRefreshToken(refresh_token);
    if (!user) {
      throw new UnauthorizedException();
    }
    const new_access_token = this.jwtService.sign({
      username: user.username,
      sub: user.id,
    });
    console.log(new_access_token);
    return { access_token: new_access_token };
  }

  @UseGuards(JwtAuthGuard)
  @Get('verifyToken')
  @HttpCode(HttpStatus.OK)
  async verifyToken(@Req() req: Request, @getUser() user: User) {
    const request_ip = req.ip;
    const user_agent = req.headers['user-agent'];
    const details = await this.authService.getTokenDetails(user.id);
    const ipMatches = request_ip === details?.stored_ip;
    const userAgentMatches = user_agent === details?.stored_user_agent;
    return {
      username: user.username,
      verified: ipMatches && userAgentMatches,
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
