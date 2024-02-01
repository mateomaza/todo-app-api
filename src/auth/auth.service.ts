import { Injectable, UnauthorizedException } from '@nestjs/common';
import { User } from './user/user.model';
import { UserService } from './user/user.service';
import { JwtService } from '@nestjs/jwt';
import { RedisService } from 'src/common/redis.service';
import { LoginDto } from './dto/login.dto';
import { AuditLogService } from 'src/audit/audit-log.service';
import { Request } from 'express';

const MAX_LOGIN_ATTEMPTS = 7;

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
    private readonly auditLogService: AuditLogService,
  ) {}
  async login({ username }: LoginDto): Promise<{
    message: string;
    access_token: string;
    refresh_token: string;
  }> {
    const user = await this.userService.findOneByUsername(username);
    const payload = { username: user.username, sub: user.id };
    const access_token = this.jwtService.sign(payload, { expiresIn: '15m' });
    const refresh_token = this.jwtService.sign(payload, { expiresIn: '7d' });
    return { message: 'Login successful', access_token, refresh_token };
  }
  async incrementFailedLoginAttempts(username: string): Promise<void> {
    const key = `failedLoginAttempts:${username}`;
    await this.redisService.increment(key);
    await this.redisService.expire(key, 3600);
    const count = parseInt(await this.redisService.get(key), 10);
    if (count > MAX_LOGIN_ATTEMPTS) {
      this.auditLogService.logEntry({
        level: 'warn',
        action: 'Failed Login Attempt',
        details: `Multiple failed login attempts for user ${username}.`,
      });
    }
  }
  async resetFailedLoginAttempts(username: string) {
    const key = `failedLoginAttempts:${username}`;
    await this.redisService.del(key);
  }
  async register(user: Partial<User>): Promise<{
    message: string;
    newUser: User;
    access_token: string;
    refresh_token: string;
  }> {
    const newUser = await this.userService.create(user);
    const payload = {
      username: newUser.username,
      sub: newUser.id,
    };
    const access_token = this.jwtService.sign(payload, { expiresIn: '15m' });
    const refresh_token = this.jwtService.sign(payload, { expiresIn: '7d' });
    return {
      message: 'Registration successful',
      newUser,
      access_token,
      refresh_token,
    };
  }
  async isUsernameInUse(username: string): Promise<boolean> {
    const existingUser = await this.userService.findOneByUsername(username);
    return !!existingUser;
  }
  async isEmailInUse(email: string): Promise<boolean> {
    const existingUser = await this.userService.findOneByEmail(email);
    return !!existingUser;
  }
  async storeTokenDetails(
    user_id: string,
    ip: string | string[],
    user_agent: string,
    ttl: number,
  ): Promise<void> {
    const key = `token_details:${user_id}`;
    const value = JSON.stringify({ ip, user_agent });
    await this.redisService.setex(key, ttl, value);
  }
  async getTokenDetails(user_id: string): Promise<any> {
    const key = `token_details:${user_id}`;
    const storedDetailsString = await this.redisService.get(key);
    try {
      const storedDetails = JSON.parse(storedDetailsString);
      return storedDetails
        ? {
            stored_ip: storedDetails.ip,
            stored_user_agent: storedDetails.user_agent,
          }
        : null;
    } catch (err) {
      return null;
    }
  }
  async checkRefreshToken(
    refresh_token: string,
    req: Request,
  ): Promise<{ result: boolean }> {
    const isBlocked = await this.redisService.get(`blocklist:${refresh_token}`);
    if (isBlocked) {
      const ipAddress = req.ip || req.headers['x-forwarded-for'];
      const userAgent = req.headers['user-agent'];
      const timestamp = new Date().toISOString();
      this.auditLogService.logEntry({
        level: 'warn',
        action: 'Blocked Token Attempt',
        details: `Attempt to use a revoked token from IP: ${ipAddress} (User Agent: ${userAgent}) at ${timestamp}.`,
      });
      return null;
    }
    try {
      const payload = this.jwtService.verify(refresh_token);
      const user = await this.userService.findOneByUsername(payload.username);
      if (!user) {
        this.auditLogService.logEntry({
          level: 'warn',
          action: 'Blocked Token Attempt',
          details: 'Attempt to check the refresh token with no valid user.',
        });
        return null;
      }
      return { result: true };
    } catch (err) {
      return null;
    }
  }
  async getUserFromToken(refresh_token: string): Promise<any> {
    try {
      const decoded = this.jwtService.verify(refresh_token);
      const user = await this.userService.findOneByUsername(decoded.username);
      return user;
    } catch (err) {
      throw new UnauthorizedException('Invalid token');
    }
  }
  async generateNewAccessToken(userDto: any): Promise<string> {
    try {
      const payload = { username: userDto.username, sub: userDto.id };
      return this.jwtService.sign(payload, { expiresIn: '15m' });
    } catch (err) {
      throw new UnauthorizedException('Failed to generate token');
    }
  }
  async invalidateToken(refresh_token: string): Promise<void> {
    try {
      const payload = this.jwtService.verify(refresh_token);
      const expirationTime = payload.exp;
      const currentTime = Math.floor(Date.now() / 1000);
      const remainingTime = expirationTime - currentTime;

      if (remainingTime > 0) {
        await this.redisService.setex(
          `blocklist:${refresh_token}`,
          remainingTime,
          'blocked',
        );
      }
    } catch (err) {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
