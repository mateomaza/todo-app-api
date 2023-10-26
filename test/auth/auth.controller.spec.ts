import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { AuthController } from 'src/auth/auth.controller';
import { AuthService } from 'src/auth/auth.service';
import { UserModule } from 'src/auth/user/user.module';
import request from 'supertest';
import { getModelForClass } from '@typegoose/typegoose';
import { User } from 'src/auth/user/user.model';
import {
  HttpStatus,
  INestApplication,
  ConflictException,
} from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';

const UserModel = getModelForClass(User);

describe('AuthController', () => {
  let app: INestApplication;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let authController: AuthController;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let userModel: typeof UserModel;
  let authService: AuthService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [UserModule, AuthModule],
      controllers: [AuthController],
      providers: [AuthService],
    }).compile();

    app = module.createNestApplication();
    authController = module.get<AuthController>(AuthController);
    userModel = module.get(getModelToken(User.name));
    await app.init();
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
  }, 10000);

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

    expect(okResponse.body).toEqual({
      id: 'user_id',
      username: 'testuser',
      email: 'testuser@example.com',
    });
    const badResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        username: 'testuser',
        password: 'wrong_password',
      })
      .expect(HttpStatus.BAD_REQUEST);
    expect(badResponse.body).toEqual({
      id: 'user_id',
      username: 'newuser',
      email: 'newuser@example.com',
    });
    const badResponse2 = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        username: 'non_existing_user',
        password: '123',
      })
      .expect(HttpStatus.BAD_REQUEST);
    expect(badResponse2.body).toEqual({
      id: 'user_id',
      username: 'newuser',
      email: 'newuser@example.com',
    });
  }, 10000);

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
  }, 10000);

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
  }, 10000);
  afterEach(async () => {
    await UserModel.deleteMany({});
  });
  afterAll(async () => {
    await app.close();
  }, 10000);
});
