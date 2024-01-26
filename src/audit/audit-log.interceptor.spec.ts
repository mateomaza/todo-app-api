import request from 'supertest';
import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  HttpStatus,
  Module,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuditLogInterceptor } from './audit-log.interceptor';
import { AuditLogService } from './audit-log.service';
import { AuditLog, AuditLogSchema } from './audit-log.model';
import { MongooseModule } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { AuthController } from 'src/auth/auth.controller';
import { AuthService } from 'src/auth/auth.service';
import { AuditLogModule } from './audit-log.module';
import { v4 as uuidv4 } from 'uuid';
import { JwtService } from '@nestjs/jwt';
import { User } from 'src/auth/user/user.model';
import { UserModule } from 'src/auth/user/user.module';

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

  beforeAll(async () => {
    mongoMemoryServer = await MongoMemoryServer.create();
    const mockAuthService: Partial<jest.Mocked<AuthService>> = {
      register: jest.fn(),
      storeTokenDetails: jest.fn(),
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
        UserModule,
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
        JwtService,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    authService = app.get(AuthService);
    await app.init();
  });

  it('should log entry before and after user registration (2xx) ', async () => {
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

  it('should log an error for Unauthorized client error (4xx)', async () => {
    authService.register.mockImplementation(() => {
      throw new NotFoundException('Resource not found');
    });
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .expect(HttpStatus.NOT_FOUND);

    expect(mockAuditLogService.logEntry).toHaveBeenCalledWith({
      level: 'error',
      action: 'POST /api/auth/register',
      details: 'Resource not found, with status 404',
      outcome: 'fail',
    });
  });

  it('should log a critical error for a server error (5xx)', async () => {
    authService.register.mockImplementation(() => {
      throw new InternalServerErrorException('Server error');
    });

    await request(app.getHttpServer())
      .post('/api/auth/register')
      .expect(HttpStatus.INTERNAL_SERVER_ERROR);

    expect(mockAuditLogService.logEntry).toHaveBeenCalledWith({
      level: 'critical',
      action: 'POST /api/auth/register',
      details: 'Server error, with status 500',
      outcome: 'fail',
    });
  });

  afterEach(async () => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });
});
