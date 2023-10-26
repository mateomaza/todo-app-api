import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UserModule } from './user/user.module';
import { UserSchema } from './user/user.model';
import { UserService } from './user/user.service';
import { MongooseModule } from '@nestjs/mongoose';
import { PassportModule } from '@nestjs/passport';
import { LocalStrategy } from './local.strategy';
import { JwtModule } from '@nestjs/jwt';
import { JwtAuthGuard } from './jwt.auth.guard';
import { randomBytes } from 'crypto';

const secretKey = randomBytes(32).toString('hex');

@Module({
  imports: [
    UserModule,
    PassportModule,
    MongooseModule.forFeature([
      {
        name: 'User',
        schema: UserSchema,
      },
    ]),
    JwtModule.register({
      secret: secretKey,
      signOptions: { expiresIn: '30m' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, UserService, LocalStrategy],
  exports: [JwtAuthGuard],
})
export class AuthModule {}
