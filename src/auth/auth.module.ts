import { Module } from '@nestjs/common';
import { UserModule } from './user/user.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PassportModule } from '@nestjs/passport';
import { LocalStrategy } from './local.strategy';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { JwtAuthGuard } from './jwt.auth.guard';
import { LocalAuthGuard } from './local-auth.guard';
import { config } from 'dotenv';
import { UserService } from './user/user.service';
config();

@Module({
  imports: [
    UserModule,
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET_KEY,
      signOptions: { expiresIn: '30m' },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    LocalStrategy,
    LocalAuthGuard,
    JwtAuthGuard,
    UserService,
    JwtService,
  ],
  exports: [JwtAuthGuard],
})
export class AuthModule {}
