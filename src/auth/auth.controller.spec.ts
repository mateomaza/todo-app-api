import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import request from 'supertest';
import { getModelForClass } from '@typegoose/typegoose';
import { User } from './user/user.model';
import {
  HttpStatus,
  INestApplication,
  ConflictException,
  ValidationPipe,
} from '@nestjs/common';
import { AuthModule } from './auth.module';
import { UserModule } from './user/user.module';
import { MongooseModule } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { UserService } from './user/user.service';
import { JwtService } from '@nestjs/jwt';

const UserModel = getModelForClass(User);

describe('AuthController', () => {
  let app: INestApplication;
  let authService: AuthService;

  beforeEach(() => {
    jest.setTimeout(30000);
  });
  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        AuthModule,
        UserModule,
        MongooseModule.forRootAsync({
          useFactory: async () => {
            const mongo = await MongoMemoryServer.create();
            const uri = mongo.getUri();
            return {
              uri,
              useNewUrlParser: true,
              useUnifiedTopology: true,
            };
          },
        }),
      ],
      providers: [AuthService, UserService, JwtService, UserModel],
    }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
    authService = module.get<AuthService>(AuthService);
  });

  it('should register a user', async () => {
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
      id: 'user_id',
      username: 'testuser',
      password: 'password',
      email: 'testuser@example.com',
    });
    await user.save();
    const okResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        username: 'testuser',
        password: 'password',
      })
      .expect(HttpStatus.OK);

    expect(okResponse.body.message).toBe('Login successful');
    expect(okResponse.body.user).toBeDefined();
    expect(okResponse.body.accessToken).toBeDefined();
    expect(okResponse.body.statusCode).toBe(HttpStatus.OK);
    const badResponse1 = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        username: 'testuser',
        password: 'wrong_password',
      });
    expect(badResponse1.body.message).toBe('Incorrect password');
    expect(badResponse1.body.statusCode).toBe(HttpStatus.BAD_REQUEST);
    const badResponse2 = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        username: 'non_existing_user',
        password: '123',
      });
    expect(badResponse2.body.message).toBe('User not found');
    expect(badResponse2.body.statusCode).toBe(HttpStatus.BAD_REQUEST);
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
