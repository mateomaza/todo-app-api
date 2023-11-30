import { Module, ValidationPipe } from '@nestjs/common';
import { RedisModule } from './common/redis.module';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { APP_PIPE } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { TaskModule } from './task/task.module';
import { AuthController } from './auth/auth.controller';
import { TaskController } from './task/task.controller';
import { config } from 'dotenv';

config();

@Module({
  imports: [
    RedisModule,
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
