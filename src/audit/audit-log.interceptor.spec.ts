import request from 'supertest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus, Module } from '@nestjs/common';
import { AuditLogInterceptor } from './audit-log.interceptor';
import { AuditLogService } from './audit-log.service';
import { AuditLog, AuditLogSchema } from './audit-log.model';
import { MongooseModule } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { AuthController } from 'src/auth/auth.controller';
import { AuthService } from 'src/auth/auth.service';
import { JwtAuthGuard } from 'src/auth/jwt.auth.guard';
import { JwtService } from '@nestjs/jwt';
import { AuditLogModule } from './audit-log.module';
import { User } from 'src/auth/user/user.model';
import { v4 as uuidv4 } from 'uuid';
import { APP_INTERCEPTOR } from '@nestjs/core';

@Module({
  imports: [AuditLogModule],
})
class TestModule {}

describe('AuditLogMiddleware', () => {
  let app: INestApplication;
  let authService: jest.Mocked<AuthService>;
  let mongoMemoryServer: MongoMemoryServer;

  const mockAuditLogService: Partial<AuditLogService> = {
    logEntry: jest.fn(),
  };

  const mockCreatedUser: Partial<User> = {
    id: uuidv4(),
    username: 'new_user',
    email: 'new_email@example.com',
    createdAt: new Date(),
  };

  beforeEach(async () => {
    mongoMemoryServer = await MongoMemoryServer.create();
    const mockAuthService: Partial<jest.Mocked<AuthService>> = {
      register: jest.fn(),
      login: jest.fn(),
      isUsernameInUse: jest.fn(),
      isEmailInUse: jest.fn(),
      storeTokenDetails: jest.fn(),
      getTokenDetails: jest.fn(),
      verifyRefreshToken: jest.fn(),
      invalidateToken: jest.fn(),
    };
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        TestModule,
        MongooseModule.forRootAsync({
          useFactory: async () => ({
            uri: mongoMemoryServer.getUri(),
          }),
        }),
        MongooseModule.forFeature([
          { name: AuditLog.name, schema: AuditLogSchema },
        ]),
      ],
      controllers: [AuthController],
      providers: [
        {
          provide: APP_INTERCEPTOR,
          useValue: new AuditLogInterceptor(
            mockAuditLogService as AuditLogService,
          ),
        },
        {
          provide: AuditLogService,
          useValue: mockAuditLogService,
        },
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
            verify: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: true })
      .compile();

    app = moduleFixture.createNestApplication();
    authService = app.get(AuthService);
    await app.init();
  });

  it('should log entry before and after user registration', async () => {
    authService.register.mockResolvedValue({
      message: 'Registration successful',
      newUser: mockCreatedUser as User,
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token',
    });
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        username: 'testuser',
        password: 'testpassword',
        email: 'test@email.com',
      })
      .expect(HttpStatus.CREATED);

    expect(mockAuditLogService.logEntry).toHaveBeenCalledWith({
      level: 'info',
      action: 'POST /api/auth/register',
      details: 'Entering AuthController.register',
      outcome: 'in-progress',
    });
    expect(mockAuditLogService.logEntry).toHaveBeenCalledWith({
      level: 'info',
      action: 'POST /api/auth/register',
      details: 'Completed AuthController.register with status 201',
      outcome: 'success',
    });
  });

  afterEach(async () => {
    await app.close();
  });
});
