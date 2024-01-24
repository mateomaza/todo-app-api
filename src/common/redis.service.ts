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

  async get(key: string): Promise<string | null> {
    if (!this.client) {
      this.logger.warn('Redis client is not initialized');
      return Promise.reject(new Error('Redis client is not initialized'));
    }
    try {
      return await this.client.get(key);
    } catch (error) {
      this.logger.error('Error in Redis get operation', error);
      return Promise.reject(error);
    }
  }

  setex(key: string, seconds: number, value: string): Promise<string> {
    if (!this.client) {
      this.logger.warn('Redis client is not initialized');
      return Promise.reject(new Error('Redis client is not initialized'));
    }
    try {
      return this.client.setex(key, seconds, value);
    } catch (error) {
      this.logger.error('Error in Redis setex operation', error);
      return Promise.reject(error);
    }
  }

  async increment(key: string): Promise<number> {
    if (!this.client) {
      this.logger.warn('Redis client is not initialized');
      return Promise.reject(new Error('Redis client is not initialized'));
    }
    try {
      return await this.client.incr(key);
    } catch (error) {
      this.logger.error('Error in Redis increment operation', error);
      return Promise.reject(error);
    }
  }

  async expire(key: string, seconds: number): Promise<void> {
    if (!this.client) {
      this.logger.warn('Redis client is not initialized');
      return Promise.reject(new Error('Redis client is not initialized'));
    }
    try {
      await this.client.expire(key, seconds);
    } catch (error) {
      this.logger.error('Error in Redis expire operation', error);
      return Promise.reject(error);
    }
  }

  async del(key: string): Promise<void> {
    if (!this.client) {
      this.logger.warn('Redis client is not initialized');
      return Promise.reject(new Error('Redis client is not initialized'));
    }
    try {
      await this.client.del(key);
    } catch (error) {
      this.logger.error('Error in Redis del operation', error);
      return Promise.reject(error);
    }
  }

  getClient(): Redis {
    if (!this.client) {
      this.logger.warn('Redis client is not initialized');
      return null;
    }
    try {
      return this.client;
    } catch (error) {
      this.logger.error('Error in Redis getClient operation', error);
    }
  }

  onModuleDestroy() {
    if (this.client && this.client.status === 'ready') {
      this.client.quit();
    }
  }
}
