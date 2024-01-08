import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { config } from 'dotenv';

config();

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly client: Redis | undefined;
  private readonly logger = new Logger(RedisService.name);

  constructor() {
    try {
      if (process.env.NODE_ENV !== 'test') {
        this.client = new Redis({
          host: process.env.REDIS_HOST,
          port: +process.env.REDIS_PORT,
          password: process.env.REDIS_PASSWORD,
          tls:
            process.env.REDIS_TLS === 'true'
              ? { rejectUnauthorized: false }
              : undefined,
        });
        this.client.on('connect', () => {
          this.logger.log('Connected to Redis');
        });
        this.client.on('error', (err) => {
          this.logger.error(`Redis error: ${err.message}`);
        });
      }
    } catch (error) {
      this.logger.error('Failed to initialize Redis client', error);
    }
  }

  get(key: string): Promise<string | null> {
    if (!this.client) {
      this.logger.warn('Redis client is not initialized');
      return null;
    }
    return this.client.get(key);
  }

  setex(key: string, seconds: number, value: string): Promise<string> {
    if (!this.client) {
      this.logger.warn('Redis client is not initialized');
      return null;
    }
    return this.client.setex(key, seconds, value);
  }

  async increment(key: string): Promise<number> {
    if (!this.client) {
      this.logger.warn('Redis client is not initialized');
      return null;
    }
    return await this.client.incr(key);
  }

  async expire(key: string, seconds: number): Promise<void> {
    if (!this.client) {
      this.logger.warn('Redis client is not initialized');
      return null;
    }
    await this.client.expire(key, seconds);
  }

  async del(key: string): Promise<void> {
    if (!this.client) {
      this.logger.warn('Redis client is not initialized');
      return null;
    }
    await this.client.del(key);
  }

  getClient(): Redis {
    if (!this.client) {
      this.logger.warn('Redis client is not initialized');
      return null;
    }
    return this.client;
  }

  onModuleDestroy() {
    if (this.client && this.client.status === 'ready') {
      this.client.quit();
    }
  }
}
