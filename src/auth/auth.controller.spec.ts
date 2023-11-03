import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
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

interface UserResponse {
  id: string;
  username: string;
  email: string;
  createdAt: string;
}

const mockCreatedUser: UserResponse = {
  id: uuidv4(),
  username: 'new_user',
  email: 'new_email@example.com',
  createdAt: new Date().toISOString(),
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

  beforeAll(async () => {
    mongoMemoryServer = await MongoMemoryServer.create();
    const authServiceMock: Partial<jest.Mocked<AuthService>> = {
      register: jest.fn(),
      login: jest.fn(),
      isUsernameInUse: jest.fn(),
      isEmailInUse: jest.fn(),
    };
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        MongooseModule.forRootAsync({
          useFactory: async () => ({
            uri: await mongoMemoryServer.getUri(),
          }),
        }),
        MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
        AuthModule,
        UserModule,
      ],
    })
      .overrideProvider(AuthService)
      .useValue(authServiceMock as jest.Mocked<AuthService>)
      .compile();
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
    authService = app.get(AuthService);
  });

  it('should register a user', async () => {
    authService.register.mockResolvedValue(mockCreatedUser as any as User);
    const response = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        username: 'new_user',
        email: 'new_email@example.com',
        password: 'password',
      })
      .expect(HttpStatus.CREATED);
    expect(response.body).toEqual({
      id: mockCreatedUser.id,
      username: mockCreatedUser.username,
      email: mockCreatedUser.email,
      createdAt: expect.any(String),
    });
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

  it('should handle successful login attempts', async () => {
    authService.login.mockResolvedValue({
      message: 'Login successful',
      access_token: 'mock-jwt-token',
    });
    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        username: mockCreatedUser.username,
        password: 'password',
      })
      .expect(HttpStatus.OK);
    expect(response.body.message).toBe('Login successful');
    expect(response.body.user).toBeDefined();
    expect(response.body.access_token).toBeDefined();
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
        password: '123',
      })
      .expect(HttpStatus.NOT_FOUND);

    expect(response.body.message).toBe('Invalid credentials');
  });
  afterAll(async () => {
    await app.close();
    await mongoMemoryServer.stop();
  });
});
