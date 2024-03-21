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
import ipRangeCheck from 'ip-range-check';
import useragent from 'useragent';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('auth')
@Controller('api/auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private readonly userService: UserService,
    private readonly auditLogService: AuditLogService,
  ) {}

  @ApiOperation({ summary: 'Register a user' })
  @ApiBody({
    type: RegisterDto,
    description: 'Payload to register a user',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'The user has been successfully created, cookies set',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'User not created because of data inputted',
  })
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
        domain: '.holi.website',
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

  @ApiOperation({ summary: 'Login a user' })
  @ApiBody({
    type: LoginDto,
    description: 'Payload to login a user',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User has logged in, cookies set',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User attempted to log in was not found',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User details were wrong',
  })
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
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        domain: '.holi.website',
      });
      return {
        message: result.message,
        user: user,
        access_token: result.access_token,
      };
    }
  }

  @ApiOperation({ summary: 'Check refresh_token being passed' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Refresh_token was successfully updated',
  })
  @Post('check-refresh')
  @HttpCode(HttpStatus.OK)
  async checkRefreshToken(@Req() req: Request) {
    const refresh_token = req.cookies['refresh_token'];
    const result = await this.authService.checkRefreshToken(refresh_token, req);
    return { verified: result };
  }

  @ApiOperation({ summary: 'Refresh access_token with valid refresh_token' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Token was successfully updated',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'No authorization to refresh the token',
  })
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

  @ApiOperation({ summary: 'Verify session with ip and user_agent' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Session was succesfully verified',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'No authorization to verify session',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('verify-session')
  @HttpCode(HttpStatus.OK)
  async verifySession(
    @Req() req: Request,
    @getUser() user: User,
    @Res({ passthrough: true }) res: Response,
  ) {
    const current_ip = req.ip;
    const current_user_agent = req.headers['user-agent'];
    const details = await this.authService.getTokenDetails(user.sub);
    const ip_allowed = ipRangeCheck(current_ip, details.stored_ip);
    const current_agent_parsed = useragent.parse(current_user_agent);
    const stored_agent_parsed = useragent.parse(details.stored_user_agent);
    const user_agent_allowed =
      current_agent_parsed.os.family === stored_agent_parsed.os.family &&
      current_agent_parsed.browser.family ===
        stored_agent_parsed.browser.family;
    if (!ip_allowed || !user_agent_allowed) {
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
        res.clearCookie('authenticated', {
          domain: '.holi.website',
          path: '/',
        });
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

  @ApiOperation({ summary: 'Logout user' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User successfully logged out, cookies cleared',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'No authorization to log out',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refresh_token = req.cookies['refresh_token'];
    const auth_cookie = req.cookies['authenticated'];
    if (refresh_token && auth_cookie) {
      await this.authService.invalidateToken(refresh_token);
      res.clearCookie('refresh_token');
      res.clearCookie('authenticated', {
        domain: '.holi.website',
        path: '/',
      });
    }
    return { message: 'Logged out successfully' };
  }

  @ApiOperation({
    summary: 'Delete user',
    description:
      'Deletes a user model instance using its MongoDB ObjectId (`_id`). This is an exception to the general use of UUIDs for identifiers in other operations.',
  })
  @ApiParam({
    name: '_id',
    description: 'MongoDB ObjectId of the model instance to delete',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'The user was successfully deleted, cookies cleared',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'The user desired to be deleted was not found',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'No authorization to delete this user',
  })
  @ApiBearerAuth()
  @Delete('users/:_id/delete')
  @UseGuards(JwtAuthGuard)
  async deleteUser(
    @Param('_id') _id: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    const refresh_token = req.cookies['refresh_token'];
    const auth_cookie = req.cookies['authenticated'];
    if (refresh_token && auth_cookie) {
      await this.authService.invalidateToken(refresh_token);
      res.clearCookie('refresh_token');
      res.clearCookie('authenticated', {
        domain: '.holi.website',
        path: '/',
      });
    }
    await this.userService.deleteUser(_id);
    return;
  }
}
