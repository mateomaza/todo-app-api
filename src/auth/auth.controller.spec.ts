import { Test, TestingModule } from '@nestjs/testing';
import { RedisService } from 'src/redis.service';
import { Redis } from 'ioredis';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
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
import { AuthModule } from './auth.module';
import { User, UserSchema } from './user/user.model';
import { v4 as uuidv4 } from 'uuid';
import { MongooseModule } from '@nestjs/mongoose';
import { UserModule } from './user/user.module';
import { MongoMemoryServer } from 'mongodb-memory-server';

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

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let mongoMemoryServer: MongoMemoryServer;
  let authService: jest.Mocked<AuthService>;
  let jwtService: jest.Mocked<JwtService>;
  let mockRedisService: jest.Mocked<Redis>;

  beforeAll(async () => {
    mongoMemoryServer = await MongoMemoryServer.create();
    process.env.JWT_SECRET_KEY = 'test-key';
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
        AuthModule,
        UserModule,
      ],
      providers: [
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
            verify: jest.fn(),
          },
        },
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
    app.useGlobalPipes(new ValidationPipe());
    authService = app.get(AuthService);
    jwtService = app.get(JwtService);
    await app.init();
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
    const response = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        username: 'existing_username',
        email: 'new_email@example.com',
        password: 'password',
      });
    expect(response.body).toEqual({
      message: 'Username is already registered',
      statusCode: HttpStatus.CONFLICT,
    });
  });

  it('should handle email in use during registration', async () => {
    authService.isUsernameInUse.mockResolvedValue(false);
    authService.isEmailInUse.mockResolvedValue(true);
    const response = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        username: 'new_user',
        email: 'existing_email@example.com',
        password: 'password',
      });
    expect(response.body).toEqual({
      message: 'Email is already in use',
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

  it('should logout user, clear refresh token cookie, and invalidate the token', async () => {
    const mockRefreshToken = 'mock-refresh-token';
    authService.invalidateToken.mockResolvedValue();
    const response = await request(app.getHttpServer())
      .post('/api/auth/logout')
      .set('Cookie', [`refresh_token=${mockRefreshToken}`])
      .expect(HttpStatus.OK);

    expect(response.body.message).toBe('Logged out successfully');
    expect(response.headers['set-cookie']).toContainEqual(
      expect.stringContaining('refresh_token=;'),
    );
    expect(authService.invalidateToken).toHaveBeenCalledWith(mockRefreshToken);
  });

  it('should verify token and return user details', async () => {
    authService.getTokenDetails.mockResolvedValue({
      stored_ip: 'mock-ip',
      stored_user_agent: 'mock-user-agent',
    });
    const response = await request(app.getHttpServer())
      .get('/api/auth/verifyToken')
      .expect(HttpStatus.OK);
    expect(response.body).toEqual({
      username: mockCreatedUser.username,
      verified: true,
    });
  });

  it('should refresh access token', async () => {
    authService.verifyRefreshToken.mockResolvedValue(mockCreatedUser as User);
    jwtService.sign.mockReturnValueOnce('new-mock-access-token');
    const response = await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .set('Cookie', ['refresh_token=mock-refresh-token'])
      .expect(HttpStatus.OK);

    expect(response.body.access_token).toBe('new-mock-access-token');
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
    await app.close();
    await mongoMemoryServer.stop();
  });
});
