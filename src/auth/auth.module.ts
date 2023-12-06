import { Module } from '@nestjs/common';
import { UserModule } from './user/user.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PassportModule } from '@nestjs/passport';
import { LocalStrategy } from './local.strategy';
import { JwtModule } from '@nestjs/jwt';
import { JwtAuthGuard } from './jwt.auth.guard';
import { LocalAuthGuard } from './local-auth.guard';
import { JwtStrategy } from './jwt.strategy';
import { RedisService } from 'src/common/redis.service';
import { AuditLogService } from 'src/audit/audit-log.service';

@Module({
  imports: [
    UserModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({ secret: process.env.JWT_SECRET_KEY }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    LocalStrategy,
    LocalAuthGuard,
    JwtStrategy,
    JwtAuthGuard,
    RedisService,
    AuditLogService,
  ],
  exports: [AuthService, JwtAuthGuard],
})
export class AuthModule {}
