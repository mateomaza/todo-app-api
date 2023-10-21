import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PassportModule } from '@nestjs/passport';
import { LocalStrategy } from './local.strategy';
import { AuthController } from './auth.controller';
import { UserService } from './user/user.service';
import { UserSchema } from './user/user.model';

@Module({
  imports: [
    PassportModule,
    MongooseModule.forFeature([
      {
        name: 'User',
        schema: UserSchema,
      },
    ]),
  ],
  controllers: [AuthController],
  providers: [LocalStrategy, UserService],
  exports: [UserService],
})
export class AuthModule {}
