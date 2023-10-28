import { Module, ValidationPipe } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { APP_PIPE } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { TaskModule } from './todo/task/task.module';
import { AuthController } from './auth/auth.controller';
import { TaskController } from './todo/task/task.controller';
import { config } from 'dotenv';
import * as fs from 'fs';
import * as crypto from 'crypto';
config();

const secretKeyVariable = 'JWT_SECRET_KEY';
const secretKey = process.env[secretKeyVariable];
if (!secretKey) {
  const newSecretKey = crypto.randomBytes(64).toString('hex');
  process.env[secretKeyVariable] = newSecretKey;
  fs.writeFileSync('.env', `${secretKeyVariable}=${newSecretKey}\n`, {
    flag: 'a',
  });
}
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
  ],
})
export class AppModule {}
