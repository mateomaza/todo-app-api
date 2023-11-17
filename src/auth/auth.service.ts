import { Injectable } from '@nestjs/common';
import { User } from './user/user.model';
import { UserService } from './user/user.service';
import { JwtService } from '@nestjs/jwt';
import { RedisService } from 'nestjs-redis';
import { Redis } from 'ioredis';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  private redisClient: Redis;
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
  ) {
    this.redisClient = this.redisService.getClient();
  }
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
  async register(user: Partial<User>): Promise<User> {
    const newUser = await this.userService.create(user);
    return newUser;
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
    ip: string,
    user_agent: string,
    ttl: number,
  ): Promise<void> {
    const key = `token_details:${user_id}`;
    const value = { ip, user_agent };
    const stringValue = JSON.stringify(value);

    await this.redisClient.setex(key, ttl, stringValue);
  }
  async getStoredTokenDetails(user_id: string): Promise<any> {
    const key = `token_details:${user_id}`;
    const storedDetailsString = await this.redisClient.get(key);
    const storedDetails = JSON.parse(storedDetailsString);

    return storedDetails
      ? {
          stored_ip: storedDetails.ip,
          stored_user_agent: storedDetails.user_agent,
        }
      : null;
  }
  async verifyRefreshToken(refreshToken: string): Promise<User | null> {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: 'refreshTokenSecret',
      });
      const user = await this.userService.findByUsername(payload.sub);
      return user;
    } catch (error) {
      return null;
    }
  }
}
