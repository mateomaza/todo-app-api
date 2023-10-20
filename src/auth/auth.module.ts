import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt'
import { LocalStrategy } from './local.strategy';
import { UserService } from './user/user.service';

@Module({
  imports: [
    PassportModule,
    // Other modules
  ],
  providers: [LocalStrategy, UserService],
  // Other providers and controllers
})
export class AuthModule {}
