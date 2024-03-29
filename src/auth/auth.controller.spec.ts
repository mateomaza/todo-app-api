import { Test, TestingModule } from '@nestjs/testing';
import { Request, Response, NextFunction } from 'express';
import { RedisService } from 'src/common/redis.service';
import { Redis } from 'ioredis';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt.auth.guard';
import request from 'supertest';
import {
  HttpStatus,
  INestApplication,
  ValidationPipe,
  NotFoundException,
  UnauthorizedException,
  ExecutionContext,
} from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { AuthModule } from './auth.module';
import { User, UserSchema } from './user/user.model';
import { v4 as uuidv4 } from 'uuid';
import { MongooseModule } from '@nestjs/mongoose';
import { UserModule } from './user/user.module';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mockEnv from 'mocked-env';
import { EventEmitterModule } from '@nestjs/event-emitter';

const mockCreatedUser: Partial<User> = {
  id: uuidv4(),
  username: 'new_user',
  email: 'new_email@example.com',
  createdAt: new Date(),
};

jest.mock('./local-auth.guard', () => ({
  LocalAuthGuard: jest.fn().mockImplementation(() => ({
    canActivate: (context: ExecutionContext) => {
      const req = context.switchToHttp().getRequest();
      req.user = mockCreatedUser;
      return true;
    },
  })),
}));

jest.mock('useragent', () => ({
  parse: jest.fn((uaString) => {
    if (uaString === 'mock-user-agent') {
      return {
        os: { family: 'test-os' },
        browser: { family: 'test-browser' },
      };
    } else {
      return {
        os: { family: 'different-os' },
        browser: { family: 'different-browser' },
      };
    }
  }),
}));

