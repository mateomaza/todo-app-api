import { Module, ValidationPipe } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
//import { UserModule } from './auth/user/user.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { APP_PIPE } from '@nestjs/core';
import { AuthService } from './auth/auth.service';
import { AuthModule } from './auth/auth.module';
import { TaskModule } from './todo/task/task.module';
import { TaskService } from './todo/task/task.service';
import { AuthController } from './auth/auth.controller';
import { TaskController } from './todo/task/task.controller';
import { UserService } from './auth/user/user.service';
import { config } from 'dotenv';
config();
@Module({
  imports: [
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
    AuthService,
    TaskService,
    UserService,
  ],
})
export class AppModule {}
