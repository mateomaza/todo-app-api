import { Module, ValidationPipe, Global } from '@nestjs/common';
import { RedisModule } from './common/redis.module';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { APP_PIPE, APP_INTERCEPTOR } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { TaskModule } from './task/task.module';
import { AuthController } from './auth/auth.controller';
import { TaskController } from './task/task.controller';
import { AuditLogModule } from './audit/audit-log.module';
import { config } from 'dotenv';
import { AuditLogInterceptor } from './audit/audit-log.interceptor';
import { JwtService } from '@nestjs/jwt';
import { UserModule } from './auth/user/user.module';
import { EventEmitterModule } from '@nestjs/event-emitter';

config();

@Global()
@Module({
  imports: [
    MongooseModule.forRootAsync({
      useFactory: () => ({
        uri:
          process.env.DB_ENV === 'test'
            ? process.env.MONGO_TEST_URI
            : process.env.MONGO_URI,
      }),
    }),
    RedisModule,
    AuthModule,
    TaskModule,
    AuditLogModule,
    UserModule,
    EventEmitterModule.forRoot(),
  ],
  controllers: [AppController, AuthController, TaskController],
  providers: [
    {
      provide: APP_PIPE,
      useClass: ValidationPipe,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditLogInterceptor,
    },
    AppService,
    JwtService,
  ],
})
export class AppModule {}
