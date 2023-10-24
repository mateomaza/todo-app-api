import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from 'src/auth/auth.controller';
import { AuthService } from 'src/auth/auth.service';
import * as request from 'supertest';
import { JwtService } from '@nestjs/jwt';
import { User } from 'src/auth/user/user.model';
import {
  HttpStatus,
  INestApplication,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';

const UserModel: Model<User> = User;

describe('AuthController', () => {
  let app: INestApplication;
  let authService: AuthService;
  let jwtService: JwtService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [AuthService],
    }).compile();

    app = module.createNestApplication();
    authService = module.get<AuthService>(AuthService);
    await app.init();
  });

  it('should register a user', async () => {
    authService.register = jest.fn().mockResolvedValue({
      id: 'user_id',
      username: 'newuser',
      email: 'newuser@example.com',
    });

    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        username: 'newuser',
        email: 'newuser@example.com',
        password: 'password',
      })
      .expect(HttpStatus.CREATED);

    expect(response.body).toEqual({
      id: 'user_id',
      username: 'newuser',
      email: 'newuser@example.com',
    });
  });

  it('should handle login attempts', async () => {
    const user = new UserModel({
      username: 'testuser',
      password: 'password',
    });
    await user.save();
    try {
      const result = await authService.login(user);
      expect(result).toBeDefined();
      const decoded = jwtService.decode(result.access_token);
      expect(decoded.username).toBe(user.username);
    } catch (error) {
      throw new UnauthorizedException('Invalid credentials');
    }
  });

  it('should handle existing username during registration', async () => {
    authService.register = jest
      .fn()
      .mockRejectedValue(new ConflictException('Username is already in use'));

    const errorResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        username: 'existinguser',
        email: 'user@example.com',
        password: 'password',
      })
      .expect(HttpStatus.CONFLICT);

    expect(errorResponse.body).toEqual({
      message: 'Username is already in use',
    });
  });

  it('should handle existing email during registration', async () => {
    authService.register = jest
      .fn()
      .mockRejectedValue(new ConflictException('Email is already registered'));

    const errorResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        username: 'newuser',
        email: 'existing@example.com',
        password: 'password',
      })
      .expect(HttpStatus.CONFLICT);

    expect(errorResponse.body).toEqual({
      message: 'Email is already registered',
    });
  });
  afterEach(async () => {
    await UserModel.deleteMany({});
  });
  afterAll(async () => {
    await app.close();
  });
});
