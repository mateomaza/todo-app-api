import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { config } from 'dotenv';
config();

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly client: Redis;

  constructor() {
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
    }
  }

  get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  setex(key: string, seconds: number, value: string): Promise<string> {
    return this.client.setex(key, seconds, value);
  }

  getClient(): Redis {
    return this.client;
  }

  onModuleDestroy() {
    if (this.client && this.client.status === 'ready') {
      this.client.quit();
    }
  }
}