function mockUserMiddleware(req: Request, res: Response, next: NextFunction) {
  req.user = mockCreatedUser;
  next();
}

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let mongoMemoryServer: MongoMemoryServer;
  let authService: jest.Mocked<AuthService>;
  let mockRedisService: jest.Mocked<Redis>;
  let restoreEnv: () => void;

  beforeAll(async () => {
    mongoMemoryServer = await MongoMemoryServer.create();
    restoreEnv = mockEnv({
      JWT_SECRET_KEY: 'test-key',
    });
    const mockAuthService: Partial<jest.Mocked<AuthService>> = {
      register: jest.fn(),
      login: jest.fn(),
      isUsernameInUse: jest.fn(),
      isEmailInUse: jest.fn(),
      storeTokenDetails: jest.fn(),
      getTokenDetails: jest.fn(),
      checkRefreshToken: jest.fn(),
      invalidateToken: jest.fn(),
      getUserFromToken: jest.fn(),
      generateNewAccessToken: jest.fn(),
    };
    mockRedisService = {
      get: jest.fn(),
      setex: jest.fn(),
      getClient: jest.fn(),
    } as any;
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        MongooseModule.forRootAsync({
          useFactory: async () => ({
            uri: mongoMemoryServer.getUri(),
          }),
        }),
        MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
        EventEmitterModule.forRoot(),
        AuthModule,
        UserModule,
      ],
      providers: [
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
      ],
    })
      .overrideProvider(AuthService)
      .useValue(mockAuthService as jest.Mocked<AuthService>)
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: true })
      .compile();

    app = moduleFixture.createNestApplication();
    app.use(mockUserMiddleware);
    app.useGlobalPipes(new ValidationPipe());
    app.use(cookieParser());
    authService = app.get(AuthService);
    await app.init();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should register a user and set refresh_token in cookies', async () => {
    authService.register.mockResolvedValue({
      message: 'Registration successful',
      newUser: mockCreatedUser as User,
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token',
    });

    const response = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        username: mockCreatedUser.username,
        email: mockCreatedUser.email,
        password: 'correct_password',
      })
      .expect(HttpStatus.CREATED);

    expect(response.body.message).toBe('Registration successful');
    expect(response.headers['set-cookie']).toContainEqual(
      expect.stringContaining('refresh_token=mock-refresh-token'),
    );
  });

  it('should handle existing username during registration', async () => {
    authService.isUsernameInUse.mockResolvedValue(true);
    authService.isEmailInUse.mockResolvedValue(false);
    authService.register.mockResolvedValue({
      newUser: null,
      message: 'Username is already registered',
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token',
    });
    const response = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        username: 'existing_username',
        email: 'new_email@example.com',
        password: 'password',
      });
    expect(response.body).toEqual({
      error: 'Conflict',
      message: 'Username is already registered.',
      statusCode: HttpStatus.CONFLICT,
    });
  });

  it('should handle email in use during registration', async () => {
    authService.isUsernameInUse.mockResolvedValue(false);
    authService.isEmailInUse.mockResolvedValue(true);
    authService.register.mockResolvedValue({
      newUser: null,
      message: 'Email is already in use',
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token',
    });
    const response = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        username: 'new_user',
        email: 'existing_email@example.com',
        password: 'password',
      });
    expect(response.body).toEqual({
      error: 'Conflict',
      message: 'Email is already in use.',
      statusCode: HttpStatus.CONFLICT,
    });
  });

  it('should handle successful login attempts and set refresh_token in cookies', async () => {
    authService.login.mockResolvedValue({
      message: 'Login successful',
      access_token: 'mock-jwt-token',
      refresh_token: 'mock-refresh-token',
    });

    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        username: mockCreatedUser.username,
        password: 'password',
      })
      .expect(HttpStatus.OK);

    expect(response.body.message).toBe('Login successful');
    expect(response.headers['set-cookie']).toContainEqual(
      expect.stringContaining('refresh_token=mock-refresh-token'),
    );
  });

  it('should reject login attempts with incorrect password', async () => {
    authService.login.mockRejectedValue(
      new UnauthorizedException('Invalid credentials'),
    );
    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        username: mockCreatedUser.username,
        password: 'wrong_password',
      })
      .expect(HttpStatus.UNAUTHORIZED);
    expect(response.body.message).toBe('Invalid credentials');
  });

  it('should reject login attempts for a non-existing user', async () => {
    authService.login.mockRejectedValue(
      new NotFoundException('Invalid credentials'),
    );
    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        username: 'non_existing_user',
        password: 'password',
      })
      .expect(HttpStatus.NOT_FOUND);
    expect(response.body.message).toBe('Invalid credentials');
  });

  it('should logout user, clear refresh token and authenticated cookies, and invalidate the token', async () => {
    const mockRefreshToken = 'mock-refresh-token';
    authService.invalidateToken.mockResolvedValue();
    const response = await request(app.getHttpServer())
      .post('/api/auth/logout')
      .set('Cookie', [
        `refresh_token=${mockRefreshToken}`,
        'authenticated=true',
      ])
      .expect(HttpStatus.OK);
    expect(response.body.message).toBe('Logged out successfully');
    expect(response.headers['set-cookie']).toEqual(
      expect.arrayContaining([
        expect.stringContaining('refresh_token=;'),
        expect.stringContaining('authenticated=;'),
      ]),
    );
    expect(authService.invalidateToken).toHaveBeenCalledWith(mockRefreshToken);
  });

  it('should verify token', async () => {
    authService.getTokenDetails.mockResolvedValue({
      stored_ip: '::ffff:127.0.0.1',
      stored_user_agent: 'mock-user-agent',
    });
    const response = await request(app.getHttpServer())
      .get('/api/auth/verify-session')
      .set('User-Agent', 'mock-user-agent')
      .expect(HttpStatus.OK);
    expect(response.body).toEqual({
      verified: true,
    });
  });

  it('should invalidate session on IP or user-agent change', async () => {
    authService.getTokenDetails.mockResolvedValue({
      stored_ip: 'different-ip',
      stored_user_agent: 'different-user-agent',
    });
    const response = await request(app.getHttpServer())
      .get('/api/auth/verify-session')
      .set('User-Agent', 'mock-user-agent')
      .expect(HttpStatus.OK);
    expect(response.body).toEqual({
      message:
        'Session invalidated due to security concerns. Please log in again.',
    });
  });

  it('should validate refresh token', async () => {
    const mockRefreshToken = 'mock-refresh-token';
    authService.checkRefreshToken.mockResolvedValue({
      result: true,
    });
    const response = await request(app.getHttpServer())
      .post('/api/auth/check-refresh')
      .set('Cookie', [`refresh_token=${mockRefreshToken}`])
      .expect(HttpStatus.OK);
    expect(response.body).toEqual({
      verified: { result: true },
    });
  });

  it('should refresh access_token based on refresh_token', async () => {
    const mockRefreshToken = 'mock-refresh-token';
    const mockNewAccessToken = 'mock-new-access-token';
    const authService = app.get(AuthService);
    jest
      .spyOn(authService, 'getUserFromToken')
      .mockResolvedValue(mockCreatedUser as User);
    jest
      .spyOn(authService, 'generateNewAccessToken')
      .mockResolvedValue(mockNewAccessToken);
    const response = await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .send({ refreshToken: mockRefreshToken })
      .expect(HttpStatus.CREATED);

    expect(response.body).toEqual({
      access_token: mockNewAccessToken,
      user: {
        ...mockCreatedUser,
        createdAt: expect.any(String),
      },
    });
  });

  it('should validate field types in RegisterDto', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        username: 123,
        password: true,
        email: true,
      })
      .expect(HttpStatus.BAD_REQUEST);
    expect(response.body.message).toEqual(
      expect.arrayContaining([
        'Username must be a string',
        'Password must be a string',
        'Email must be a string',
      ]),
    );
  });

  it('should validate field types in LoginDto', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        username: 123,
        password: true,
      })
      .expect(HttpStatus.BAD_REQUEST);
    expect(response.body.message).toEqual(
      expect.arrayContaining([
        'Username must be a string',
        'Password must be a string',
      ]),
    );
  });

  afterAll(async () => {
    restoreEnv();
    await app.close();
    await mongoMemoryServer.stop();
  });
});
