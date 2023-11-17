import { Module, ValidationPipe } from '@nestjs/common';
import { RedisModule } from 'nestjs-redis';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { APP_PIPE } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { TaskModule } from './todo/task/task.module';
import { AuthController } from './auth/auth.controller';
import { TaskController } from './todo/task/task.controller';
import { config } from 'dotenv';
config();

@Module({
  imports: [
    RedisModule.forRootAsync({
      useFactory: () => ({
        host: process.env.REDIS_HOST,
        port: +process.env.REDIS_PORT,
        password: process.env.REDIS_PASSWORD,
        tls:
          process.env.REDIS_TLS === 'true'
            ? { rejectUnauthorized: false }
            : undefined,
      }),
    }),
    MongooseModule.forRoot(process.env.MONGO_URI),
    AuthModule,
    TaskModule,
  ],
  controllers: [AppController, AuthController, TaskController],
  providers: [
    {
      provide: APP_PIPE,
      useClass: ValidationPipe,
    },
    AppService,
  ],
})
export class AppModule {}
